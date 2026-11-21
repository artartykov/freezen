mod app_updates;
mod onboarding_permissions;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        app_updates::supports_app_updates,
        app_updates::check_app_update,
        app_updates::install_app_update,
        onboarding_permissions::request_onboarding_permission,
        storage::load_data,
        storage::load_recovery_files,
        storage::load_document,
        storage::save_document,
        storage::load_document_recovery_files,
        storage::prepare_android_document
    ]);

    #[cfg(target_os = "android")]
    let builder = builder
        .plugin(onboarding_permissions::plugin())
        .plugin(app_updates::plugin());

    builder
        .run(tauri::generate_context!())
        .expect("error while running FreeZen");
}
