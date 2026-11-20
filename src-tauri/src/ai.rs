use crate::live::{self, Session};
use crate::tasks::{Dialog, TaskList};
use serde_json::Value;
use std::sync::{Mutex, OnceLock};

const API: &str = "https://api.openai.com/v1";
const DETAIL_LIMIT: usize = 200;

#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager, Wry};

#[cfg(target_os = "android")]
struct AiSecrets(PluginHandle<Wry>);

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
pub fn plugins() -> [tauri::plugin::TauriPlugin<Wry>; 2] {
    [
        android_plugin("ai-secrets", "AiSecrets", AiSecrets),
        android_plugin("mic-capture", "MicCapture", MicCapture),
    ]
}

#[cfg(not(target_os = "android"))]
const UNSUPPORTED: &str = "AI is not supported on this platform";

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(reqwest::Client::new)
}

#[tauri::command]
pub async fn save_ai_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        app.state::<AiSecrets>()
            .0
            .run_mobile_plugin_async::<()>(
                "saveKey",
                std::collections::BTreeMap::from([("key", key.trim().to_owned())]),
            )
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, key);
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn test_ai_provider(app: tauri::AppHandle, key: Option<String>) -> Result<(), String> {
    let key = match key
        .map(|key| key.trim().to_owned())
        .filter(|key| !key.is_empty())
    {
        Some(key) => key,
        None => load_key(&app).await?,
    };
    let response = client()
        .get(format!("{API}/models"))
        .bearer_auth(&key)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if response.status().is_success() {
        return Ok(());
    }
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let detail: String = body.chars().take(DETAIL_LIMIT).collect();
    Err(format!("HTTP {status}: {detail}"))
}

#[tauri::command]
pub async fn test_ai_voice(app: tauri::AppHandle, language: String) -> Result<(), String> {
    let key = load_key(&app).await?;
    live::check(&key, &language).await
}

#[tauri::command]
pub async fn dialog_start(
    live: tauri::State<'_, Live>,
    dialog: tauri::State<'_, Dialog>,
    today: String,
    calendar: String,
) -> Result<(), String> {
    if let Some(previous) = live.session().take() {
        previous.close();
    }
    *dialog.0.lock().await = TaskList::new(&today, &calendar);
    Ok(())
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
    language: String,
) -> Result<(), String> {
    let text = {
        let session = live.session();
        match session.as_ref() {
            Some(session) if session.is_open() => {
                session.listen();
                return Ok(());
            }
            Some(session) => session.text(),
            None => String::new(),
        }
    };
    let key = load_key(&app).await?;
    let session = Session::start(key, language, text, dialog.0.clone(), microphone(&app));
    *live.session() = Some(session);
    Ok(())
}

#[tauri::command]
pub fn poll_speech(live: tauri::State<'_, Live>) -> Result<Value, String> {
    live.session()
        .as_ref()
        .map(Session::poll)
        .ok_or_else(|| "Speech is not started".to_owned())
}

#[tauri::command]
pub fn stop_speech(live: tauri::State<'_, Live>) {
    if let Some(session) = live.session().as_ref() {
        session.pause();
    }
}

#[tauri::command]
pub fn cancel_speech(live: tauri::State<'_, Live>) {
    if let Some(session) = live.session().take() {
        session.close();
    }
}

async fn mic(
    app: &tauri::AppHandle,
    command: &str,
    generation: Option<i64>,
) -> Result<Value, String> {
    #[cfg(target_os = "android")]
    {
        let payload: std::collections::BTreeMap<&str, i64> = generation
            .map(|generation| ("generation", generation))
            .into_iter()
            .collect();
        app.state::<MicCapture>()
            .0
            .run_mobile_plugin_async::<Value>(command, payload)
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, command, generation);
        Err(UNSUPPORTED.into())
    }
}

struct DeviceMicrophone {
    app: tauri::AppHandle,
    generation: Mutex<Option<i64>>,
}

impl DeviceMicrophone {
    fn generation(&self) -> Option<i64> {
        *self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn set_generation(&self, generation: Option<i64>) {
        *self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = generation;
    }
}

impl live::Microphone for DeviceMicrophone {
    fn start(&self) -> futures_util::future::BoxFuture<'_, Result<(), String>> {
        Box::pin(async move {
            let started = mic(&self.app, "start", None).await?;
            self.set_generation(started["generation"].as_i64());
            Ok(())
        })
    }

    fn read(&self) -> futures_util::future::BoxFuture<'_, Result<(String, f32), String>> {
        Box::pin(async move {
            let Some(generation) = self.generation() else {
                return Ok((String::new(), 0.0));
            };
            let chunk = mic(&self.app, "read", Some(generation)).await?;
            let audio = chunk["audio"].as_str().unwrap_or_default().to_owned();
            #[allow(clippy::cast_possible_truncation)]
            let level = chunk["level"].as_f64().unwrap_or_default() as f32;
            Ok((audio, level))
        })
    }

    fn stop(&self) -> futures_util::future::BoxFuture<'_, ()> {
        Box::pin(async move {
            if let Some(generation) = self.generation() {
                self.set_generation(None);
                let _ = mic(&self.app, "stop", Some(generation)).await;
            }
        })
    }
}

fn microphone(app: &tauri::AppHandle) -> std::sync::Arc<dyn live::Microphone> {
    std::sync::Arc::new(DeviceMicrophone {
        app: app.clone(),
        generation: Mutex::new(None),
    })
}

async fn load_key(app: &tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        let stored: Value = app
            .state::<AiSecrets>()
            .0
            .run_mobile_plugin_async("loadKey", ())
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
        let _ = app;
        Err(UNSUPPORTED.into())
    }
}
