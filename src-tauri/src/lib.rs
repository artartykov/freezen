mod ai;
mod ai_dialog;
mod app_updates;
mod onboarding_permissions;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(ai_dialog::Dialog::default())
        .invoke_handler(tauri::generate_handler![
            ai::save_ai_key,
            ai::test_ai_provider,
            ai::test_ai_voice,
            ai::test_ai_post_processing,
            ai::warm_ai,
            ai::dialog_start,
            ai::dialog_turn,
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
    let builder = builder
        .plugin(onboarding_permissions::plugin())
        .plugin(app_updates::plugin())
        .plugin(ai::secrets_plugin())
        .plugin(ai::speech_plugin());

    builder
        .run(tauri::generate_context!())
        .expect("error while running FreeZen");
}
