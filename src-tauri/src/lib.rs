// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// For dev: uv run openbis-upload-helper login
// For prod: we bundle Python as a sidecar and run the functionalities accordingly

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};


#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResult {
    success: bool,
    username: Option<String>,
    error: Option<String>,
}


#[derive(Debug, Serialize)]
struct PythonLoginRequest {
    server_url: String,
    username: String,
    password: String,
    personal_access_token: String,
}


#[tauri::command]
fn login(
    server_url: String,
    username: String,
    password: String,
    personal_access_token: String,
) -> Result<LoginResult, String> {
    let request = PythonLoginRequest {
        server_url,
        username,
        password,
        personal_access_token,
    };

    let payload = serde_json::to_string(&request)
        .map_err(|error| error.to_string())?;

    let mut child = Command::new("uv")  // replace this when we bundle Python as a sidecar
        .args([
            "run",
            "openbis-upload-helper",
            "login",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!("Failed to start Python backend: {error}")
        })?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|error| {
                format!(
                    "Failed to send login data to Python backend: {error}"
                )
            })?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| {
            format!("Python backend failed: {error}")
        })?;

    if !output.status.success() {
        let stderr =
            String::from_utf8_lossy(&output.stderr);

        return Err(format!(
            "Python backend failed: {stderr}"
        ));
    }

    serde_json::from_slice::<LoginResult>(&output.stdout)
        .map_err(|error| {
            format!(
                "Invalid response from Python backend: {error}"
            )
        })
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                login,
            ],
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}