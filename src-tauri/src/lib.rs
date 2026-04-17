mod commands;
mod moark;

use commands::AppState;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        moark_client: Arc::new(Mutex::new(None)),
        project_path: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_api_token,
            commands::chat,
            commands::test_connection,
            commands::get_connection_status,
            commands::set_project_path,
            commands::get_project_path,
            commands::extract_voice_feature,
            commands::start_voice_clone,
            commands::save_temp_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}