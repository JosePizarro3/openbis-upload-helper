// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// For development:
//   uv run openbis-upload-helper <command>
//
// For production:
//   Python will be bundled as a sidecar and invoked instead.

mod source;

use serde::{Deserialize, Serialize};
use std::io::{
    BufRead,
    BufReader,
    Write,
};
use tauri::Emitter;
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
    processing: Mutex<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SpacesResult {
    success: bool,
    spaces: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProjectsRequest {
    server_url: String,
    token: String,
    space: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct ProjectsResult {
    success: bool,
    projects: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct CollectionsRequest {
    server_url: String,
    token: String,
    space: String,
    project: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct CollectionsResult {
    success: bool,
    collections: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParserInfo {
    id: String,
    name: String,
    description: String,
    version: Option<String>,
}


#[derive(Debug, Deserialize, Serialize)]
struct ParsersResult {
    success: bool,
    parsers: Vec<ParserInfo>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProcessingJob {
    parser_id: String,
    assignment_path: String,
    paths: Vec<String>,
}


#[derive(Debug, Serialize)]
struct PythonProcessingJob {
    parser_id: String,
    assignment_path: String,
    paths: Vec<String>,
}


#[derive(Debug, Serialize)]
struct PythonProcessRequest {
    server_url: String,
    token: String,
    space: String,
    project: String,
    collection: String,
    jobs: Vec<PythonProcessingJob>,
}


#[derive(Debug, Deserialize)]
struct PythonProcessResult {
    success: bool,
    processed_files: usize,
    jobs: usize,
    error: Option<String>,
}


#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessResult {
    success: bool,
    processed_files: usize,
    jobs: usize,
    error: Option<String>,
}


#[derive(Debug, Deserialize)]
struct PythonProcessingEvent {
    #[serde(default)]
    kind: Option<String>,

    #[serde(default)]
    level: Option<String>,

    #[serde(default)]
    event: Option<String>,

    #[serde(default)]
    timestamp: Option<String>,

    #[serde(default)]
    stage: Option<String>,

    #[serde(default)]
    files: Option<usize>,

    #[serde(default)]
    jobs: Option<usize>,

    #[serde(default)]
    result: Option<PythonProcessResult>,
}


#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessingEvent {
    kind: String,
    level: String,
    message: String,
    timestamp: Option<String>,
    stage: Option<String>,
    files: Option<usize>,
    jobs: Option<usize>,
}


fn run_python_command(command: &str, payload: &str) -> Result<Vec<u8>, String> {
    let mut child = Command::new("uv") // Development only; Replace this with the bundled Python sidecar later.
        .args(["run", "openbis-upload-helper", command])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start Python backend: {error}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|error| format!("Failed to send data to Python backend: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Python backend failed: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        return Err(format!("Python backend failed: {stderr}"));
    }

    Ok(output.stdout)
}

fn run_processing_command(
    app: &tauri::AppHandle,
    payload: &str,
) -> Result<ProcessResult, String> {
    let mut child = Command::new("uv")
        // Development only.
        // Replace with the bundled Python sidecar later.
        .args([
            "run",
            "openbis-upload-helper",
            "process",
        ])
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Failed to start Python processing backend: {error}"
            )
        })?;


    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|error| {
                format!(
                    "Failed to send processing request to Python backend: {error}"
                )
            })?;
    }


    let stdout = child
        .stdout
        .take()
        .ok_or(
            "Could not capture Python processing stdout.",
        )?;

    let stderr = child
        .stderr
        .take()
        .ok_or(
            "Could not capture Python processing stderr.",
        )?;


    /*
     * stderr is consumed on a separate thread so the
     * child process cannot block if the stderr pipe fills.
     */
    let stderr_app = app.clone();

    let stderr_thread = std::thread::spawn(
        move || -> String {
            let reader = BufReader::new(stderr);
            let mut collected = String::new();

            for line in reader.lines() {
                let line = match line {
                    Ok(line) => line,

                    Err(error) => {
                        collected.push_str(
                            &format!(
                                "Could not read stderr: {error}\n"
                            ),
                        );

                        break;
                    }
                };

                collected.push_str(&line);
                collected.push('\n');

                let event = ProcessingEvent {
                    kind: "log".to_string(),
                    level: "error".to_string(),
                    message: line,
                    timestamp: None,
                    stage: None,
                    files: None,
                    jobs: None,
                };

                let _ = stderr_app.emit(
                    "processing-event",
                    event,
                );
            }

            collected
        },
    );


    let reader = BufReader::new(stdout);

    let mut final_result:
        Option<PythonProcessResult> = None;


    for line in reader.lines() {
        let line = line.map_err(|error| {
            format!(
                "Could not read Python processing output: {error}"
            )
        })?;

        if line.trim().is_empty() {
            continue;
        }


        let python_event =
            match serde_json::from_str::<PythonProcessingEvent>(
                &line,
            ) {
                Ok(event) => event,

                Err(error) => {
                    let event = ProcessingEvent {
                        kind: "log".to_string(),
                        level: "error".to_string(),
                        message: format!(
                            "Invalid processing event ({error}): {line}"
                        ),
                        timestamp: None,
                        stage: None,
                        files: None,
                        jobs: None,
                    };

                    let _ = app.emit(
                        "processing-event",
                        event,
                    );

                    continue;
                }
            };


        if python_event.kind.as_deref()
            == Some("result")
        {
            final_result = python_event.result;
            continue;
        }


        let event = ProcessingEvent {
            kind: python_event
                .kind
                .unwrap_or_else(
                    || "log".to_string(),
                ),

            level: python_event
                .level
                .unwrap_or_else(
                    || "info".to_string(),
                ),

            message: python_event
                .event
                .unwrap_or_else(
                    || line.clone(),
                ),

            timestamp: python_event.timestamp,
            stage: python_event.stage,
            files: python_event.files,
            jobs: python_event.jobs,
        };


        app.emit(
            "processing-event",
            event,
        )
        .map_err(|error| {
            format!(
                "Could not emit processing event: {error}"
            )
        })?;
    }


    let status = child
        .wait()
        .map_err(|error| {
            format!(
                "Python processing backend failed: {error}"
            )
        })?;


    let stderr_output = stderr_thread
        .join()
        .unwrap_or_else(|_| {
            "Failed to read Python stderr."
                .to_string()
        });


    if !status.success() {
        if stderr_output.trim().is_empty() {
            return Err(
                format!(
                    "Python processing backend exited with status {status}."
                ),
            );
        }

        return Err(
            format!(
                "Python processing backend failed: {}",
                stderr_output.trim(),
            ),
        );
    }


    let python_result = final_result.ok_or(
        "Python processing backend finished without returning a final result.",
    )?;


    Ok(ProcessResult {
        success: python_result.success,
        processed_files:
            python_result.processed_files,
        jobs: python_result.jobs,
        error: python_result.error,
    })
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

    let payload = serde_json::to_string(&request).map_err(|error| error.to_string())?;

    let output = run_python_command("login", &payload)?;

    let python_result = serde_json::from_slice::<PythonLoginResult>(&output)
        .map_err(|error| format!("Invalid response from Python backend: {error}"))?;

    if python_result.success {
        let token = python_result
            .token
            .clone()
            .ok_or("Successful login did not return an authentication token.")?;

        let mut auth = state
            .auth
            .lock()
            .map_err(|_| "Failed to access authentication state.")?;

        *auth = Some(AuthState { server_url, token });
    }

    Ok(LoginResult {
        success: python_result.success,
        username: python_result.username,
        error: python_result.error,
    })
}

#[tauri::command]
fn get_spaces(state: tauri::State<AppState>) -> Result<SpacesResult, String> {
    let auth = {
        let stored_auth = state
            .auth
            .lock()
            .map_err(|_| "Failed to access authentication state.")?;

        stored_auth.clone().ok_or("Not authenticated.")?
    };

    let payload = serde_json::to_string(&auth).map_err(|error| error.to_string())?;

    let output = run_python_command("spaces", &payload)?;

    serde_json::from_slice::<SpacesResult>(&output)
        .map_err(|error| format!("Invalid response from Python backend: {error}"))
}

#[tauri::command]
fn get_projects(state: tauri::State<AppState>, space: String) -> Result<ProjectsResult, String> {
    let auth = {
        let stored_auth = state
            .auth
            .lock()
            .map_err(|_| "Failed to access authentication state.")?;

        stored_auth.clone().ok_or("Not authenticated.")?
    };

    let request = ProjectsRequest {
        server_url: auth.server_url,
        token: auth.token,
        space,
    };

    let payload = serde_json::to_string(&request).map_err(|error| error.to_string())?;

    let output = run_python_command("projects", &payload)?;

    serde_json::from_slice::<ProjectsResult>(&output)
        .map_err(|error| format!("Invalid response from Python backend: {error}"))
}

#[tauri::command]
fn get_collections(
    state: tauri::State<AppState>,
    space: String,
    project: String,
) -> Result<CollectionsResult, String> {
    let auth = {
        let stored_auth = state
            .auth
            .lock()
            .map_err(|_| "Failed to access authentication state.")?;

        stored_auth.clone().ok_or("Not authenticated.")?
    };

    let request = CollectionsRequest {
        server_url: auth.server_url,
        token: auth.token,
        space,
        project,
    };

    let payload = serde_json::to_string(&request).map_err(|error| error.to_string())?;

    let output = run_python_command("collections", &payload)?;

    serde_json::from_slice::<CollectionsResult>(&output)
        .map_err(|error| format!("Invalid response from Python backend: {error}"))
}

#[tauri::command]
fn get_parsers() -> Result<ParsersResult, String> {
    let output =
        run_python_command(
            "parsers",
            "",
        )?;

    serde_json::from_slice::<ParsersResult>(&output)
        .map_err(|error| {
            format!(
                "Invalid response from Python backend: {error}"
            )
        })
}

#[tauri::command]
fn save_processing_logs(
    path: String,
    content: String,
) -> Result<(), String> {
    std::fs::write(
        &path,
        content,
    )
    .map_err(|error| {
        format!(
            "Failed to save processing logs to '{path}': {error}"
        )
    })
}

#[tauri::command]
fn process_sources(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    space: String,
    project: String,
    collection: String,
    jobs: Vec<ProcessingJob>,
) -> Result<ProcessResult, String> {
    {
        let mut processing = state
            .processing
            .lock()
            .map_err(|_| {
                "Failed to access processing state."
            })?;

        if *processing {
            return Err(
                "A processing operation is already running."
                    .to_string(),
            );
        }

        *processing = true;
    }


    /*
     * Everything capable of failing after acquiring
     * the processing flag goes inside this closure.
     *
     * This ensures the flag gets reset afterward.
     */
    let result = (|| {
        let auth = {
            let stored_auth = state
                .auth
                .lock()
                .map_err(|_| {
                    "Failed to access authentication state."
                })?;

            stored_auth
                .clone()
                .ok_or(
                    "Not authenticated.",
                )?
        };


        let python_jobs =
            jobs
                .into_iter()
                .map(
                    |job| {
                        PythonProcessingJob {
                            parser_id:
                                job.parser_id,

                            assignment_path:
                                job.assignment_path,

                            paths:
                                job.paths,
                        }
                    },
                )
                .collect();


        let request =
            PythonProcessRequest {
                server_url:
                    auth.server_url,

                token:
                    auth.token,

                space,
                project,
                collection,

                jobs:
                    python_jobs,
            };


        let payload =
            serde_json::to_string(
                &request,
            )
            .map_err(
                |error| {
                    error.to_string()
                },
            )?;


        run_processing_command(
            &app,
            &payload,
        )
    })();


    /*
     * Always release the processing lock.
     */
    {
        let mut processing = state
            .processing
            .lock()
            .map_err(|_| {
                "Failed to access processing state."
            })?;

        *processing = false;
    }


    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            auth: Mutex::new(None),
            processing: Mutex::new(false),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            login,
            get_spaces,
            get_projects,
            get_collections,
            get_parsers,
            process_sources,
            save_processing_logs,
            source::scan_sources,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}