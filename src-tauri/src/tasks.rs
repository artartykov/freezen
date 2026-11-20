use serde::Serialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::sync::Arc;

const STATES: [&str; 3] = ["inbox", "waiting", "someday"];

#[derive(Default)]
pub struct Dialog(pub Arc<tauri::async_runtime::Mutex<TaskList>>);

#[derive(Default)]
pub struct TaskList {
    prompt: String,
    tasks: BTreeMap<u32, TaskFields>,
    next_id: u32,
}

#[derive(Clone)]
struct TaskFields {
    title: String,
    state: String,
    due: Option<String>,
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

fn prompt(today: &str, calendar: &str) -> String {
    format!(
        "You turn spoken dictation into a to-do list inside a task app. The user speaks Russian or English and you hear the audio. You never speak and never write text: your only action is the change_tasks tool.\n\
\n\
When to act\n\
- You get a turn right after every pause in speech. In each turn call change_tasks exactly once, with every change the user asked for since your last turn, or with an empty list when nothing needs to change.\n\
- Everything the user says is dictation, not a conversation with you. Never wait for a command such as 'запиши' or 'добавь': an action you hear is a task to add now, even a short one like 'купить хлеба'.\n\
- Words such as 'запиши', 'добавь', 'задача', 'надо', 'нужно' only introduce a task and never go into a title.\n\
- Instructions about how to write tasks ('пиши задачи с маленькой буквы', 'без дат', 'пиши по-английски') are never tasks: follow them for the rest of the session.\n\
- The user may pause in the middle of a phrase, so one phrase can arrive in pieces. A piece without its own verb belongs to the neighbouring piece: 'перенеси всё | на пятницу', 'исправить сценарий | шесть из шести', 'завтра | позвонить Ивану'. Apply it to that task; a date or a verb alone is never a task. A date said before its action ('завтра | позвонить Ивану') belongs to the task of the next piece: give that task the date.\n\
- Silence, noise, filler words and remarks that are not tasks get an empty list. Never invent a task you did not clearly hear.\n\
\n\
Changes\n\
- {{\"op\": \"add\", \"title\": …, \"state\": …, \"due\": …}} adds a task; the result gives its id.\n\
- {{\"op\": \"update\", \"id\": …, …}} changes only the fields you send; \"due\": null clears the date.\n\
- {{\"op\": \"remove\", \"id\": …}} deletes a task.\n\
- When one phrase asks for several changes, send them all in the same call: 'перенеси всё на пятницу' updates every task, 'удали обе задачи про магазин' removes two. Changes run in order.\n\
- Refer to tasks by the ids from earlier results and from the 'Current tasks' list.\n\
\n\
Tasks\n\
- Every verb of action starts its own task: 'купить хлеб и позвонить маме' is two tasks, 'Купить хлеб' and 'Позвонить маме'. Only several objects of one verb stay in one task: 'купить хлеб и молоко'.\n\
- A title is a short action in the user's language that starts with the verb: 'и маме позвонить' becomes 'Позвонить маме'. Keep the user's own words, names and rare words exactly as spoken, even unusual ones ('запенить раковину'); drop connectors ('и', 'а', 'ещё', 'потом'), filler words and the date phrase, which goes to due. Start it with a capital letter unless the user asked otherwise.\n\
- Write spoken numbers as digits and keep every word around them: 'исправить сценарий шесть из шести' becomes 'Исправить сценарий 6 из 6'.\n\
- A phrase with no verb of its own continues the previous task: 'молоко ещё' after 'купить хлеба' updates it to 'Купить хлеба и молоко'; a name, details or a date update that task too. A phrase with its own verb ('и маме позвонить') is always a new task.\n\
- Keep the list free of duplicates: if a task is already in the list, update it instead of adding it again.\n\
\n\
Corrections\n\
- 'ой', 'нет', 'не то', 'то есть', 'вернее', 'точнее' correct what was just said, in the same phrase or in the next one; only the corrected version counts. 'Купить молоко и хлеб, ой нет, только молоко' gives exactly one task, 'Купить молоко'.\n\
- Remove a task only when the user cancels it: 'не надо', 'отмена', 'удали это'.\n\
- Never change or remove a task the correction is not about.\n\
- 'верни', 'верни обратно' adds the last removed task again.\n\
- A message that starts with [USER] means the user edited the list by hand. Do not add back a task the user deleted unless the user asks for it.\n\
\n\
Lists\n\
- state is 'inbox' unless the user says otherwise.\n\
- 'waiting' when the user waits for someone or something; the title names what is awaited, without 'жду': 'жду ответа от Ивана по договору' becomes 'Ответ от Ивана по договору'.\n\
- 'someday' for 'когда-нибудь', 'может быть', 'потом как-нибудь'.\n\
\n\
Dates\n\
- Set due only when the user gave a date for that task in the same phrase, before or after the action: 'завтра позвонить Ивану', 'исправить промпт до пятницы', 'в понедельник отправить отчёт'. Never copy a date to another task.\n\
- Today is {today}. The coming days: {calendar}. A bare weekday is its nearest coming day; 'на следующей неделе' without a weekday is next Monday. Write YYYY-MM-DD, or null when no date was said."
    )
}

pub fn tools() -> Value {
    json!([{
        "type": "function",
        "name": "change_tasks",
        "description": "Apply every change of this turn to the task list at once. Send an empty list when nothing changes.",
        "parameters": {
            "type": "object",
            "additionalProperties": false,
            "required": ["changes"],
            "properties": {
                "changes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["op"],
                        "properties": {
                            "op": { "type": "string", "enum": ["add", "update", "remove"] },
                            "id": { "type": "integer", "description": "Task to update or remove" },
                            "title": { "type": "string" },
                            "state": { "type": "string", "enum": STATES },
                            "due": { "type": ["string", "null"], "description": "YYYY-MM-DD; null clears the date" }
                        }
                    }
                }
            }
        }
    }])
}

fn text_field(args: &Value, name: &str) -> Option<String> {
    args.get(name)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_owned)
}

fn id_field(args: &Value) -> Option<u32> {
    args.get("id")
        .and_then(Value::as_u64)
        .and_then(|id| u32::try_from(id).ok())
}

fn valid_state(state: Option<String>) -> Option<String> {
    state.filter(|state| STATES.contains(&state.as_str()))
}

impl TaskList {
    pub fn new(today: &str, calendar: &str) -> Self {
        Self {
            prompt: prompt(today, calendar),
            tasks: BTreeMap::new(),
            next_id: 1,
        }
    }

    pub fn instructions(&self) -> String {
        format!("{}\n\n{}", self.prompt, self.snapshot())
    }

    fn snapshot(&self) -> String {
        let lines: Vec<String> = self
            .tasks
            .iter()
            .map(|(id, task)| {
                let state = if task.state == "inbox" {
                    String::new()
                } else {
                    format!(" ({})", task.state)
                };
                let due = task
                    .due
                    .as_ref()
                    .map(|due| format!(" [{due}]"))
                    .unwrap_or_default();
                format!("#{id} {}{state}{due}", task.title)
            })
            .collect();
        if lines.is_empty() {
            "Current tasks:\n(none)".to_owned()
        } else {
            format!("Current tasks:\n{}", lines.join("\n"))
        }
    }

    pub fn note_user_removed(&mut self, id: u32) -> Result<String, String> {
        let removed = self
            .tasks
            .remove(&id)
            .ok_or_else(|| "No such task".to_owned())?;
        Ok(format!(
            "[USER] deleted task #{id}: \"{}\"\n{}",
            removed.title,
            self.snapshot()
        ))
    }

    pub fn run_tool(&mut self, name: &str, args: &Value) -> (String, Vec<TaskEvent>) {
        if name != "change_tasks" {
            return (json!({ "error": "unknown tool" }).to_string(), Vec::new());
        }
        let mut results = Vec::new();
        let mut events = Vec::new();
        for change in args["changes"].as_array().into_iter().flatten() {
            let (result, event) = match change["op"].as_str() {
                Some("add") => self.add(change),
                Some("update") => self.update(change),
                Some("remove") => self.remove(change),
                _ => (json!({ "error": "unknown op" }), None),
            };
            results.push(result);
            events.extend(event);
        }
        (Value::Array(results).to_string(), events)
    }

    fn add(&mut self, args: &Value) -> (Value, Option<TaskEvent>) {
        let Some(title) = text_field(args, "title") else {
            return (json!({ "error": "title is required" }), None);
        };
        let state = valid_state(text_field(args, "state")).unwrap_or_else(|| "inbox".into());
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
            json!({ "added": id }),
            Some(TaskEvent::Add {
                id,
                title,
                state,
                due,
            }),
        )
    }

    fn update(&mut self, args: &Value) -> (Value, Option<TaskEvent>) {
        let Some((id, fields)) =
            id_field(args).and_then(|id| self.tasks.get_mut(&id).map(|task| (id, task)))
        else {
            return (json!({ "error": "no such task" }), None);
        };
        let title = text_field(args, "title");
        let state = valid_state(text_field(args, "state"));
        let due = args.get("due").map(|due| {
            due.as_str()
                .map(str::to_owned)
                .filter(|due| !due.is_empty())
        });
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
            json!({ "updated": id }),
            Some(TaskEvent::Update {
                id,
                title,
                state,
                due,
            }),
        )
    }

    fn remove(&mut self, args: &Value) -> (Value, Option<TaskEvent>) {
        match id_field(args).filter(|id| self.tasks.remove(id).is_some()) {
            Some(id) => (json!({ "removed": id }), Some(TaskEvent::Remove { id })),
            None => (json!({ "error": "no such task" }), None),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn list() -> TaskList {
        TaskList::new("Thursday 2026-11-19", "Fri/пятница 2026-11-20")
    }

    fn change(list: &mut TaskList, changes: Value) -> (Value, Vec<TaskEvent>) {
        let (output, events) = list.run_tool("change_tasks", &json!({ "changes": changes }));
        (serde_json::from_str(&output).unwrap(), events)
    }

    #[test]
    fn applies_a_batch_of_changes_in_order() {
        let mut list = list();
        let (output, events) = change(
            &mut list,
            json!([
                { "op": "add", "title": " Call Ivan ", "state": "inbox", "due": "2026-11-20" },
                { "op": "add", "title": "Buy bread", "state": "someday", "due": null },
                { "op": "update", "id": 1, "title": "Call Anna" },
                { "op": "remove", "id": 2 }
            ]),
        );
        assert_eq!(
            output,
            json!([{ "added": 1 }, { "added": 2 }, { "updated": 1 }, { "removed": 2 }])
        );
        assert_eq!(events.len(), 4);
        assert_eq!(
            events[0],
            TaskEvent::Add {
                id: 1,
                title: "Call Ivan".into(),
                state: "inbox".into(),
                due: Some("2026-11-20".into())
            }
        );
        assert_eq!(events[3], TaskEvent::Remove { id: 2 });
        assert_eq!(list.tasks[&1].title, "Call Anna");
        assert_eq!(list.tasks[&1].due.as_deref(), Some("2026-11-20"));
    }

    #[test]
    fn treats_an_empty_batch_as_nothing_to_do() {
        let mut list = list();
        assert_eq!(change(&mut list, json!([])), (json!([]), Vec::new()));
    }

    #[test]
    fn reports_bad_changes_and_keeps_the_good_ones() {
        let mut list = list();
        let (output, events) = change(
            &mut list,
            json!([
                { "op": "remove", "id": 9 },
                { "op": "add", "title": "  " },
                { "op": "move" },
                { "op": "add", "title": "Call", "state": "next" }
            ]),
        );
        assert_eq!(
            output,
            json!([
                { "error": "no such task" },
                { "error": "title is required" },
                { "error": "unknown op" },
                { "added": 1 }
            ])
        );
        assert!(matches!(&events[..], [TaskEvent::Add { state, .. }] if state == "inbox"));
    }

    #[test]
    fn clears_a_due_date_with_null() {
        let mut list = list();
        change(
            &mut list,
            json!([{ "op": "add", "title": "Call", "due": "2026-11-20" }]),
        );
        let (_, events) = change(&mut list, json!([{ "op": "update", "id": 1, "due": null }]));
        let serialized = serde_json::to_value(&events[0]).unwrap();
        assert_eq!(serialized, json!({ "op": "update", "id": 1, "due": null }));
        assert_eq!(list.tasks[&1].due, None);
    }

    #[test]
    fn notes_a_task_the_user_removed() {
        let mut list = list();
        change(&mut list, json!([{ "op": "add", "title": "Buy gift" }]));
        assert_eq!(
            list.note_user_removed(1).unwrap(),
            "[USER] deleted task #1: \"Buy gift\"\nCurrent tasks:\n(none)"
        );
        assert!(list.note_user_removed(1).is_err());
    }

    #[test]
    fn gives_the_prompt_the_date_and_the_current_tasks() {
        let mut list = list();
        change(
            &mut list,
            json!([{ "op": "add", "title": "Call Ivan", "due": "2026-11-20" }]),
        );
        let instructions = list.instructions();
        assert!(instructions.contains("Today is Thursday 2026-11-19."));
        assert!(instructions.contains("Fri/пятница 2026-11-20"));
        assert!(instructions.ends_with("Current tasks:\n#1 Call Ivan [2026-11-20]"));
    }

    #[test]
    fn rejects_an_unknown_tool() {
        let mut list = list();
        assert_eq!(
            list.run_tool("wait", &json!({})),
            ("{\"error\":\"unknown tool\"}".to_owned(), Vec::new())
        );
        assert_eq!(tools().as_array().unwrap().len(), 1);
    }
}
