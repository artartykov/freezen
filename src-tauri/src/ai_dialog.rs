use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::time::Duration;

const API: &str = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(40);
const COMPACT_ABOVE: usize = 300;
const KEEP_RECENT: usize = 60;
const STATES: [&str; 4] = ["next", "waiting", "someday", "inbox"];

#[derive(Default)]
pub struct Dialog(pub tauri::async_runtime::Mutex<Conversation>);

#[derive(Default)]
pub struct Conversation {
    model: String,
    messages: Vec<Value>,
    tasks: BTreeMap<u32, TaskFields>,
    next_id: u32,
}

#[derive(Clone)]
struct TaskFields {
    title: String,
    state: String,
    due: Option<String>,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Input {
    Words { text: String },
    Pause,
    Resume,
    UserRemoved { id: u32 },
    End { last_words: String },
    Check,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum TaskEvent {
    Add {
        id: u32,
        title: String,
        state: String,
        due: Option<String>,
    },
    Update {
        id: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        state: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        due: Option<Option<String>>,
    },
    Remove {
        id: u32,
    },
}

fn system_prompt(today: &str, calendar: &str) -> String {
    format!(
        "You are a silent assistant that listens to a continuous dictation delivered in pieces and keeps a to-do list by calling tools. Never write text: only call tools. Tools: add_task (returns the task id), update_task (change a task by id), remove_task (delete a task by id), wait (nothing to do yet).\n\
Rules:\n\
1. Add a task as soon as its action is clear (for example 'заказать такси'), even if more details such as a date may follow in the next piece: add the details later with update_task. Call wait only when the current words are an unfinished fragment that you cannot even name yet. Do not postpone tasks to the end.\n\
2. Corrections: when the speaker corrects themselves (for example 'ой то есть', 'нет, не ...', 'not X but Y'), change the earlier task with update_task, or remove it with remove_task if the speaker cancels it (and add the corrected task if there is one). Never leave the old wrong version in the list.\n\
3. update_task only corrects the SAME task (its wording, date or list); never use it to turn one task into a different task: a new action is always a new add_task. Never create duplicates. Before adding, check the tasks that already exist (ids from add_task results and the 'Current tasks' list in service messages). If a task already exists, update it. If you notice a duplicate or a half-finished task you added earlier, fix it with update_task or remove_task.\n\
4. Dates. A date phrase ('завтра', 'на пятницу', 'до пятницы', 'в понедельник', 'tomorrow', 'on Saturday') belongs to the action that comes IMMEDIATELY BEFORE it, in the same clause; it never belongs to the action that follows it. Example: 'заказать такси на пятницу полить цветы' means taxi on Friday and flowers without a date. If the date arrives in a later piece than its action, put it on that earlier action with update_task. Never set a due date on any other task. Today is {today}. Weekday names are exact; the calendar of the coming days: {calendar}. A bare weekday means its nearest upcoming day; 'next week' plus a weekday means that weekday of next week. Use YYYY-MM-DD; when no date is said, leave due null.\n\
5. Fix obvious speech-recognition mistakes, drop filler words, ignore remarks that are not tasks. Write titles in the speaker's language, keeping English phrases in English. Separate actions are separate tasks even when joined by 'и' or 'and' ('купить подарок и заказать цветы' is two tasks), but a list of items for one action ('buy milk and bread') is one task.\n\
Service messages: [PAUSE] the speaker paused: add what is complete, keep waiting on an unfinished sentence. [RESUME] the speaker continues the same dictation. [USER] the user edited the list by hand: respect it and never re-add a deleted task. [END] the dictation is over. Go through the whole dictation action by action, including the very last words; for each action check that the 'Current tasks' list has a matching task and add every missing one with add_task. Do not remove a task unless it is an exact duplicate of another one (keep exactly one copy, never remove all copies) or the speaker cancelled it."
    )
}

fn tools() -> Value {
    let state = json!({ "type": "string", "enum": STATES });
    json!([
        {
            "type": "function",
            "function": {
                "name": "add_task",
                "description": "Add one finished to-do task",
                "parameters": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["title", "state", "due"],
                    "properties": {
                        "title": { "type": "string" },
                        "state": state,
                        "due": { "type": ["string", "null"] }
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "update_task",
                "description": "Change fields of an existing task",
                "parameters": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id"],
                    "properties": {
                        "id": { "type": "integer" },
                        "title": { "type": "string" },
                        "state": state,
                        "due": { "type": ["string", "null"] }
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "remove_task",
                "description": "Delete a task by id",
                "parameters": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id"],
                    "properties": { "id": { "type": "integer" } }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "wait",
                "description": "Nothing to do yet",
                "parameters": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {}
                }
            }
        }
    ])
}

fn text_field(args: &Value, name: &str) -> Option<String> {
    args.get(name).and_then(Value::as_str).map(str::to_owned)
}

fn id_field(args: &Value) -> Option<u32> {
    args.get("id")
        .and_then(Value::as_u64)
        .and_then(|id| u32::try_from(id).ok())
}

fn valid_state(state: Option<String>) -> Option<String> {
    state.filter(|state| STATES.contains(&state.as_str()))
}

impl Conversation {
    pub fn new(model: &str, today: &str, calendar: &str) -> Self {
        Self {
            model: model.to_owned(),
            messages: vec![json!({ "role": "system", "content": system_prompt(today, calendar) })],
            tasks: BTreeMap::new(),
            next_id: 1,
        }
    }

    fn snapshot(&self) -> String {
        let lines: Vec<String> = self
            .tasks
            .iter()
            .map(|(id, task)| match &task.due {
                Some(due) => format!("#{id} {} [{due}]", task.title),
                None => format!("#{id} {}", task.title),
            })
            .collect();
        if lines.is_empty() {
            "Current tasks:\n(none)".to_owned()
        } else {
            format!("Current tasks:\n{}", lines.join("\n"))
        }
    }

    fn user_message(&mut self, input: &Input) -> Result<String, String> {
        Ok(match input {
            Input::Words { text } => text.clone(),
            Input::Pause => format!("[PAUSE]\n{}", self.snapshot()),
            Input::Resume => format!("[RESUME]\n{}", self.snapshot()),
            Input::UserRemoved { id } => {
                let removed = self
                    .tasks
                    .remove(id)
                    .ok_or_else(|| "No such task".to_owned())?;
                format!(
                    "[USER] deleted task #{id}: \"{}\"\n{}",
                    removed.title,
                    self.snapshot()
                )
            }
            Input::End { last_words } => format!(
                "[END] The last words of the dictation were: \"{last_words}\". Make sure the action in them is in the list.\n{}",
                self.snapshot()
            ),
            Input::Check => format!(
                "[CHECK] Read the whole dictation once more. Is every action from it in the list below? Add each missing one with add_task; if nothing is missing, call wait.\n{}",
                self.snapshot()
            ),
        })
    }

    fn request_body(&self, user_message: &str) -> Value {
        let mut messages = self.messages.clone();
        messages.push(json!({ "role": "user", "content": user_message }));
        json!({
            "model": self.model,
            "messages": messages,
            "tools": tools(),
            "tool_choice": "required",
            "reasoning": { "enabled": false }
        })
    }

    fn apply_call(&mut self, name: &str, args: &Value) -> (String, Option<TaskEvent>) {
        match name {
            "add_task" => {
                let Some(title) =
                    text_field(args, "title").filter(|title| !title.trim().is_empty())
                else {
                    return ("error: title is required".to_owned(), None);
                };
                let state =
                    valid_state(text_field(args, "state")).unwrap_or_else(|| "inbox".into());
                let due = text_field(args, "due");
                let id = self.next_id;
                self.next_id += 1;
                self.tasks.insert(
                    id,
                    TaskFields {
                        title: title.clone(),
                        state: state.clone(),
                        due: due.clone(),
                    },
                );
                (
                    json!({ "id": id }).to_string(),
                    Some(TaskEvent::Add {
                        id,
                        title,
                        state,
                        due,
                    }),
                )
            }
            "update_task" => {
                let Some(task) =
                    id_field(args).and_then(|id| self.tasks.get_mut(&id).map(|task| (id, task)))
                else {
                    return ("error: no such task".to_owned(), None);
                };
                let (id, fields) = task;
                let title = text_field(args, "title").filter(|title| !title.trim().is_empty());
                let state = valid_state(text_field(args, "state"));
                let due = args.get("due").map(|due| due.as_str().map(str::to_owned));
                if let Some(title) = &title {
                    fields.title.clone_from(title);
                }
                if let Some(state) = &state {
                    fields.state.clone_from(state);
                }
                if let Some(due) = &due {
                    fields.due.clone_from(due);
                }
                (
                    "ok".to_owned(),
                    Some(TaskEvent::Update {
                        id,
                        title,
                        state,
                        due,
                    }),
                )
            }
            "remove_task" => match id_field(args).filter(|id| self.tasks.remove(id).is_some()) {
                Some(id) => ("ok".to_owned(), Some(TaskEvent::Remove { id })),
                None => ("error: no such task".to_owned(), None),
            },
            "wait" => ("ok".to_owned(), None),
            _ => ("error: unknown tool".to_owned(), None),
        }
    }

    fn apply_response(
        &mut self,
        user_message: String,
        body: &Value,
    ) -> Result<Vec<TaskEvent>, String> {
        let calls = body
            .pointer("/choices/0/message/tool_calls")
            .and_then(Value::as_array)
            .filter(|calls| !calls.is_empty())
            .ok_or_else(|| "The model did not call a tool".to_owned())?;
        self.messages
            .push(json!({ "role": "user", "content": user_message }));
        self.messages
            .push(json!({ "role": "assistant", "content": null, "tool_calls": calls }));
        let mut events = Vec::new();
        for call in calls {
            let call_id = call.get("id").and_then(Value::as_str).unwrap_or_default();
            let name = call
                .pointer("/function/name")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let args = call
                .pointer("/function/arguments")
                .and_then(Value::as_str)
                .and_then(|arguments| serde_json::from_str::<Value>(arguments).ok())
                .unwrap_or(Value::Null);
            let (result, event) = self.apply_call(name, &args);
            self.messages
                .push(json!({ "role": "tool", "tool_call_id": call_id, "content": result }));
            events.extend(event);
        }
        self.compact();
        Ok(events)
    }

    fn compact(&mut self) {
        if self.messages.len() <= COMPACT_ABOVE {
            return;
        }
        let from = self.messages.len() - KEEP_RECENT;
        let Some(start) = (from..self.messages.len()).find(|&index| {
            self.messages[index].get("role").and_then(Value::as_str) == Some("user")
        }) else {
            return;
        };
        let recent = self.messages.split_off(start);
        self.messages.truncate(1);
        let summary = format!(
            "[SUMMARY] The earlier part of the dictation was already processed.\n{}",
            self.snapshot()
        );
        self.messages
            .push(json!({ "role": "user", "content": summary }));
        self.messages.extend(recent);
    }
}

pub async fn run_turn(
    client: &reqwest::Client,
    key: &str,
    conversation: &mut Conversation,
    input: Input,
) -> Result<Vec<TaskEvent>, String> {
    let user_message = conversation.user_message(&input)?;
    let response = client
        .post(format!("{API}/chat/completions"))
        .bearer_auth(key)
        .timeout(REQUEST_TIMEOUT)
        .json(&conversation.request_body(&user_message))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let detail: String = body.chars().take(200).collect();
        return Err(format!("HTTP {status}: {detail}"));
    }
    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    conversation.apply_response(user_message, &body)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conversation() -> Conversation {
        Conversation::new("model-x", "2026-11-19", "Fri/пятница 2026-11-20")
    }

    fn call(id: &str, name: &str, args: &Value) -> Value {
        json!({
            "id": id,
            "type": "function",
            "function": { "name": name, "arguments": args.to_string() }
        })
    }

    fn response(calls: &[Value]) -> Value {
        json!({ "choices": [{ "message": { "role": "assistant", "content": null, "tool_calls": calls } }] })
    }

    fn add(title: &str, due: Option<&str>) -> Value {
        json!({ "title": title, "state": "next", "due": due })
    }

    #[test]
    fn adds_a_task_and_returns_its_id_to_the_model() {
        let mut conversation = conversation();
        let body = response(&[call(
            "c1",
            "add_task",
            &add("Call Ivan", Some("2026-11-20")),
        )]);
        let events = conversation
            .apply_response("call Ivan".into(), &body)
            .unwrap();
        assert_eq!(
            events,
            vec![TaskEvent::Add {
                id: 1,
                title: "Call Ivan".into(),
                state: "next".into(),
                due: Some("2026-11-20".into())
            }]
        );
        let last = conversation.messages.last().unwrap();
        assert_eq!(last["role"], "tool");
        assert_eq!(last["tool_call_id"], "c1");
        assert_eq!(last["content"], "{\"id\":1}");
    }

    #[test]
    fn updates_only_the_provided_fields() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "add_task", &add("Buy bread", None))]);
        conversation
            .apply_response("buy bread".into(), &body)
            .unwrap();
        let body = response(&[call(
            "c2",
            "update_task",
            &json!({ "id": 1, "title": "Buy wheat" }),
        )]);
        let events = conversation
            .apply_response("not bread".into(), &body)
            .unwrap();
        assert_eq!(
            events,
            vec![TaskEvent::Update {
                id: 1,
                title: Some("Buy wheat".into()),
                state: None,
                due: None
            }]
        );
        assert_eq!(conversation.tasks[&1].title, "Buy wheat");
        assert_eq!(conversation.tasks[&1].state, "next");
    }

    #[test]
    fn clears_a_due_date_with_null() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "add_task", &add("Call", Some("2026-11-20")))]);
        conversation.apply_response("call".into(), &body).unwrap();
        let body = response(&[call("c2", "update_task", &json!({ "id": 1, "due": null }))]);
        let events = conversation
            .apply_response("no date".into(), &body)
            .unwrap();
        assert_eq!(
            events,
            vec![TaskEvent::Update {
                id: 1,
                title: None,
                state: None,
                due: Some(None)
            }]
        );
        assert_eq!(conversation.tasks[&1].due, None);
        let serialized = serde_json::to_value(&events[0]).unwrap();
        assert_eq!(serialized, json!({ "op": "update", "id": 1, "due": null }));
    }

    #[test]
    fn removes_a_task() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "add_task", &add("Visit doctor", None))]);
        conversation.apply_response("doctor".into(), &body).unwrap();
        let body = response(&[call("c2", "remove_task", &json!({ "id": 1 }))]);
        let events = conversation.apply_response("cancel".into(), &body).unwrap();
        assert_eq!(events, vec![TaskEvent::Remove { id: 1 }]);
        assert!(conversation.tasks.is_empty());
    }

    #[test]
    fn answers_an_unknown_task_with_an_error_and_no_event() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "remove_task", &json!({ "id": 9 }))]);
        let events = conversation.apply_response("x".into(), &body).unwrap();
        assert!(events.is_empty());
        assert_eq!(
            conversation.messages.last().unwrap()["content"],
            "error: no such task"
        );
    }

    #[test]
    fn wait_changes_nothing() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "wait", &json!({}))]);
        let events = conversation.apply_response("um".into(), &body).unwrap();
        assert!(events.is_empty());
        assert!(conversation.tasks.is_empty());
    }

    #[test]
    fn rejects_a_response_without_tool_calls_and_keeps_the_history() {
        let mut conversation = conversation();
        let before = conversation.messages.len();
        let body =
            json!({ "choices": [{ "message": { "role": "assistant", "content": "hello" } }] });
        assert!(conversation.apply_response("x".into(), &body).is_err());
        assert_eq!(conversation.messages.len(), before);
    }

    #[test]
    fn builds_service_messages_with_the_current_tasks() {
        let mut conversation = conversation();
        let body = response(&[call(
            "c1",
            "add_task",
            &add("Call Ivan", Some("2026-11-20")),
        )]);
        conversation
            .apply_response("call Ivan".into(), &body)
            .unwrap();
        assert_eq!(
            conversation.user_message(&Input::Pause).unwrap(),
            "[PAUSE]\nCurrent tasks:\n#1 Call Ivan [2026-11-20]"
        );
        let end = conversation
            .user_message(&Input::End {
                last_words: "call mom".into(),
            })
            .unwrap();
        assert!(end.starts_with("[END] The last words of the dictation were: \"call mom\"."));
        assert!(end.ends_with("#1 Call Ivan [2026-11-20]"));
        assert!(conversation
            .user_message(&Input::Check)
            .unwrap()
            .starts_with("[CHECK]"));
        assert!(conversation
            .user_message(&Input::Resume)
            .unwrap()
            .starts_with("[RESUME]"));
    }

    #[test]
    fn reports_a_task_the_user_removed() {
        let mut conversation = conversation();
        let body = response(&[call("c1", "add_task", &add("Buy gift", None))]);
        conversation.apply_response("gift".into(), &body).unwrap();
        let message = conversation
            .user_message(&Input::UserRemoved { id: 1 })
            .unwrap();
        assert_eq!(
            message,
            "[USER] deleted task #1: \"Buy gift\"\nCurrent tasks:\n(none)"
        );
        assert!(conversation
            .user_message(&Input::UserRemoved { id: 1 })
            .is_err());
    }

    #[test]
    fn puts_today_and_the_calendar_in_the_system_prompt() {
        let conversation = conversation();
        let prompt = conversation.messages[0]["content"].as_str().unwrap();
        assert!(prompt.contains("Today is 2026-11-19."));
        assert!(prompt.contains("Fri/пятница 2026-11-20"));
    }

    #[test]
    fn asks_for_a_required_tool_call_with_the_pending_message() {
        let conversation = conversation();
        let body = conversation.request_body("buy milk");
        assert_eq!(body["model"], "model-x");
        assert_eq!(body["tool_choice"], "required");
        assert_eq!(body["tools"].as_array().unwrap().len(), 4);
        assert_eq!(
            body["messages"].as_array().unwrap().last().unwrap()["content"],
            "buy milk"
        );
        assert_eq!(conversation.messages.len(), 1);
    }

    #[test]
    fn compacts_a_long_history_to_a_summary_and_the_recent_turns() {
        let mut conversation = conversation();
        for index in 0..COMPACT_ABOVE {
            let body = response(&[call("c", "wait", &json!({}))]);
            conversation
                .apply_response(format!("words {index}"), &body)
                .unwrap();
        }
        assert!(conversation.messages.len() < COMPACT_ABOVE);
        assert_eq!(conversation.messages[0]["role"], "system");
        assert!(conversation.messages[1]["content"]
            .as_str()
            .unwrap()
            .starts_with("[SUMMARY]"));
        assert_eq!(conversation.messages[2]["role"], "user");
    }
}
