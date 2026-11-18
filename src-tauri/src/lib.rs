mod onboarding_permissions;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        onboarding_permissions::request_onboarding_permission
    ]);

    #[cfg(target_os = "android")]
    let builder = builder.plugin(onboarding_permissions::plugin());

    builder
        .run(tauri::generate_context!())
        .expect("error while running FreeZen");
}
