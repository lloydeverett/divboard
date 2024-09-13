// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tauri::{LogicalPosition, Manager};
use tauri_plugin_trafficlights_positioner::WindowExt;

#[tauri::command]
fn auth_cookie_value() -> String {
    env::var("AUTH_COOKIE").expect("AUTH_COOKIE environment variable not set.")
}

fn main() {
    tauri::Builder::default()
      .setup(move |app| {
        if let Some(window) = app.get_window("main") {
          #[cfg(target_os = "macos")]
          // NOTE: Make sure you only call this ONCE per window.
          let _ = window.setup_traffic_lights_inset(LogicalPosition::new(20.0, 24.0));
        };
  
        Ok(())
      })
      .invoke_handler(tauri::generate_handler![auth_cookie_value])
      .run(tauri::generate_context!())
      .expect("Error while running Divboard Desktop. Please report this error to the developer.");
}
