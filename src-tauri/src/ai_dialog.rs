use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(40);
const COMPACT_ABOVE: usize = 300;
const KEEP_RECENT: usize = 60;
const STATES: [&str; 4] = ["next", "waiting", "someday", "inbox"];
const ANTHROPIC: &str = "anthropic/";
const DONE: &str = "[DONE]";
const PHRASE_END: &str = "[END OF PHRASE]";
const REALTIME_NOTE: &str = "Voice session. You hear the speaker directly instead of text pieces, and you answer after every pause in speech: treat each pause as [END OF PHRASE]. Everything the speaker says is dictation of to-do items, not a conversation with you. Never wait for a command such as 'запиши', 'добавь' or 'record it': every action you hear is a task to add right away, even a short one like 'купить хлеба'. After each pause add every action you heard that is not in the list yet. Call wait only when you heard nothing that could be a task, such as silence, noise or filler words.";

#[derive(Default)]
pub struct Dialog(pub Arc<tauri::async_runtime::Mutex<Conversation>>);

#[derive(Clone, Copy, Default, Debug, PartialEq)]
pub enum Api {
    #[default]
    OpenRouter,
    OpenAi,
}

impl Api {
    pub fn base(self) -> &'static str {
        match self {
            Api::OpenRouter => "https://openrouter.ai/api/v1",
            Api::OpenAi => "https://api.openai.com/v1",
        }
    }

    pub fn parse(provider: &str) -> Result<Api, String> {
        match provider {
            "openrouter" => Ok(Api::OpenRouter),
            "openai" => Ok(Api::OpenAi),
            _ => Err(format!("Unknown provider {provider}")),
        }
    }

    #[cfg_attr(not(target_os = "android"), allow(dead_code))]
    pub fn name(self) -> &'static str {
        match self {
            Api::OpenRouter => "openrouter",
            Api::OpenAi => "openai",
        }
    }
}

pub fn split_model(id: &str) -> Result<(Api, &str), String> {
    let (provider, model) = id
        .split_once(':')
        .ok_or_else(|| format!("Model {id} has no provider"))?;
    Ok((Api::parse(provider)?, model))
}

pub fn realtime_tools() -> Value {
    Value::Array(
        tools()
            .as_array()
            .into_iter()
            .flatten()
            .map(|tool| {
                let mut flat = tool["function"].clone();
                flat["type"] = json!("function");
                flat
            })
            .collect(),
    )
}

#[derive(Default)]
pub struct Conversation {
    api: Api,
    model: String,
    session: String,
    messages: Vec<Value>,
    tasks: BTreeMap<u32, TaskFields>,
    next_id: u32,
    usage: Option<Value>,
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
    Words {
        text: String,
        #[serde(default)]
        ended: bool,
    },
    Pause,
    Resume,
    UserRemoved {
        id: u32,
    },
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
1. Pieces are cut at arbitrary points. A piece that ends with '…' stops in the middle of a phrase and the next piece continues it; '[END OF PHRASE]' means the speaker stopped talking. Add a task as soon as both the action and what it applies to are clear ('заказать такси', 'позвонить Ивану'), even if details such as a date may follow: add them later with update_task. A bare verb or a fragment ('исправить', 'купить', 'позвонить') is not a task yet: call wait. When a piece continues the phrase of the last task (more words of its object, a number, a name, a date), extend that task with update_task so that its title keeps the full wording; never make a separate task from such a continuation. At [END OF PHRASE] make sure every complete action of that phrase is in the list with its full wording. Do not postpone tasks to the end.\n\
2. Corrections: when the speaker corrects themselves (for example 'ой то есть', 'нет, не ...', 'not X but Y'), change the earlier task with update_task, or remove it with remove_task if the speaker cancels it (and add the corrected task if there is one). Never leave the old wrong version in the list.\n\
3. update_task only corrects the SAME task (its wording, date or list); never use it to turn one task into a different task: a new action is always a new add_task. Never create duplicates. Before adding, check the tasks that already exist (ids from add_task results and the 'Current tasks' list in service messages). If a task already exists, update it. If you notice a duplicate or a half-finished task you added earlier, fix it with update_task or remove_task.\n\
4. Dates. A date phrase ('завтра', 'на пятницу', 'до пятницы', 'в понедельник', 'tomorrow', 'on Saturday') belongs to exactly one action in the same clause. When it comes right after an action, it belongs to that action: 'заказать такси на пятницу полить цветы' means taxi on Friday and flowers without a date. When it opens the dictation or a clause, that is, it comes first or right after a connector such as 'и', 'потом', 'ещё', 'а', 'and', 'then', it belongs to the action that follows it: 'завтра позвонить Ивану' and 'потом в пятницу отправить отчёт' put the date on the call and on the report. If the date and its action arrive in different pieces, put the date on that action with update_task, or include it when you add the action. Never set a due date on any other task. Today is {today}. Weekday names are exact; the calendar of the coming days: {calendar}. A bare weekday means its nearest upcoming day; 'next week' plus a weekday means that weekday of next week. Use YYYY-MM-DD; when no date is said, leave due null.\n\
5. Fix obvious speech-recognition mistakes, drop filler words, ignore remarks that are not tasks. Write titles in the speaker's language, keeping English phrases in English. Separate actions are separate tasks even when joined by 'и' or 'and' ('купить подарок и заказать цветы' is two tasks), but a list of items for one action ('buy milk and bread') is one task.\n\
Service messages: [PAUSE] the speaker paused: add what is complete, keep waiting on an unfinished sentence. [RESUME] the speaker continues the same dictation. [USER] the user edited the list by hand: respect it and do not re-add a task the user deleted on your own; but when the speaker then explicitly asks to bring it back ('верни', 'верни обратно', 'restore it', 'undo'), add it again with add_task. Do not remove a task unless it is an exact duplicate of another one (keep exactly one copy, never remove all copies) or the speaker cancelled it."
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
    pub fn new(api: Api, model: &str, today: &str, calendar: &str) -> Self {
        Self {
            api,
            model: model.to_owned(),
            session: session_id(),
            messages: vec![json!({ "role": "system", "content": system_prompt(today, calendar) })],
            tasks: BTreeMap::new(),
            next_id: 1,
            usage: None,
        }
    }

    pub fn api(&self) -> Api {
        self.api
    }

    pub fn instructions(&self) -> String {
        let prompt = self.messages[0]["content"].as_str().unwrap_or_default();
        format!("{prompt}\n{REALTIME_NOTE}\n{}", self.snapshot())
    }

    pub fn run_tool(&mut self, name: &str, args: &Value) -> (String, Option<TaskEvent>) {
        self.apply_call(name, args)
    }

    pub fn note_user_removed(&mut self, id: u32) -> Result<String, String> {
        self.user_message(&Input::UserRemoved { id })
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
            Input::Words { text, ended } => match (text.trim().is_empty(), ended) {
                (true, _) => PHRASE_END.to_owned(),
                (false, true) => format!("{text} {PHRASE_END}"),
                (false, false) => format!("{text} …"),
            },
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
        })
    }

    fn request_body(&self, user_message: &str) -> Value {
        let mut messages = self.messages.clone();
        messages.push(json!({ "role": "user", "content": user_message }));
        let mut body = json!({
            "model": self.model,
            "messages": messages,
            "tools": tools(),
            "tool_choice": "required",
            "stream": true
        });
        if self.api == Api::OpenAi {
            body["reasoning_effort"] = json!("none");
            body["prompt_cache_key"] = json!(self.session);
            body["stream_options"] = json!({ "include_usage": true });
            return body;
        }
        if !self.session.is_empty() {
            body["session_id"] = json!(self.session);
        }
        if self.model.starts_with(ANTHROPIC) {
            body["reasoning"] = json!({ "enabled": false });
            body["cache_control"] = json!({ "type": "ephemeral" });
        } else {
            body["reasoning"] = json!({ "effort": "none" });
        }
        body
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

    fn run_call(&mut self, turn: &mut Turn, call: Value) -> Option<TaskEvent> {
        let call_id = call
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
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
        turn.results
            .push(json!({ "role": "tool", "tool_call_id": call_id, "content": result }));
        turn.calls.push(call);
        event
    }

    fn finish_turn(&mut self, turn: Turn) -> Result<(), String> {
        if turn.calls.is_empty() {
            return Err("The model did not call a tool".to_owned());
        }
        self.messages
            .push(json!({ "role": "user", "content": turn.user_message }));
        self.messages
            .push(json!({ "role": "assistant", "content": null, "tool_calls": turn.calls }));
        self.messages.extend(turn.results);
        self.compact();
        Ok(())
    }

    #[cfg(test)]
    fn apply_response(
        &mut self,
        user_message: String,
        body: &Value,
    ) -> Result<Vec<TaskEvent>, String> {
        let calls = body
            .pointer("/choices/0/message/tool_calls")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let mut turn = Turn::new(user_message);
        let events = calls
            .into_iter()
            .filter_map(|call| self.run_call(&mut turn, call))
            .collect();
        self.finish_turn(turn).map(|()| events)
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

fn session_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or_default();
    format!("freezen-{nanos}")
}

struct Turn {
    user_message: String,
    calls: Vec<Value>,
    results: Vec<Value>,
}

impl Turn {
    fn new(user_message: String) -> Self {
        Self {
            user_message,
            calls: Vec::new(),
            results: Vec::new(),
        }
    }
}

#[derive(Default)]
struct SseLines {
    pending: Vec<u8>,
}

impl SseLines {
    fn push(&mut self, chunk: &[u8]) -> Vec<String> {
        self.pending.extend_from_slice(chunk);
        let mut payloads = Vec::new();
        while let Some(end) = self.pending.iter().position(|&byte| byte == b'\n') {
            let line: Vec<u8> = self.pending.drain(..=end).collect();
            let line = String::from_utf8_lossy(&line);
            if let Some(payload) = line.trim_end().strip_prefix("data:") {
                payloads.push(payload.trim_start().to_owned());
            }
        }
        payloads
    }
}

#[derive(Default)]
struct ToolCallStream {
    calls: Vec<Value>,
    taken: usize,
}

impl ToolCallStream {
    fn push(&mut self, deltas: &[Value]) -> Vec<Value> {
        for delta in deltas {
            let Some(index) = delta
                .get("index")
                .and_then(Value::as_u64)
                .and_then(|index| usize::try_from(index).ok())
            else {
                continue;
            };
            while self.calls.len() <= index {
                self.calls.push(json!({
                    "id": "",
                    "type": "function",
                    "function": { "name": "", "arguments": "" }
                }));
            }
            let call = &mut self.calls[index];
            if let Some(id) = delta.get("id").and_then(Value::as_str) {
                call["id"] = json!(id);
            }
            if let Some(name) = delta.pointer("/function/name").and_then(Value::as_str) {
                if !name.is_empty() {
                    call["function"]["name"] = json!(name);
                }
            }
            if let Some(fragment) = delta.pointer("/function/arguments").and_then(Value::as_str) {
                let arguments = call["function"]["arguments"].as_str().unwrap_or_default();
                call["function"]["arguments"] = json!(format!("{arguments}{fragment}"));
            }
        }
        self.take(self.calls.len().saturating_sub(1))
    }

    fn finish(&mut self) -> Vec<Value> {
        self.take(self.calls.len())
    }

    fn take(&mut self, ready: usize) -> Vec<Value> {
        if ready <= self.taken {
            return Vec::new();
        }
        let calls = self.calls[self.taken..ready].to_vec();
        self.taken = ready;
        calls
    }
}

fn read_payload(payload: &str, stream: &mut ToolCallStream) -> Result<(Vec<Value>, bool), String> {
    if payload == DONE {
        return Ok((stream.finish(), true));
    }
    let Ok(chunk) = serde_json::from_str::<Value>(payload) else {
        return Ok((Vec::new(), false));
    };
    if let Some(error) = chunk.get("error") {
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .map_or_else(|| error.to_string(), str::to_owned);
        return Err(message);
    }
    let mut calls = chunk
        .pointer("/choices/0/delta/tool_calls")
        .and_then(Value::as_array)
        .map(|deltas| stream.push(deltas))
        .unwrap_or_default();
    let finished = chunk
        .pointer("/choices/0/finish_reason")
        .is_some_and(|reason| !reason.is_null());
    if finished {
        calls.extend(stream.finish());
    }
    Ok((calls, false))
}

async fn read_stream(
    mut response: reqwest::Response,
    conversation: &mut Conversation,
    turn: &mut Turn,
    emit: &mut impl FnMut(TaskEvent),
) -> Result<(), String> {
    let mut lines = SseLines::default();
    let mut stream = ToolCallStream::default();
    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        for payload in lines.push(&chunk) {
            if let Some(usage) = serde_json::from_str::<Value>(&payload)
                .ok()
                .and_then(|chunk| chunk.get("usage").cloned())
            {
                conversation.usage = Some(usage);
            }
            let (calls, done) = read_payload(&payload, &mut stream)?;
            for call in calls {
                if let Some(event) = conversation.run_call(turn, call) {
                    emit(event);
                }
            }
            if done {
                return Ok(());
            }
        }
    }
    for call in stream.finish() {
        if let Some(event) = conversation.run_call(turn, call) {
            emit(event);
        }
    }
    Ok(())
}

pub async fn run_turn(
    client: &reqwest::Client,
    key: &str,
    conversation: &mut Conversation,
    input: Input,
    mut emit: impl FnMut(TaskEvent),
) -> Result<(), String> {
    let user_message = conversation.user_message(&input)?;
    let response = client
        .post(format!("{}/chat/completions", conversation.api.base()))
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
    let mut turn = Turn::new(user_message);
    let outcome = read_stream(response, conversation, &mut turn, &mut emit).await;
    conversation
        .finish_turn(turn)
        .map_err(|missing| outcome.err().unwrap_or(missing))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conversation() -> Conversation {
        Conversation::new(
            Api::OpenRouter,
            "model-x",
            "2026-11-19",
            "Fri/пятница 2026-11-20",
        )
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
        assert!(conversation
            .user_message(&Input::Resume)
            .unwrap()
            .starts_with("[RESUME]"));
    }

    #[test]
    fn marks_whether_the_speaker_finished_the_phrase() {
        let mut conversation = conversation();
        let words = |text: &str, ended| Input::Words {
            text: text.into(),
            ended,
        };
        assert_eq!(
            conversation
                .user_message(&words("исправить", false))
                .unwrap(),
            "исправить …"
        );
        assert_eq!(
            conversation.user_message(&words("6 из 6", true)).unwrap(),
            "6 из 6 [END OF PHRASE]"
        );
        assert_eq!(
            conversation.user_message(&words("", true)).unwrap(),
            "[END OF PHRASE]"
        );
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
        assert!(prompt.contains("'завтра позвонить Ивану'"));
    }

    #[test]
    fn asks_for_a_required_tool_call_with_the_pending_message() {
        let conversation = conversation();
        let body = conversation.request_body("buy milk");
        assert_eq!(body["model"], "model-x");
        assert_eq!(body["tool_choice"], "required");
        assert_eq!(body["stream"], true);
        assert_eq!(body["reasoning"], json!({ "effort": "none" }));
        assert!(body.get("cache_control").is_none());
        assert!(body["session_id"].as_str().unwrap().starts_with("freezen-"));
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

    #[test]
    fn disables_claude_thinking_and_turns_on_its_cache() {
        let conversation = Conversation::new(
            Api::OpenRouter,
            "anthropic/claude-haiku-5.5:nitro",
            "x",
            "y",
        );
        let body = conversation.request_body("buy milk");
        assert_eq!(body["reasoning"], json!({ "enabled": false }));
        assert_eq!(body["cache_control"], json!({ "type": "ephemeral" }));
    }

    #[test]
    fn splits_server_events_across_chunks() {
        let mut lines = SseLines::default();
        let text = "data: {\"a\":\"пятница\"}\n";
        let bytes = text.as_bytes();
        let middle = text.find("пятница").unwrap() + 1;
        assert!(lines.push(&bytes[..middle]).is_empty());
        assert_eq!(lines.push(&bytes[middle..]), vec!["{\"a\":\"пятница\"}"]);
        assert_eq!(
            lines.push(b": OPENROUTER PROCESSING\n\ndata: [DONE]\r\n"),
            vec!["[DONE]"]
        );
    }

    fn delta(index: u64, id: Option<&str>, name: Option<&str>, arguments: &str) -> Value {
        let mut function = json!({ "arguments": arguments });
        if let Some(name) = name {
            function["name"] = json!(name);
        }
        let mut delta = json!({ "index": index, "function": function });
        if let Some(id) = id {
            delta["id"] = json!(id);
        }
        delta
    }

    #[test]
    fn hands_over_a_tool_call_as_soon_as_the_next_one_starts() {
        let mut stream = ToolCallStream::default();
        assert!(stream
            .push(&[delta(0, Some("c1"), Some("add_task"), "{\"title\":")])
            .is_empty());
        assert!(stream.push(&[delta(0, None, None, "\"Call\"}")]).is_empty());
        let ready = stream.push(&[delta(1, Some("c2"), Some("wait"), "{}")]);
        assert_eq!(ready.len(), 1);
        assert_eq!(ready[0]["id"], "c1");
        assert_eq!(ready[0]["function"]["name"], "add_task");
        assert_eq!(ready[0]["function"]["arguments"], "{\"title\":\"Call\"}");
        let rest = stream.finish();
        assert_eq!(rest.len(), 1);
        assert_eq!(rest[0]["id"], "c2");
        assert!(stream.finish().is_empty());
    }

    #[test]
    fn finishes_the_calls_when_the_choice_finishes() {
        let mut stream = ToolCallStream::default();
        let start = json!({ "choices": [{ "delta": { "tool_calls": [delta(0, Some("c1"), Some("wait"), "{}")] }, "finish_reason": null }] });
        assert!(read_payload(&start.to_string(), &mut stream)
            .unwrap()
            .0
            .is_empty());
        let end = json!({ "choices": [{ "delta": {}, "finish_reason": "tool_calls" }] });
        let (calls, done) = read_payload(&end.to_string(), &mut stream).unwrap();
        assert_eq!(calls.len(), 1);
        assert!(!done);
        assert_eq!(read_payload(DONE, &mut stream).unwrap(), (Vec::new(), true));
    }

    #[test]
    fn reports_an_error_sent_in_the_middle_of_the_stream() {
        let mut stream = ToolCallStream::default();
        let error = json!({ "error": { "code": 502, "message": "Provider failed" } });
        assert_eq!(
            read_payload(&error.to_string(), &mut stream),
            Err("Provider failed".to_owned())
        );
    }

    #[test]
    fn keeps_the_calls_that_ran_before_a_failure() {
        let mut conversation = conversation();
        let mut turn = Turn::new("call Ivan".into());
        let event =
            conversation.run_call(&mut turn, call("c1", "add_task", &add("Call Ivan", None)));
        assert!(matches!(event, Some(TaskEvent::Add { id: 1, .. })));
        conversation.finish_turn(turn).unwrap();
        assert_eq!(conversation.messages.len(), 4);
        assert!(conversation.finish_turn(Turn::new("x".into())).is_err());
        assert_eq!(conversation.messages.len(), 4);
    }

    #[test]
    fn splits_a_model_id_into_provider_and_model() {
        assert_eq!(
            split_model("openrouter:openai/gpt-6-luna:nitro").unwrap(),
            (Api::OpenRouter, "openai/gpt-6-luna:nitro")
        );
        assert_eq!(
            split_model("openai:gpt-6-luna").unwrap(),
            (Api::OpenAi, "gpt-6-luna")
        );
        assert!(split_model("gpt-6-luna").is_err());
        assert!(split_model("other:x").is_err());
    }

    #[test]
    fn flattens_tools_for_realtime_sessions() {
        let tools = realtime_tools();
        let tools = tools.as_array().unwrap();
        assert_eq!(tools.len(), 4);
        assert_eq!(tools[0]["type"], "function");
        assert_eq!(tools[0]["name"], "add_task");
        assert!(tools[0]["parameters"].is_object());
        assert!(tools[0].get("function").is_none());
    }

    #[test]
    fn gives_realtime_sessions_the_prompt_and_current_tasks() {
        let mut conversation = conversation();
        conversation.run_tool("add_task", &add("Call Ivan", None));
        let instructions = conversation.instructions();
        assert!(instructions.contains("Today is 2026-11-19."));
        assert!(instructions.contains("Never wait for a command"));
        assert!(instructions.ends_with("#1 Call Ivan"));
    }

    fn live_api() -> Api {
        match std::env::var("AI_API").as_deref() {
            Ok("openai") => Api::OpenAi,
            _ => Api::OpenRouter,
        }
    }

    #[test]
    fn asks_openai_for_no_reasoning_and_a_cache_key() {
        let conversation = Conversation::new(Api::OpenAi, "gpt-6-luna", "x", "y");
        let body = conversation.request_body("buy milk");
        assert_eq!(body["reasoning_effort"], "none");
        assert!(body["prompt_cache_key"]
            .as_str()
            .unwrap()
            .starts_with("freezen-"));
        assert_eq!(body["stream_options"], json!({ "include_usage": true }));
        assert!(body.get("reasoning").is_none());
        assert!(body.get("session_id").is_none());
    }

    const DICTATION: &str = "завтра позвонить Ивану потом купить молоко и хлеб ой нет только молоко в пятницу отправить отчёт и ещё записаться к стоматологу на следующей неделе";
    const WORD_MILLIS: u128 = 400;

    #[test]
    #[ignore = "calls the AI API with AI_KEY"]
    fn benchmark_dictation_latency() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let model = std::env::var("AI_MODEL").expect("AI_MODEL");
        let client = reqwest::Client::new();
        let words: Vec<&str> = DICTATION.split_whitespace().collect();
        let mut conversation = Conversation::new(live_api(), &model,
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20, Sat/суббота 2026-11-21, Sun/воскресенье 2026-11-22, Mon/понедельник 2026-11-23, Tue/вторник 2026-11-24, Wed/среда 2026-11-25, Thu/четверг 2026-11-26",
        );
        let start = std::time::Instant::now();
        let mut fed = 0;
        let mut paused = false;
        let mut turns = Vec::new();
        while !paused {
            let spoken = usize::try_from(start.elapsed().as_millis() / WORD_MILLIS + 1)
                .unwrap()
                .min(words.len());
            let input = if spoken > fed {
                let text = words[fed..spoken].join(" ");
                fed = spoken;
                Input::Words { text, ended: false }
            } else if fed == words.len() {
                paused = true;
                Input::Pause
            } else {
                std::thread::sleep(Duration::from_millis(20));
                continue;
            };
            let label = match &input {
                Input::Words { text, .. } => text.clone(),
                _ => "[PAUSE]".to_owned(),
            };
            let sent = start.elapsed().as_millis();
            let mut first = None;
            let mut events = Vec::new();
            let result = tauri::async_runtime::block_on(run_turn(
                &client,
                &key,
                &mut conversation,
                input,
                |event| {
                    first.get_or_insert(start.elapsed().as_millis() - sent);
                    events.push(event);
                },
            ));
            let total = start.elapsed().as_millis() - sent;
            let usage = conversation.usage.take().unwrap_or(Value::Null);
            println!(
                "t={sent:>5}ms turn={total:>5}ms first_event={:>5} prompt={} cached={} reasoning={} out={} | {label} -> {}",
                first.map_or("-".to_owned(), |ms| format!("{ms}ms")),
                usage["prompt_tokens"],
                usage["prompt_tokens_details"]["cached_tokens"],
                usage["completion_tokens_details"]["reasoning_tokens"],
                usage["completion_tokens"],
                match &result {
                    Ok(()) if events.is_empty() => "wait".to_owned(),
                    Ok(()) => format!("{events:?}"),
                    Err(error) => format!("ERROR {error}"),
                }
            );
            turns.push(total);
        }
        let mean = turns.iter().sum::<u128>() / turns.len() as u128;
        println!(
            "turns={} mean={mean}ms max={}ms spoken_until={}ms done_at={}ms",
            turns.len(),
            turns.iter().max().unwrap(),
            (words.len() as u128 - 1) * WORD_MILLIS,
            start.elapsed().as_millis()
        );
        println!("{}", conversation.snapshot());
    }

    #[test]
    #[ignore = "calls the AI API with AI_KEY"]
    fn scenario_restores_a_task_the_user_removed() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let model = std::env::var("AI_MODEL").expect("AI_MODEL");
        let client = reqwest::Client::new();
        let mut conversation = Conversation::new(
            live_api(),
            &model,
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20",
        );
        let step = |conversation: &mut Conversation, input: Input| {
            let label = match &input {
                Input::Words { text, .. } => text.clone(),
                Input::UserRemoved { id } => format!("[USER removed #{id}]"),
                Input::Pause => "[PAUSE]".to_owned(),
                Input::Resume => "[RESUME]".to_owned(),
            };
            let mut events = Vec::new();
            let result = tauri::async_runtime::block_on(run_turn(
                &client,
                &key,
                conversation,
                input,
                |event| events.push(event),
            ));
            println!("{label} -> {result:?} {events:?}");
        };
        step(
            &mut conversation,
            Input::Words {
                text: "купить хлеб".into(),
                ended: true,
            },
        );
        step(
            &mut conversation,
            Input::Words {
                text: "удали это".into(),
                ended: true,
            },
        );
        step(
            &mut conversation,
            Input::Words {
                text: "верни обратно".into(),
                ended: true,
            },
        );
        let id = *conversation.tasks.keys().last().expect("a restored task");
        step(&mut conversation, Input::UserRemoved { id });
        step(
            &mut conversation,
            Input::Words {
                text: "верни обратно".into(),
                ended: true,
            },
        );
        println!("{}", conversation.snapshot());
        assert!(!conversation.tasks.is_empty(), "the task was not restored");
    }

    #[test]
    #[ignore = "calls the AI API with AI_KEY"]
    fn scenario_keeps_a_task_the_user_removed_deleted() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let model = std::env::var("AI_MODEL").expect("AI_MODEL");
        let client = reqwest::Client::new();
        let mut conversation = Conversation::new(
            live_api(),
            &model,
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20",
        );
        for input in [
            Input::Words {
                text: "купить хлеб".into(),
                ended: true,
            },
            Input::UserRemoved { id: 1 },
            Input::Words {
                text: "и ещё позвонить маме".into(),
                ended: true,
            },
            Input::Pause,
        ] {
            tauri::async_runtime::block_on(run_turn(
                &client,
                &key,
                &mut conversation,
                input,
                |_| {},
            ))
            .unwrap();
        }
        println!("{}", conversation.snapshot());
        assert!(conversation
            .tasks
            .values()
            .all(|task| !task.title.to_lowercase().contains("хлеб")));
    }

    #[test]
    #[ignore = "calls the AI API with AI_KEY and AI_PIECES"]
    fn scenario_dictation_pieces() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let model = std::env::var("AI_MODEL").expect("AI_MODEL");
        let pieces = std::env::var("AI_PIECES").expect("AI_PIECES");
        let client = reqwest::Client::new();
        let mut conversation = Conversation::new(
            live_api(),
            &model,
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20",
        );
        let inputs = pieces
            .split('|')
            .map(|piece| {
                let piece = piece.trim();
                Input::Words {
                    text: piece.trim_end_matches('#').trim().to_owned(),
                    ended: piece.ends_with('#'),
                }
            })
            .chain([Input::Pause]);
        for input in inputs {
            let label = match &input {
                Input::Words { text, .. } => text.clone(),
                _ => "[PAUSE]".to_owned(),
            };
            let mut events = Vec::new();
            let result = tauri::async_runtime::block_on(run_turn(
                &client,
                &key,
                &mut conversation,
                input,
                |event| events.push(event),
            ));
            println!("{label} -> {result:?} {events:?}");
        }
        println!("{}", conversation.snapshot());
    }
}
