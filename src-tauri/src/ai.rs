use crate::ai_dialog::{run_turn, split_model, Api, Conversation, Dialog, Input, TaskEvent};
use crate::live::{self, Mode, Session};
use serde_json::Value;
use std::sync::{Mutex, OnceLock};

const OPENROUTER_KEY_PATHS: [&str; 2] = ["/key", "/auth/key"];
const DETAIL_LIMIT: usize = 200;

#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager, Wry};

#[cfg(target_os = "android")]
struct AiSecrets(PluginHandle<Wry>);

#[cfg(target_os = "android")]
struct SpeechCapture(PluginHandle<Wry>);

#[cfg(target_os = "android")]
struct MicCapture(PluginHandle<Wry>);

#[derive(Default)]
pub struct Live(Mutex<Option<Session>>);

impl Live {
    fn session(&self) -> std::sync::MutexGuard<'_, Option<Session>> {
        self.0
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

#[cfg(target_os = "android")]
fn android_plugin<T: Send + Sync + 'static>(
    name: &'static str,
    class: &'static str,
    wrap: fn(PluginHandle<Wry>) -> T,
) -> tauri::plugin::TauriPlugin<Wry> {
    tauri::plugin::Builder::new(name)
        .setup(move |app, api| {
            app.manage(wrap(api.register_android_plugin("app.freezen", class)?));
            Ok(())
        })
        .build()
}

#[cfg(target_os = "android")]
pub fn plugins() -> [tauri::plugin::TauriPlugin<Wry>; 3] {
    [
        android_plugin("ai-secrets", "AiSecrets", AiSecrets),
        android_plugin("speech-capture", "SpeechCapture", SpeechCapture),
        android_plugin("mic-capture", "MicCapture", MicCapture),
    ]
}

#[cfg(not(target_os = "android"))]
const UNSUPPORTED: &str = "AI is not supported on this platform";

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(reqwest::Client::new)
}

fn voice_mode(voice: &str) -> Option<Mode> {
    match voice {
        "openai-transcribe" => Some(Mode::Transcribe),
        "openai-realtime" => Some(Mode::Assistant),
        _ => None,
    }
}

#[tauri::command]
pub async fn save_ai_key(
    app: tauri::AppHandle,
    provider: String,
    key: String,
) -> Result<(), String> {
    let api = Api::parse(&provider)?;
    #[cfg(target_os = "android")]
    {
        app.state::<AiSecrets>()
            .0
            .run_mobile_plugin_async::<()>(
                "saveKey",
                std::collections::BTreeMap::from([
                    ("provider", api.name().to_owned()),
                    ("key", key.trim().to_owned()),
                ]),
            )
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, api, key);
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn test_ai_provider(
    app: tauri::AppHandle,
    provider: String,
    key: Option<String>,
) -> Result<(), String> {
    let api = Api::parse(&provider)?;
    let key = match key
        .map(|key| key.trim().to_owned())
        .filter(|key| !key.is_empty())
    {
        Some(key) => key,
        None => load_key(&app, api).await?,
    };
    let paths: &[&str] = match api {
        Api::OpenRouter => &OPENROUTER_KEY_PATHS,
        Api::OpenAi => &["/models"],
    };
    let mut failure = String::new();
    for path in paths {
        let response = client()
            .get(format!("{}{path}", api.base()))
            .bearer_auth(&key)
            .send()
            .await
            .map_err(|error| error.to_string())?;
        let status = response.status();
        if status.is_success() {
            return Ok(());
        }
        failure = describe(response).await;
        if status != reqwest::StatusCode::NOT_FOUND {
            break;
        }
    }
    Err(failure)
}

#[tauri::command]
pub async fn test_ai_voice(
    app: tauri::AppHandle,
    voice: String,
    language: String,
) -> Result<(), String> {
    if let Some(mode) = voice_mode(&voice) {
        let key = load_key(&app, Api::OpenAi).await?;
        return live::check(&key, mode, &language).await;
    }
    let available = mobile(&app, Plugin::Speech, "isAvailable", None).await?;
    if available.as_bool().unwrap_or(false) {
        Ok(())
    } else {
        Err("No speech recognizer on this device".into())
    }
}

#[tauri::command]
pub async fn test_ai_post_processing(app: tauri::AppHandle, model: String) -> Result<(), String> {
    let (api, model) = split_model(&model)?;
    let key = load_key(&app, api).await?;
    let mut conversation = Conversation::new(api, model, "2026-01-01", "Fri/пятница 2026-01-02");
    let mut added = false;
    run_turn(
        client(),
        &key,
        &mut conversation,
        Input::Words {
            text: "Call Ivan tomorrow".into(),
            ended: true,
        },
        |event| added |= matches!(event, TaskEvent::Add { .. }),
    )
    .await?;
    if added {
        Ok(())
    } else {
        Err("The model did not add a task".into())
    }
}

#[tauri::command]
pub async fn warm_ai(app: tauri::AppHandle, model: String) -> Result<(), String> {
    let (api, _) = split_model(&model)?;
    let key = load_key(&app, api).await?;
    let path = match api {
        Api::OpenRouter => "/key",
        Api::OpenAi => "/models",
    };
    client()
        .get(format!("{}{path}", api.base()))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn dialog_start(
    state: tauri::State<'_, Dialog>,
    model: String,
    today: String,
    calendar: String,
) -> Result<(), String> {
    let (api, model) = split_model(&model)?;
    *state.0.lock().await = Conversation::new(api, model, &today, &calendar);
    Ok(())
}

#[tauri::command]
pub async fn dialog_turn(
    app: tauri::AppHandle,
    state: tauri::State<'_, Dialog>,
    input: Input,
    on_event: tauri::ipc::Channel<TaskEvent>,
) -> Result<(), String> {
    let mut conversation = state.0.lock().await;
    let key = load_key(&app, conversation.api()).await?;
    run_turn(client(), &key, &mut conversation, input, |event| {
        let _ = on_event.send(event);
    })
    .await
}

#[tauri::command]
pub async fn live_user_removed(
    live: tauri::State<'_, Live>,
    dialog: tauri::State<'_, Dialog>,
    id: u32,
) -> Result<(), String> {
    let note = dialog.0.lock().await.note_user_removed(id)?;
    if let Some(session) = live.session().as_ref() {
        session.tell(&note);
    }
    Ok(())
}

#[tauri::command]
pub async fn start_speech(
    app: tauri::AppHandle,
    live: tauri::State<'_, Live>,
    dialog: tauri::State<'_, Dialog>,
    voice: String,
    language: String,
) -> Result<(), String> {
    if let Some(previous) = live.session().take() {
        previous.cancel();
    }
    let Some(mode) = voice_mode(&voice) else {
        return mobile(&app, Plugin::Speech, "start", Some(("language", language)))
            .await
            .map(drop);
    };
    let key = load_key(&app, Api::OpenAi).await?;
    mobile(&app, Plugin::Mic, "start", None).await?;
    let session = Session::start(key, mode, language, dialog.0.clone(), microphone(&app));
    *live.session() = Some(session);
    Ok(())
}

#[tauri::command]
pub async fn poll_speech(
    app: tauri::AppHandle,
    live: tauri::State<'_, Live>,
) -> Result<Value, String> {
    let state = live.session().as_ref().map(Session::poll);
    match state {
        Some(state) => Ok(state),
        None => mobile(&app, Plugin::Speech, "poll", None).await,
    }
}

#[tauri::command]
pub async fn stop_speech(
    app: tauri::AppHandle,
    live: tauri::State<'_, Live>,
) -> Result<(), String> {
    let finished = live.session().as_ref().map(Session::finish).is_some();
    if finished {
        return Ok(());
    }
    mobile(&app, Plugin::Speech, "stop", None).await.map(drop)
}

#[tauri::command]
pub async fn cancel_speech(
    app: tauri::AppHandle,
    live: tauri::State<'_, Live>,
) -> Result<(), String> {
    let session = live.session().take();
    if let Some(session) = session {
        session.cancel();
        return Ok(());
    }
    mobile(&app, Plugin::Speech, "cancel", None).await.map(drop)
}

#[derive(Clone, Copy)]
enum Plugin {
    Speech,
    Mic,
}

async fn mobile(
    app: &tauri::AppHandle,
    plugin: Plugin,
    command: &str,
    argument: Option<(&'static str, String)>,
) -> Result<Value, String> {
    #[cfg(target_os = "android")]
    {
        let payload: std::collections::BTreeMap<&str, String> = argument.into_iter().collect();
        let result = match plugin {
            Plugin::Speech => {
                app.state::<SpeechCapture>()
                    .0
                    .run_mobile_plugin_async::<Value>(command, payload)
                    .await
            }
            Plugin::Mic => {
                app.state::<MicCapture>()
                    .0
                    .run_mobile_plugin_async::<Value>(command, payload)
                    .await
            }
        };
        result.map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, plugin, command, argument);
        Err(UNSUPPORTED.into())
    }
}

struct DeviceMicrophone(tauri::AppHandle);

impl live::Microphone for DeviceMicrophone {
    fn read(&self) -> futures_util::future::BoxFuture<'_, Result<(String, f32), String>> {
        Box::pin(async move {
            let chunk = mobile(&self.0, Plugin::Mic, "read", None).await?;
            let audio = chunk["audio"].as_str().unwrap_or_default().to_owned();
            #[allow(clippy::cast_possible_truncation)]
            let level = chunk["level"].as_f64().unwrap_or_default() as f32;
            Ok((audio, level))
        })
    }

    fn stop(&self) -> futures_util::future::BoxFuture<'_, ()> {
        Box::pin(async move {
            let _ = mobile(&self.0, Plugin::Mic, "stop", None).await;
        })
    }
}

fn microphone(app: &tauri::AppHandle) -> std::sync::Arc<dyn live::Microphone> {
    std::sync::Arc::new(DeviceMicrophone(app.clone()))
}

async fn describe(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let detail: String = body.chars().take(DETAIL_LIMIT).collect();
    format!("HTTP {status}: {detail}")
}

async fn load_key(app: &tauri::AppHandle, api: Api) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        let stored: Value = app
            .state::<AiSecrets>()
            .0
            .run_mobile_plugin_async(
                "loadKey",
                std::collections::BTreeMap::from([("provider", api.name())]),
            )
            .await
            .map_err(|error| error.to_string())?;
        stored
            .get("key")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| "No API key".to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, api);
        Err(UNSUPPORTED.into())
    }
}
