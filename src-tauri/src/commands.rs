use serde::{Deserialize, Serialize};
use tauri::{State, Emitter, Window};
use std::sync::Arc;
use tokio::sync::Mutex;
#[tauri::command]
pub async fn save_temp_file(
    data: Vec<u8>,
    path: String,
) -> Result<bool, String> {
    tokio::fs::write(&path, data)
        .await
        .map_err(|e| e.to_string())?;
    Ok(true)
}

use crate::moark::{ChatMessage, ChatRequest, MoarkClient, models::{VoiceCloneRequest, AsyncTask}};

pub struct AppState {
    pub moark_client: Arc<Mutex<Option<MoarkClient>>>,
    pub project_path: Arc<Mutex<Option<String>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatParams {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub id: String,
    pub content: String,
    pub model: String,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Serialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[tauri::command]
pub async fn set_api_token(
    api_token: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let client = MoarkClient::new(api_token);
    let mut guard = state.moark_client.lock().await;
    *guard = Some(client);
    Ok(true)
}

#[tauri::command]
pub async fn chat(
    window: Window,
    params: ChatParams,
    state: State<'_, AppState>,
) -> Result<ChatResponse, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    let mut request = ChatRequest::new(params.model.clone(), params.messages);
    
    if let Some(temp) = params.temperature {
        request = request.with_temperature(temp);
    }
    if let Some(max) = params.max_tokens {
        request = request.with_max_tokens(max);
    }
    if let Some(stream) = params.stream {
        request = request.with_stream(stream);
    }

    if params.stream == Some(true) {
        let stream = client.chat_completions_stream(&request)
            .await
            .map_err(|e| e.to_string())?;

        use futures_util::StreamExt;
        let mut stream = stream;
        let mut content = String::new();

        while let Some(result) = stream.next().await {
            match result {
                Ok(value) => {
                    if let Some(text) = value.get("choices")
                        .and_then(|c| c.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|c| c.as_str())
                    {
                        content.push_str(text);
                        let _ = window.emit("chat-stream", serde_json::json!({
                            "content": text,
                            "done": false
                        }));
                    }
                    
                    if let Some(reason) = value.get("choices")
                        .and_then(|c| c.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|c| c.get("finish_reason"))
                        .and_then(|f| f.as_str())
                    {
                        if reason == "stop" {
                            let _ = window.emit("chat-stream", serde_json::json!({
                                "content": "",
                                "done": true
                            }));
                        }
                    }
                }
                Err(e) => {
                    let err_msg = format!("{:?}", e);
                    let _ = window.emit("chat-stream", serde_json::json!({
                        "error": err_msg,
                        "done": true
                    }));
                    return Err(err_msg);
                }
            }
        }

        return Ok(ChatResponse {
            id: format!("stream-{}", chrono::Utc::now().timestamp()),
            content,
            model: params.model,
            usage: None,
        });
    }

    let response = client.chat_completions(&request)
        .await
        .map_err(|e| e.to_string())?;

    let content = response.choices[0]
        .message
        .as_ref()
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let usage = response.usage.map(|u| UsageInfo {
        prompt_tokens: u.prompt_tokens,
        completion_tokens: u.completion_tokens,
        total_tokens: u.total_tokens,
    });

    Ok(ChatResponse {
        id: response.id,
        content,
        model: response.model,
        usage,
    })
}

#[tauri::command]
pub async fn test_connection(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    client.test_connection()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_connection_status(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let guard = state.moark_client.lock().await;
    Ok(guard.is_some())
}

#[tauri::command]
pub async fn set_project_path(
    path: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let mut guard = state.project_path.lock().await;
    *guard = Some(path);
    Ok(true)
}

#[tauri::command]
pub async fn get_project_path(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let guard = state.project_path.lock().await;
    Ok(guard.clone())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceFeatureParams {
    pub file_path: String,
    pub model: String,
    pub prompt_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceCloneParams {
    pub model: String,
    pub input: String,
    pub voice_url: String,
    pub prompt_text: Option<String>,
}

#[tauri::command]
pub async fn extract_voice_feature(
    params: VoiceFeatureParams,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    client.extract_voice_feature(&params.file_path, &params.model, &params.prompt_text)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_voice_clone(
    window: Window,
    params: VoiceCloneParams,
    state: State<'_, AppState>,
) -> Result<AsyncTask, String> {
    let (client, project_path, api_token, base_url) = {
        let guard = state.moark_client.lock().await;
        let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;
        
        let api_token = client.api_token.clone();
        let base_url = client.base_url.clone();
        
        let project_path = {
            let path_guard = state.project_path.lock().await;
            path_guard.clone()
        };
        
        (Some(client.clone()), project_path, api_token, base_url)
    };

    let request = VoiceCloneRequest {
        model: params.model.clone(),
        input: params.input.clone(),
        voice_url: Some(params.voice_url.clone()),
        prompt_text: params.prompt_text.clone(),
    };

    let client_for_clone = client.as_ref().ok_or("Failed to create client")?;
    let task = client_for_clone.voice_clone(&request).await.map_err(|e| e.to_string())?;

    let task_id = task.task_id.clone();
    let window_clone = window.clone();

    tokio::spawn(async move {
        let poll_client = MoarkClient::new(api_token).with_base_url(base_url);
        
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            
            let check_result = poll_client.get_async_task(&task_id).await;
            
            match check_result {
                Ok(task_result) => {
                    let status = task_result.status.clone();
                    let _ = window_clone.emit("voice-clone-progress", serde_json::json!({
                        "task_id": task_id,
                        "status": status,
                        "output": task_result.output
                    }));

                    if status == "succeeded" || status == "failed" {
                        if let Some(path) = project_path {
                            if let Some(output) = &task_result.output {
                                if let Some(url) = output.get("url").and_then(|u| u.as_str()) {
                                    let output_path = format!("{}/voice_clone_{}.wav", path, task_id);
                                    if let Err(e) = poll_client.download_file(url, &output_path).await {
                                        let _ = window_clone.emit("voice-clone-error", serde_json::json!({
                                            "task_id": task_id,
                                            "error": format!("Failed to download: {}", e)
                                        }));
                                    } else {
                                        let _ = window_clone.emit("voice-clone-complete", serde_json::json!({
                                            "task_id": task_id,
                                            "output_path": output_path
                                        }));
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
                Err(e) => {
                    let _ = window_clone.emit("voice-clone-error", serde_json::json!({
                        "task_id": task_id,
                        "error": e.to_string()
                    }));
                    break;
                }
            }
        }
    });

    Ok(task)
}