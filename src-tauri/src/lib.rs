mod ai;
mod app_updates;
mod live;
mod onboarding_permissions;
mod storage;
mod tasks;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(tasks::Dialog::default())
        .manage(ai::Live::default())
        .invoke_handler(tauri::generate_handler![
            ai::save_ai_key,
            ai::test_ai_provider,
            ai::test_ai_voice,
            ai::dialog_start,
            ai::live_user_removed,
            ai::start_speech,
            ai::poll_speech,
            ai::stop_speech,
            ai::cancel_speech,
            app_updates::supports_app_updates,
            app_updates::check_app_update,
            app_updates::install_app_update,
            onboarding_permissions::request_onboarding_permission,
            storage::load_data,
            storage::save_data
        ]);

    #[cfg(target_os = "android")]
    let builder = ai::plugins().into_iter().fold(
        builder
            .plugin(onboarding_permissions::plugin())
            .plugin(app_updates::plugin()),
        tauri::Builder::plugin,
    );

    builder
        .run(tauri::generate_context!())
        .expect("error while running FreeZen");
}
