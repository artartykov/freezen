use crate::ai_dialog::{run_turn, Conversation, Dialog, Input, TaskEvent};
use serde_json::Value;
use std::sync::OnceLock;

const API: &str = "https://openrouter.ai/api/v1";
const KEY_PATHS: [&str; 2] = ["/key", "/auth/key"];
const DETAIL_LIMIT: usize = 200;

#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager, Wry};

#[cfg(target_os = "android")]
struct AiSecrets(PluginHandle<Wry>);

#[cfg(target_os = "android")]
struct SpeechCapture(PluginHandle<Wry>);

#[cfg(target_os = "android")]
pub fn secrets_plugin() -> tauri::plugin::TauriPlugin<Wry> {
    tauri::plugin::Builder::new("ai-secrets")
        .setup(|app, api| {
            app.manage(AiSecrets(
                api.register_android_plugin("app.freezen", "AiSecrets")?,
            ));
            Ok(())
        })
        .build()
}

#[cfg(target_os = "android")]
pub fn speech_plugin() -> tauri::plugin::TauriPlugin<Wry> {
    tauri::plugin::Builder::new("speech-capture")
        .setup(|app, api| {
            app.manage(SpeechCapture(
                api.register_android_plugin("app.freezen", "SpeechCapture")?,
            ));
            Ok(())
        })
        .build()
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
                std::collections::BTreeMap::from([("key", key.trim().to_string())]),
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
    let mut failure = String::new();
    for path in KEY_PATHS {
        let response = client()
            .get(format!("{API}{path}"))
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
pub async fn test_ai_voice(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let available: bool = app
            .state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async("isAvailable", ())
            .await
            .map_err(|error| error.to_string())?;
        if available {
            Ok(())
        } else {
            Err("No speech recognizer on this device".into())
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn test_ai_post_processing(app: tauri::AppHandle, model: String) -> Result<(), String> {
    let key = load_key(&app).await?;
    let mut conversation = Conversation::new(&model, "2026-01-01", "Fri/пятница 2026-01-02");
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
pub async fn warm_ai(app: tauri::AppHandle) -> Result<(), String> {
    let key = load_key(&app).await?;
    client()
        .get(format!("{API}/key"))
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
    *state.0.lock().await = Conversation::new(&model, &today, &calendar);
    Ok(())
}

#[tauri::command]
pub async fn dialog_turn(
    app: tauri::AppHandle,
    state: tauri::State<'_, Dialog>,
    input: Input,
    on_event: tauri::ipc::Channel<TaskEvent>,
) -> Result<(), String> {
    let key = load_key(&app).await?;
    let mut conversation = state.0.lock().await;
    run_turn(client(), &key, &mut conversation, input, |event| {
        let _ = on_event.send(event);
    })
    .await
}

#[tauri::command]
pub async fn start_speech(app: tauri::AppHandle, language: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        app.state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async::<()>(
                "start",
                std::collections::BTreeMap::from([("language", language)]),
            )
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, language);
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn poll_speech(app: tauri::AppHandle) -> Result<Value, String> {
    #[cfg(target_os = "android")]
    {
        app.state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async("poll", ())
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn stop_speech(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        app.state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async::<()>("stop", ())
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(UNSUPPORTED.into())
    }
}

#[tauri::command]
pub async fn cancel_speech(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        app.state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async::<()>("cancel", ())
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err(UNSUPPORTED.into())
    }
}

async fn describe(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let detail: String = body.chars().take(DETAIL_LIMIT).collect();
    format!("HTTP {status}: {detail}")
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
