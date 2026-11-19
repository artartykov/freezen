#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager, Wry};

#[cfg(target_os = "android")]
struct AppUpdates(PluginHandle<Wry>);

#[cfg(target_os = "android")]
pub fn plugin() -> tauri::plugin::TauriPlugin<Wry> {
    tauri::plugin::Builder::new("app-updates")
        .setup(|app, api| {
            app.manage(AppUpdates(
                api.register_android_plugin("app.freezen", "AppUpdates")?,
            ));
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn supports_app_updates(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        app.state::<AppUpdates>()
            .0
            .run_mobile_plugin_async("supportsUpdates", ())
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(false)
    }
}

#[tauri::command]
pub async fn check_app_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    #[cfg(target_os = "android")]
    {
        app.state::<AppUpdates>()
            .0
            .run_mobile_plugin_async("checkForUpdate", ())
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(None)
    }
}

#[tauri::command]
pub async fn install_app_update(app: tauri::AppHandle, version: String) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        app.state::<AppUpdates>()
            .0
            .run_mobile_plugin_async(
                "installUpdate",
                std::collections::BTreeMap::from([("version", version)]),
            )
            .await
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, version);
        Ok(false)
    }
}
