// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// For development:
//   uv run openbis-upload-helper <command>
//
// For production:
//   Python will be bundled as a sidecar and invoked instead.

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::Mutex;


#[derive(Debug, Serialize)]
struct PythonLoginRequest {
    server_url: String,
    username: String,
    password: String,
    personal_access_token: String,
}


#[derive(Debug, Deserialize)]
struct PythonLoginResult {
    success: bool,
    username: Option<String>,
    token: Option<String>,
    error: Option<String>,
}


#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResult {
    success: bool,
    username: Option<String>,
    error: Option<String>,
}


#[derive(Clone, Serialize)]
struct AuthState {
    server_url: String,
    token: String,
}


struct AppState {
    auth: Mutex<Option<AuthState>>,
}


#[derive(Debug, Deserialize, Serialize)]
struct SpacesResult {
    success: bool,
    spaces: Vec<String>,
    error: Option<String>,
}


fn run_python_command(
    command: &str,
    payload: &str,
) -> Result<Vec<u8>, String> {
    let mut child = Command::new("uv") // Development only; Replace this with the bundled Python sidecar later.
        .args([
            "run",
            "openbis-upload-helper",
            command,
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
                    "Failed to send data to Python backend: {error}"
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

    Ok(output.stdout)
}


#[tauri::command]
fn login(
    state: tauri::State<AppState>,
    server_url: String,
    username: String,
    password: String,
    personal_access_token: String,
) -> Result<LoginResult, String> {
    let request = PythonLoginRequest {
        server_url: server_url.clone(),
        username,
        password,
        personal_access_token,
    };

    let payload =
        serde_json::to_string(&request)
            .map_err(|error| error.to_string())?;

    let output =
        run_python_command("login", &payload)?;

    let python_result =
        serde_json::from_slice::<PythonLoginResult>(&output)
            .map_err(|error| {
                format!(
                    "Invalid response from Python backend: {error}"
                )
            })?;

    if python_result.success {
        let token = python_result
            .token
            .clone()
            .ok_or(
                "Successful login did not return an authentication token."
            )?;

        let mut auth = state
            .auth
            .lock()
            .map_err(|_| {
                "Failed to access authentication state."
            })?;

        *auth = Some(AuthState {
            server_url,
            token,
        });
    }

    Ok(LoginResult {
        success: python_result.success,
        username: python_result.username,
        error: python_result.error,
    })
}


#[tauri::command]
fn get_spaces(
    state: tauri::State<AppState>,
) -> Result<SpacesResult, String> {
    let auth = {
        let stored_auth = state
            .auth
            .lock()
            .map_err(|_| {
                "Failed to access authentication state."
            })?;

        stored_auth
            .clone()
            .ok_or("Not authenticated.")?
    };

    let payload =
        serde_json::to_string(&auth)
            .map_err(|error| error.to_string())?;

    let output =
        run_python_command("spaces", &payload)?;

    serde_json::from_slice::<SpacesResult>(&output)
        .map_err(|error| {
            format!(
                "Invalid response from Python backend: {error}"
            )
        })
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            auth: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                login,
                get_spaces,
            ],
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}