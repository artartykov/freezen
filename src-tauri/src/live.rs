#![cfg_attr(not(target_os = "android"), allow(dead_code))]

use crate::ai_dialog::{realtime_tools, Conversation, TaskEvent};
use futures_util::future::BoxFuture;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::async_runtime::Mutex as AsyncMutex;
use tokio::sync::{mpsc, watch};
use tokio::time::{interval, sleep_until, Instant, MissedTickBehavior};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;
use tokio_tungstenite::tungstenite::Message;

const TRANSCRIBE_URL: &str = "wss://api.openai.com/v1/realtime?intent=transcription";
const REALTIME_URL: &str = "wss://api.openai.com/v1/realtime?model=";
pub const REALTIME_MODEL: &str = "gpt-realtime-mini";
const TRANSCRIBE_MODEL: &str = "gpt-live-transcribe";
const ASSISTANT_TRANSCRIBE_MODEL: &str = "gpt-4o-transcribe";
const TRACE_LENGTH: usize = 6;
const RATE: u32 = 24_000;
const TICK: Duration = Duration::from_millis(100);
const FINISH_WAIT: Duration = Duration::from_millis(2500);
const CHECK_WAIT: Duration = Duration::from_secs(10);
const SILENCE_MS: u32 = 300;
const QUIET_ERRORS: [&str; 2] = [
    "input_audio_buffer_commit_empty",
    "conversation_already_has_active_response",
];

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Mode {
    Transcribe,
    Assistant,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Control {
    Run,
    Finish,
    Cancel,
}

pub trait Microphone: Send + Sync + 'static {
    fn read(&self) -> BoxFuture<'_, Result<(String, f32), String>>;
    fn stop(&self) -> BoxFuture<'_, ()>;
}

#[derive(Default)]
struct Shared {
    text: String,
    level: f32,
    active: bool,
    error: Option<String>,
    events: Vec<TaskEvent>,
    trace: Vec<String>,
}

impl Shared {
    fn note(&mut self, line: String) {
        self.trace.push(line);
        if self.trace.len() > TRACE_LENGTH {
            self.trace.remove(0);
        }
    }
}

pub struct Session {
    shared: Arc<Mutex<Shared>>,
    control: watch::Sender<Control>,
    outbox: mpsc::UnboundedSender<Value>,
}

impl Session {
    pub fn start(
        key: String,
        mode: Mode,
        language: String,
        conversation: Arc<AsyncMutex<Conversation>>,
        microphone: Arc<dyn Microphone>,
    ) -> Self {
        let shared = Arc::new(Mutex::new(Shared {
            active: true,
            ..Shared::default()
        }));
        let (control, control_rx) = watch::channel(Control::Run);
        let (outbox, outbox_rx) = mpsc::unbounded_channel();
        let task_shared = shared.clone();
        tauri::async_runtime::spawn(async move {
            let link = Link {
                mode,
                shared: task_shared.clone(),
                conversation,
                microphone: microphone.clone(),
            };
            let result = link.run(&key, &language, control_rx, outbox_rx).await;
            microphone.stop().await;
            let mut shared = lock(&task_shared);
            if let Err(error) = result {
                shared.error = Some(error);
            }
            shared.active = false;
            shared.level = 0.0;
        });
        Self {
            shared,
            control,
            outbox,
        }
    }

    pub fn poll(&self) -> Value {
        let mut shared = lock(&self.shared);
        let events = std::mem::take(&mut shared.events);
        json!({
            "final": shared.text.trim(),
            "partial": "",
            "level": shared.level,
            "active": shared.active,
            "error": shared.error,
            "events": events,
            "trace": shared.trace,
        })
    }

    pub fn finish(&self) {
        let _ = self.control.send(Control::Finish);
    }

    pub fn cancel(&self) {
        let _ = self.control.send(Control::Cancel);
    }

    pub fn tell(&self, text: &str) {
        let _ = self.outbox.send(user_text(text));
    }
}

fn lock(shared: &Mutex<Shared>) -> std::sync::MutexGuard<'_, Shared> {
    shared
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

fn user_text(text: &str) -> Value {
    json!({
        "type": "conversation.item.create",
        "item": {
            "type": "message",
            "role": "user",
            "content": [{ "type": "input_text", "text": text }]
        }
    })
}

fn language_code(language: &str) -> String {
    language
        .split(['-', '_'])
        .next()
        .unwrap_or("en")
        .to_lowercase()
}

pub fn session_update(mode: Mode, language: &str, instructions: &str) -> Value {
    let format = json!({ "type": "audio/pcm", "rate": RATE });
    let language = language_code(language);
    match mode {
        Mode::Transcribe => json!({
            "type": "session.update",
            "session": {
                "type": "transcription",
                "audio": { "input": {
                    "format": format,
                    "transcription": { "model": TRANSCRIBE_MODEL, "languages": [language], "delay": "low" },
                    "turn_detection": null
                } }
            }
        }),
        Mode::Assistant => json!({
            "type": "session.update",
            "session": {
                "type": "realtime",
                "output_modalities": ["text"],
                "instructions": instructions,
                "tools": realtime_tools(),
                "tool_choice": "required",
                "audio": { "input": {
                    "format": format,
                    "transcription": { "model": ASSISTANT_TRANSCRIBE_MODEL, "language": language },
                    "turn_detection": {
                        "type": "server_vad",
                        "silence_duration_ms": SILENCE_MS,
                        "create_response": true,
                        "interrupt_response": false
                    }
                } }
            }
        }),
    }
}

fn url(mode: Mode) -> String {
    match mode {
        Mode::Transcribe => TRANSCRIBE_URL.to_owned(),
        Mode::Assistant => format!("{REALTIME_URL}{REALTIME_MODEL}"),
    }
}

type Socket =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

async fn connect(key: &str, mode: Mode) -> Result<Socket, String> {
    let mut request = url(mode)
        .into_client_request()
        .map_err(|error| error.to_string())?;
    request.headers_mut().insert(
        AUTHORIZATION,
        format!("Bearer {key}")
            .parse()
            .map_err(|_| "Invalid API key".to_owned())?,
    );
    let (socket, _) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|error| error.to_string())?;
    Ok(socket)
}

fn error_message(event: &Value) -> Option<String> {
    let error = event.get("error")?;
    let code = error
        .get("code")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if QUIET_ERRORS.contains(&code) {
        return None;
    }
    Some(
        error
            .get("message")
            .and_then(Value::as_str)
            .map_or_else(|| error.to_string(), str::to_owned),
    )
}

pub async fn check(key: &str, mode: Mode, language: &str) -> Result<(), String> {
    let mut socket = connect(key, mode).await?;
    let update = session_update(mode, language, "Check the session.");
    socket
        .send(Message::text(update.to_string()))
        .await
        .map_err(|error| error.to_string())?;
    let deadline = Instant::now() + CHECK_WAIT;
    let result = loop {
        tokio::select! {
            () = sleep_until(deadline) => break Err("The speech service did not answer".to_owned()),
            message = socket.next() => match message {
                Some(Ok(Message::Text(text))) => {
                    let event: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
                    match event["type"].as_str() {
                        Some("session.updated") => break Ok(()),
                        Some("error") => break Err(error_message(&event).unwrap_or_else(|| event.to_string())),
                        _ => {}
                    }
                }
                Some(Ok(Message::Close(frame))) => break Err(frame.map_or_else(|| "Connection closed".to_owned(), |frame| frame.reason.to_string())),
                Some(Err(error)) => break Err(error.to_string()),
                None => break Err("Connection closed".to_owned()),
                _ => {}
            }
        }
    };
    let _ = socket.close(None).await;
    result
}

struct Link {
    mode: Mode,
    shared: Arc<Mutex<Shared>>,
    conversation: Arc<AsyncMutex<Conversation>>,
    microphone: Arc<dyn Microphone>,
}

impl Link {
    async fn run(
        &self,
        key: &str,
        language: &str,
        mut control: watch::Receiver<Control>,
        mut outbox: mpsc::UnboundedReceiver<Value>,
    ) -> Result<(), String> {
        let instructions = self.conversation.lock().await.instructions();
        let socket = connect(key, self.mode).await?;
        let (mut sink, mut stream) = socket.split();
        let send = |value: Value| Message::text(value.to_string());
        sink.send(send(session_update(self.mode, language, &instructions)))
            .await
            .map_err(|error| error.to_string())?;
        let mut tick = interval(TICK);
        tick.set_missed_tick_behavior(MissedTickBehavior::Delay);
        let mut finishing: Option<Instant> = None;
        loop {
            let deadline = finishing.unwrap_or_else(|| Instant::now() + Duration::from_secs(3600));
            tokio::select! {
                () = sleep_until(deadline), if finishing.is_some() => break,
                _ = tick.tick(), if finishing.is_none() => {
                    if let Some(append) = self.capture().await? {
                        sink.send(send(append)).await.map_err(|error| error.to_string())?;
                    }
                }
                Some(message) = outbox.recv() => {
                    sink.send(send(message)).await.map_err(|error| error.to_string())?;
                }
                changed = control.changed(), if finishing.is_none() => {
                    let command = if changed.is_ok() { *control.borrow() } else { Control::Cancel };
                    match command {
                        Control::Run => {}
                        Control::Cancel => break,
                        Control::Finish => {
                            if let Some(append) = self.capture().await? {
                                sink.send(send(append)).await.map_err(|error| error.to_string())?;
                            }
                            self.microphone.stop().await;
                            lock(&self.shared).level = 0.0;
                            if self.mode == Mode::Transcribe {
                                sink.send(send(json!({ "type": "input_audio_buffer.commit" })))
                                    .await
                                    .map_err(|error| error.to_string())?;
                            }
                            finishing = Some(Instant::now() + FINISH_WAIT);
                        }
                    }
                }
                message = stream.next() => match message {
                    Some(Ok(Message::Text(text))) => {
                        let event: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
                        for reply in self.handle(&event).await {
                            sink.send(send(reply)).await.map_err(|error| error.to_string())?;
                        }
                        if finishing.is_some() && self.done(&event) {
                            break;
                        }
                    }
                    Some(Ok(Message::Close(frame))) => {
                        if finishing.is_none() {
                            return Err(frame.map_or_else(|| "Connection closed".to_owned(), |frame| frame.reason.to_string()));
                        }
                        break;
                    }
                    Some(Err(error)) => return Err(error.to_string()),
                    None => break,
                    _ => {}
                }
            }
        }
        let _ = sink.send(Message::Close(None)).await;
        Ok(())
    }

    async fn capture(&self) -> Result<Option<Value>, String> {
        let (audio, level) = self.microphone.read().await?;
        lock(&self.shared).level = level;
        Ok((!audio.is_empty())
            .then(|| json!({ "type": "input_audio_buffer.append", "audio": audio })))
    }

    fn done(&self, event: &Value) -> bool {
        match (self.mode, event["type"].as_str()) {
            (Mode::Transcribe, Some(kind)) => kind.ends_with("input_audio_transcription.completed"),
            (Mode::Assistant, Some(kind)) => kind == "response.done",
            _ => false,
        }
    }

    async fn handle(&self, event: &Value) -> Vec<Value> {
        let kind = event["type"].as_str().unwrap_or_default();
        if self.mode == Mode::Assistant {
            let line = match kind {
                "input_audio_buffer.speech_started" => Some("speech started"),
                "input_audio_buffer.speech_stopped" => Some("speech stopped"),
                "response.created" => Some("response"),
                _ => None,
            };
            if let Some(line) = line {
                lock(&self.shared).note(line.to_owned());
            }
        }
        match (self.mode, kind) {
            (_, "error") => {
                if let Some(message) = error_message(event) {
                    lock(&self.shared).error = Some(message);
                }
                Vec::new()
            }
            (Mode::Transcribe, "conversation.item.input_audio_transcription.delta") => {
                if let Some(delta) = event["delta"].as_str() {
                    lock(&self.shared).text.push_str(delta);
                }
                Vec::new()
            }
            (Mode::Assistant, "conversation.item.input_audio_transcription.completed") => {
                if let Some(transcript) = event["transcript"].as_str() {
                    let mut shared = lock(&self.shared);
                    shared.text.push(' ');
                    shared.text.push_str(transcript.trim());
                }
                Vec::new()
            }
            (Mode::Assistant, "response.function_call_arguments.done") => {
                let name = event["name"].as_str().unwrap_or_default();
                let args = event["arguments"]
                    .as_str()
                    .and_then(|arguments| serde_json::from_str::<Value>(arguments).ok())
                    .unwrap_or(Value::Null);
                lock(&self.shared).note(format!("call {name} {args}"));
                let (output, task) = self.conversation.lock().await.run_tool(name, &args);
                if let Some(task) = task {
                    lock(&self.shared).events.push(task);
                }
                vec![json!({
                    "type": "conversation.item.create",
                    "item": {
                        "type": "function_call_output",
                        "call_id": event["call_id"],
                        "output": output
                    }
                })]
            }
            _ => Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configures_a_live_transcription_session() {
        let update = session_update(Mode::Transcribe, "ru-RU", "ignored");
        let input = &update["session"]["audio"]["input"];
        assert_eq!(update["session"]["type"], "transcription");
        assert_eq!(
            input["format"],
            json!({ "type": "audio/pcm", "rate": 24000 })
        );
        assert_eq!(input["transcription"]["model"], "gpt-live-transcribe");
        assert_eq!(input["transcription"]["languages"], json!(["ru"]));
        assert!(input["turn_detection"].is_null());
    }

    #[test]
    fn configures_a_realtime_session_that_only_calls_tools() {
        let update = session_update(Mode::Assistant, "en-US", "Keep tasks");
        let session = &update["session"];
        assert_eq!(session["type"], "realtime");
        assert_eq!(session["output_modalities"], json!(["text"]));
        assert_eq!(session["instructions"], "Keep tasks");
        assert_eq!(session["tool_choice"], "required");
        assert_eq!(session["tools"].as_array().unwrap().len(), 4);
        assert_eq!(
            session["audio"]["input"]["turn_detection"]["type"],
            "server_vad"
        );
        assert_eq!(session["audio"]["input"]["transcription"]["language"], "en");
    }

    #[test]
    fn hides_errors_that_are_expected_at_the_end_of_speech() {
        let quiet = json!({ "type": "error", "error": { "code": "input_audio_buffer_commit_empty", "message": "x" } });
        assert_eq!(error_message(&quiet), None);
        let loud = json!({ "type": "error", "error": { "code": "invalid_api_key", "message": "Bad key" } });
        assert_eq!(error_message(&loud), Some("Bad key".to_owned()));
    }

    struct FileMicrophone {
        pcm: Vec<u8>,
        sent: Mutex<usize>,
        start: std::time::Instant,
    }

    impl Microphone for FileMicrophone {
        fn read(&self) -> BoxFuture<'_, Result<(String, f32), String>> {
            Box::pin(async move {
                use base64_engine::encode;
                let elapsed = self.start.elapsed().as_millis() as usize;
                let until = (elapsed * RATE as usize * 2 / 1000).min(self.pcm.len()) & !1;
                let mut sent = self.sent.lock().unwrap();
                let chunk = &self.pcm[*sent..until.max(*sent)];
                *sent = until.max(*sent);
                Ok((encode(chunk), if chunk.is_empty() { 0.0 } else { 0.5 }))
            })
        }

        fn stop(&self) -> BoxFuture<'_, ()> {
            Box::pin(async {})
        }
    }

    mod base64_engine {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        pub fn encode(bytes: &[u8]) -> String {
            let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
            for chunk in bytes.chunks(3) {
                let b = [
                    chunk[0],
                    *chunk.get(1).unwrap_or(&0),
                    *chunk.get(2).unwrap_or(&0),
                ];
                let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
                for i in 0..4 {
                    if i <= chunk.len() {
                        out.push(TABLE[((n >> (18 - 6 * i)) & 63) as usize] as char);
                    } else {
                        out.push('=');
                    }
                }
            }
            out
        }
    }

    #[test]
    #[ignore = "streams AI_PCM to OpenAI with AI_KEY; AI_MODE is transcribe or assistant"]
    fn live_session_from_a_recording() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let pcm = std::fs::read(std::env::var("AI_PCM").expect("AI_PCM")).unwrap();
        let mode = match std::env::var("AI_MODE").as_deref() {
            Ok("assistant") => Mode::Assistant,
            _ => Mode::Transcribe,
        };
        let audio = Duration::from_millis((pcm.len() / 48) as u64);
        let conversation = Arc::new(AsyncMutex::new(Conversation::new(
            crate::ai_dialog::Api::OpenAi,
            REALTIME_MODEL,
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20, Mon/понедельник 2026-11-23",
        )));
        tauri::async_runtime::block_on(async {
            let microphone = Arc::new(FileMicrophone {
                pcm,
                sent: Mutex::new(0),
                start: std::time::Instant::now(),
            });
            let start = std::time::Instant::now();
            let session =
                Session::start(key, mode, "ru-RU".into(), conversation.clone(), microphone);
            let mut finished = false;
            let mut last = String::new();
            let mut last_trace = String::new();
            loop {
                tokio::time::sleep(TICK).await;
                let state = session.poll();
                let ms = start.elapsed().as_millis();
                if state["final"] != json!(last) {
                    last = state["final"].as_str().unwrap_or_default().to_owned();
                    println!("{ms:>6}ms text: {last}");
                }
                for event in state["events"].as_array().into_iter().flatten() {
                    println!("{ms:>6}ms TASK {event}");
                }
                let trace = state["trace"].to_string();
                if trace != last_trace {
                    println!("{ms:>6}ms trace {trace}");
                    last_trace = trace;
                }
                if !state["error"].is_null() {
                    println!("{ms:>6}ms error: {}", state["error"]);
                }
                if !finished && start.elapsed() >= audio {
                    println!("{ms:>6}ms finish");
                    session.finish();
                    finished = true;
                }
                if state["active"] == json!(false) {
                    break;
                }
            }
        });
    }
}
