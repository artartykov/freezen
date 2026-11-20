#![cfg_attr(not(target_os = "android"), allow(dead_code))]

use crate::tasks::{tools, TaskEvent, TaskList};
use futures_util::future::BoxFuture;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::async_runtime::Mutex as AsyncMutex;
use tokio::sync::{mpsc, watch};
use tokio::time::{interval, sleep, MissedTickBehavior};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;
use tokio_tungstenite::tungstenite::Message;

pub const MODEL: &str = "gpt-realtime-2.1-mini";
const URL: &str = "wss://api.openai.com/v1/realtime?model=";
const TRANSCRIBE_MODEL: &str = "gpt-4o-transcribe";
const RATE: u32 = 24_000;
const TICK: Duration = Duration::from_millis(100);
const CLOSING_SILENCE: Duration = Duration::from_millis(600);
const CHECK_WAIT: Duration = Duration::from_secs(10);
const SILENCE_MS: u32 = 300;
const TRACE_LENGTH: usize = 6;
const QUIET_ERRORS: [&str; 2] = [
    "input_audio_buffer_commit_empty",
    "conversation_already_has_active_response",
];

#[derive(Clone, Copy, Debug, PartialEq)]
enum Control {
    Listen,
    Pause,
    Close,
}

pub trait Microphone: Send + Sync + 'static {
    fn start(&self) -> BoxFuture<'_, Result<(), String>>;
    fn read(&self) -> BoxFuture<'_, Result<(String, f32), String>>;
    fn stop(&self) -> BoxFuture<'_, ()>;
}

#[derive(Default)]
struct Shared {
    text: String,
    level: f32,
    listening: bool,
    open: bool,
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
        language: String,
        text: String,
        tasks: Arc<AsyncMutex<TaskList>>,
        microphone: Arc<dyn Microphone>,
    ) -> Self {
        let shared = Arc::new(Mutex::new(Shared {
            text,
            listening: true,
            open: true,
            ..Shared::default()
        }));
        let (control, control_rx) = watch::channel(Control::Listen);
        let (outbox, outbox_rx) = mpsc::unbounded_channel();
        let link = Link {
            shared: shared.clone(),
            tasks,
            microphone,
        };
        tauri::async_runtime::spawn(async move {
            let result = link.run(&key, &language, control_rx, outbox_rx).await;
            link.microphone.stop().await;
            let mut shared = lock(&link.shared);
            if let Err(error) = result {
                shared.error = Some(error);
            }
            shared.listening = false;
            shared.open = false;
            shared.level = 0.0;
        });
        Self {
            shared,
            control,
            outbox,
        }
    }

    pub fn is_open(&self) -> bool {
        lock(&self.shared).open
    }

    pub fn text(&self) -> String {
        lock(&self.shared).text.clone()
    }

    pub fn poll(&self) -> Value {
        let mut shared = lock(&self.shared);
        let events = std::mem::take(&mut shared.events);
        json!({
            "final": shared.text.trim(),
            "partial": "",
            "level": shared.level,
            "active": shared.listening,
            "error": shared.error,
            "events": events,
            "trace": shared.trace,
        })
    }

    pub fn listen(&self) {
        {
            let mut shared = lock(&self.shared);
            shared.listening = true;
            shared.error = None;
        }
        let _ = self.control.send(Control::Listen);
    }

    pub fn pause(&self) {
        lock(&self.shared).listening = false;
        let _ = self.control.send(Control::Pause);
    }

    pub fn close(&self) {
        let _ = self.control.send(Control::Close);
    }

    pub fn tell(&self, text: &str) {
        let _ = self.outbox.send(json!({
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [{ "type": "input_text", "text": text }]
            }
        }));
    }
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

fn language_code(language: &str) -> String {
    language
        .split(['-', '_'])
        .next()
        .unwrap_or("en")
        .to_lowercase()
}

pub fn session_update(language: &str, instructions: &str) -> Value {
    json!({
        "type": "session.update",
        "session": {
            "type": "realtime",
            "output_modalities": ["text"],
            "instructions": instructions,
            "tools": tools(),
            "tool_choice": "required",
            "audio": { "input": {
                "format": { "type": "audio/pcm", "rate": RATE },
                "transcription": { "model": TRANSCRIBE_MODEL, "language": language_code(language) },
                "turn_detection": {
                    "type": "server_vad",
                    "silence_duration_ms": SILENCE_MS,
                    "create_response": true,
                    "interrupt_response": false
                }
            } }
        }
    })
}

fn silence(duration: Duration) -> Value {
    let samples = usize::try_from(duration.as_millis()).unwrap_or(0) * RATE as usize / 1000;
    json!({ "type": "input_audio_buffer.append", "audio": base64(&vec![0; samples * 2]) })
}

fn base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let triple = [
            chunk[0],
            chunk.get(1).copied().unwrap_or(0),
            chunk.get(2).copied().unwrap_or(0),
        ];
        let n = (u32::from(triple[0]) << 16) | (u32::from(triple[1]) << 8) | u32::from(triple[2]);
        for index in 0..4 {
            if index <= chunk.len() {
                out.push(char::from(TABLE[((n >> (18 - 6 * index)) & 63) as usize]));
            } else {
                out.push('=');
            }
        }
    }
    out
}

type Socket =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

async fn connect(key: &str) -> Result<Socket, String> {
    let mut request = format!("{URL}{MODEL}")
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

fn closed(frame: Option<tokio_tungstenite::tungstenite::protocol::CloseFrame>) -> String {
    frame.map_or_else(
        || "Connection closed".to_owned(),
        |frame| frame.reason.to_string(),
    )
}

pub async fn check(key: &str, language: &str) -> Result<(), String> {
    let mut socket = connect(key).await?;
    socket
        .send(Message::text(
            session_update(language, "Check the session.").to_string(),
        ))
        .await
        .map_err(|error| error.to_string())?;
    let deadline = sleep(CHECK_WAIT);
    tokio::pin!(deadline);
    let result = loop {
        tokio::select! {
            () = &mut deadline => break Err("The speech service did not answer".to_owned()),
            message = socket.next() => match message {
                Some(Ok(Message::Text(text))) => {
                    let event: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
                    match event["type"].as_str() {
                        Some("session.updated") => break Ok(()),
                        Some("error") => break Err(error_message(&event).unwrap_or_else(|| event.to_string())),
                        _ => {}
                    }
                }
                Some(Ok(Message::Close(frame))) => break Err(closed(frame)),
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
    shared: Arc<Mutex<Shared>>,
    tasks: Arc<AsyncMutex<TaskList>>,
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
        self.microphone.start().await?;
        let instructions = self.tasks.lock().await.instructions();
        let socket = connect(key).await?;
        let (mut sink, mut stream) = socket.split();
        let send = |value: &Value| Message::text(value.to_string());
        sink.send(send(&session_update(language, &instructions)))
            .await
            .map_err(|error| error.to_string())?;
        let mut tick = interval(TICK);
        tick.set_missed_tick_behavior(MissedTickBehavior::Delay);
        let mut listening = *control.borrow_and_update() == Control::Listen;
        loop {
            tokio::select! {
                _ = tick.tick(), if listening => {
                    if let Some(append) = self.capture().await? {
                        sink.send(send(&append)).await.map_err(|error| error.to_string())?;
                    }
                }
                Some(message) = outbox.recv() => {
                    sink.send(send(&message)).await.map_err(|error| error.to_string())?;
                }
                changed = control.changed() => {
                    let command = if changed.is_ok() { *control.borrow_and_update() } else { Control::Close };
                    match command {
                        Control::Close => break,
                        Control::Listen if !listening => {
                            self.microphone.start().await?;
                            listening = true;
                        }
                        Control::Pause if listening => {
                            if let Some(append) = self.capture().await? {
                                sink.send(send(&append)).await.map_err(|error| error.to_string())?;
                            }
                            self.microphone.stop().await;
                            sink.send(send(&silence(CLOSING_SILENCE))).await.map_err(|error| error.to_string())?;
                            lock(&self.shared).level = 0.0;
                            listening = false;
                        }
                        _ => {}
                    }
                }
                message = stream.next() => match message {
                    Some(Ok(Message::Text(text))) => {
                        let event: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
                        for reply in self.handle(&event).await {
                            sink.send(send(&reply)).await.map_err(|error| error.to_string())?;
                        }
                    }
                    Some(Ok(Message::Close(frame))) => return Err(closed(frame)),
                    Some(Err(error)) => return Err(error.to_string()),
                    None => return Err("Connection closed".to_owned()),
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

    async fn handle(&self, event: &Value) -> Vec<Value> {
        let kind = event["type"].as_str().unwrap_or_default();
        let note = match kind {
            "input_audio_buffer.speech_started" => Some("speech started"),
            "input_audio_buffer.speech_stopped" => Some("speech stopped"),
            "response.created" => Some("response"),
            _ => None,
        };
        if let Some(note) = note {
            lock(&self.shared).note(note.to_owned());
        }
        match kind {
            "error" => {
                if let Some(message) = error_message(event) {
                    lock(&self.shared).error = Some(message);
                }
                Vec::new()
            }
            "conversation.item.input_audio_transcription.completed" => {
                let transcript = event["transcript"].as_str().unwrap_or_default().trim();
                if !transcript.is_empty() {
                    let mut shared = lock(&self.shared);
                    shared.text.push(' ');
                    shared.text.push_str(transcript);
                }
                Vec::new()
            }
            "response.function_call_arguments.done" => {
                let name = event["name"].as_str().unwrap_or_default();
                let args = event["arguments"]
                    .as_str()
                    .and_then(|arguments| serde_json::from_str::<Value>(arguments).ok())
                    .unwrap_or(Value::Null);
                let (output, tasks) = self.tasks.lock().await.run_tool(name, &args);
                let mut shared = lock(&self.shared);
                shared.note(format!("{name} {args}"));
                shared.events.extend(tasks);
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
    use tokio::time::Instant;

    #[test]
    fn configures_a_realtime_session_that_only_calls_tools() {
        let update = session_update("ru-RU", "Keep tasks");
        let session = &update["session"];
        assert_eq!(session["type"], "realtime");
        assert_eq!(session["output_modalities"], json!(["text"]));
        assert_eq!(session["instructions"], "Keep tasks");
        assert_eq!(session["tool_choice"], "required");
        assert_eq!(session["tools"][0]["name"], "change_tasks");
        let input = &session["audio"]["input"];
        assert_eq!(
            input["format"],
            json!({ "type": "audio/pcm", "rate": 24000 })
        );
        assert_eq!(input["turn_detection"]["type"], "server_vad");
        assert_eq!(input["transcription"]["language"], "ru");
    }

    #[test]
    fn hides_errors_that_are_expected_at_the_end_of_speech() {
        let quiet = json!({ "type": "error", "error": { "code": "input_audio_buffer_commit_empty", "message": "x" } });
        assert_eq!(error_message(&quiet), None);
        let loud = json!({ "type": "error", "error": { "code": "invalid_api_key", "message": "Bad key" } });
        assert_eq!(error_message(&loud), Some("Bad key".to_owned()));
    }

    #[test]
    fn encodes_base64() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn closes_a_phrase_with_silence() {
        let append = silence(Duration::from_millis(100));
        let audio = append["audio"].as_str().unwrap();
        assert_eq!(audio.len(), 4800_usize.div_ceil(3) * 4);
        assert!(audio.starts_with("AAAA"));
    }

    struct FileMicrophone {
        pcm: Vec<u8>,
        sent: Mutex<usize>,
        start: std::time::Instant,
    }

    impl Microphone for FileMicrophone {
        fn start(&self) -> BoxFuture<'_, Result<(), String>> {
            Box::pin(async { Ok(()) })
        }

        fn read(&self) -> BoxFuture<'_, Result<(String, f32), String>> {
            Box::pin(async move {
                let elapsed = usize::try_from(self.start.elapsed().as_millis()).unwrap();
                let until = (elapsed * RATE as usize * 2 / 1000).min(self.pcm.len()) & !1;
                let mut sent = self.sent.lock().unwrap();
                let from = *sent;
                *sent = until.max(from);
                let chunk = &self.pcm[from..*sent];
                Ok((base64(chunk), if chunk.is_empty() { 0.0 } else { 0.5 }))
            })
        }

        fn stop(&self) -> BoxFuture<'_, ()> {
            Box::pin(async {})
        }
    }

    #[test]
    #[ignore = "streams AI_PCM to OpenAI with AI_KEY"]
    fn live_session_from_a_recording() {
        let key = std::env::var("AI_KEY").expect("AI_KEY");
        let pcm = std::fs::read(std::env::var("AI_PCM").expect("AI_PCM")).unwrap();
        let audio = Duration::from_millis((pcm.len() / 48) as u64);
        let tasks = Arc::new(AsyncMutex::new(TaskList::new(
            "Thursday 2026-11-19",
            "Fri/пятница 2026-11-20, Sat/суббота 2026-11-21, Sun/воскресенье 2026-11-22, Mon/понедельник 2026-11-23",
        )));
        tauri::async_runtime::block_on(async {
            let microphone = Arc::new(FileMicrophone {
                pcm,
                sent: Mutex::new(0),
                start: std::time::Instant::now(),
            });
            let start = Instant::now();
            let session = Session::start(
                key,
                "ru-RU".into(),
                String::new(),
                tasks.clone(),
                microphone,
            );
            let mut paused = false;
            let mut last = String::new();
            loop {
                sleep(TICK).await;
                let state = session.poll();
                let ms = start.elapsed().as_millis();
                if state["final"] != json!(last) {
                    last = state["final"].as_str().unwrap_or_default().to_owned();
                    println!("{ms:>6}ms text: {last}");
                }
                for event in state["events"].as_array().into_iter().flatten() {
                    println!("{ms:>6}ms TASK {event}");
                }
                if !state["error"].is_null() {
                    println!("{ms:>6}ms error: {}", state["error"]);
                    break;
                }
                if !paused && start.elapsed() >= audio {
                    session.pause();
                    paused = true;
                }
                if paused && start.elapsed() >= audio + Duration::from_secs(3) {
                    session.close();
                    break;
                }
            }
            let instructions = tasks.lock().await.instructions();
            let list = instructions
                .rsplit("Current tasks:\n")
                .next()
                .unwrap_or_default();
            println!("FINAL\n{list}");
        });
    }
}
