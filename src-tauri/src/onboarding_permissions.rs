#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager, Wry};

#[cfg(target_os = "android")]
pub fn plugin() -> tauri::plugin::TauriPlugin<Wry> {
    tauri::plugin::Builder::new("onboarding-permissions")
        .setup(|app, api| {
            app.manage(api.register_android_plugin("app.freezen", "OnboardingPermissions")?);
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn request_onboarding_permission(
    app: tauri::AppHandle,
    permission: String,
) -> Result<Option<bool>, String> {
    #[cfg(target_os = "android")]
    {
        let command = match permission.as_str() {
            "notifications" => "requestNotifications",
            "calendar" => "requestCalendar",
            _ => return Err("Unknown onboarding permission".into()),
        };

        app.state::<PluginHandle<Wry>>()
            .run_mobile_plugin_async::<bool>(command, ())
            .await
            .map(Some)
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, permission);
        Ok(None)
    }
}
