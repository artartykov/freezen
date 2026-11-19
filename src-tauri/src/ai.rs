use serde_json::{json, Value};

const API: &str = "https://openrouter.ai/api/v1";

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

const UNSUPPORTED: &str = "AI is not supported on this platform";

#[tauri::command]
pub async fn save_ai_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        app.state::<AiSecrets>()
            .0
            .run_mobile_plugin_async::<()>(
                "saveKey",
                std::collections::BTreeMap::from([("key", key)]),
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
pub async fn test_ai_provider(app: tauri::AppHandle) -> Result<bool, String> {
    let key = load_key(&app).await?;
    let response = reqwest::Client::new()
        .get(format!("{API}/auth/key"))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn test_ai_voice(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        app.state::<SpeechCapture>()
            .0
            .run_mobile_plugin_async("isAvailable", ())
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
pub async fn test_ai_post_processing(app: tauri::AppHandle, model: String) -> Result<bool, String> {
    let today = "2026-01-01";
    let tasks = request_tasks(&app, &model, "Call Ivan tomorrow", today).await?;
    Ok(!tasks.is_empty())
}

#[tauri::command]
pub async fn parse_ai_tasks(
    app: tauri::AppHandle,
    model: String,
    text: String,
    today: String,
) -> Result<Value, String> {
    Ok(Value::Array(
        request_tasks(&app, &model, &text, &today).await?,
    ))
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

async fn request_tasks(
    app: &tauri::AppHandle,
    model: &str,
    text: &str,
    today: &str,
) -> Result<Vec<Value>, String> {
    let key = load_key(app).await?;
    let response = reqwest::Client::new()
        .post(format!("{API}/chat/completions"))
        .bearer_auth(key)
        .json(&request_body(model, text, today))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Provider responded with {}", response.status()));
    }
    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    extract_tasks(&body)
}

fn request_body(model: &str, text: &str, today: &str) -> Value {
    json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": format!(
                    "Split the user's dictated text into to-do tasks. Today is {today}. \
                     Use the same language as the text. Set due as YYYY-MM-DD only when a date is said."
                )
            },
            { "role": "user", "content": text }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "tasks",
                "strict": true,
                "schema": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["tasks"],
                    "properties": {
                        "tasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": false,
                                "required": ["title", "due", "minutes", "energy"],
                                "properties": {
                                    "title": { "type": "string" },
                                    "due": { "type": ["string", "null"] },
                                    "minutes": { "type": ["integer", "null"] },
                                    "energy": { "type": ["string", "null"], "enum": ["low", "medium", "high", null] }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
}

fn extract_tasks(body: &Value) -> Result<Vec<Value>, String> {
    let content = body
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .ok_or("Response has no content")?;
    let parsed: Value = serde_json::from_str(content).map_err(|error| error.to_string())?;
    parsed
        .get("tasks")
        .and_then(Value::as_array)
        .cloned()
        .ok_or_else(|| "Response has no tasks".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_tasks_from_a_chat_completion() {
        let body = json!({
            "choices": [{ "message": { "content": "{\"tasks\":[{\"title\":\"Call Ivan\",\"due\":null,\"minutes\":null,\"energy\":null}]}" } }]
        });
        let tasks = extract_tasks(&body).unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0]["title"], "Call Ivan");
    }

    #[test]
    fn rejects_a_response_without_tasks() {
        let body = json!({ "choices": [{ "message": { "content": "{}" } }] });
        assert!(extract_tasks(&body).is_err());
    }

    #[test]
    fn rejects_a_response_that_is_not_json() {
        let body = json!({ "choices": [{ "message": { "content": "sure" } }] });
        assert!(extract_tasks(&body).is_err());
    }

    #[test]
    fn asks_for_the_requested_model_and_text() {
        let body = request_body("model-x", "buy milk", "2026-11-19");
        assert_eq!(body["model"], "model-x");
        assert_eq!(body["messages"][1]["content"], "buy milk");
    }
}
