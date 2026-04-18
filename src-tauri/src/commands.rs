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

use crate::moark::{ChatMessage, ChatRequest, MoarkClient, ModelsList, models::{VoiceCloneRequest, AsyncTask, TtsRequest, WebSearchRequest, WebSearchResponse}};

pub struct AppState {
    pub moark_client: Arc<Mutex<Option<MoarkClient>>>,
    pub project_path: Arc<Mutex<Option<String>>>,
    pub api_token: Arc<Mutex<Option<String>>>,
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
pub async fn ping(state: State<'_, AppState>) -> Result<String, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;
    
    client.ping().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<ModelsList, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;
    
    client.list_models().await.map_err(|e| e.to_string())
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

#[tauri::command]
pub async fn set_global_api_token(
    api_token: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // 保存到内存
    let mut guard = state.api_token.lock().await;
    *guard = Some(api_token.clone());
    
    let client = MoarkClient::new(api_token.clone());
    let mut moark_guard = state.moark_client.lock().await;
    *moark_guard = Some(client);
    
    // 持久化保存到文件
    let config_path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("moark-desktop");
    std::fs::create_dir_all(&config_path).ok();
    let config_file = config_path.join("api_token.txt");
    std::fs::write(&config_file, &api_token).ok();
    
    Ok(true)
}

#[tauri::command]
pub async fn get_global_api_token(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    // 先从内存获取
    {
        let guard = state.api_token.lock().await;
        if guard.is_some() {
            return Ok(guard.clone());
        }
    }
    
    // 内存没有，从文件加载
    let config_path = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("moark-desktop")
        .join("api_token.txt");
    
    if config_path.exists() {
        if let Ok(token) = std::fs::read_to_string(&config_path) {
            let token = token.trim().to_string();
            if !token.is_empty() {
                // 存到内存
                let mut guard = state.api_token.lock().await;
                *guard = Some(token.clone());
                let client = MoarkClient::new(token.clone());
                let mut moark_guard = state.moark_client.lock().await;
                *moark_guard = Some(client);
                return Ok(Some(token));
            }
        }
    }
    
    let guard = state.api_token.lock().await;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct TtsParams {
    pub model: String,
    pub input: Option<String>,
    pub inputs: Option<String>,
    pub prompt_text: Option<String>,
    pub prompt_audio_url: Option<String>,
    pub prompt_language: Option<String>,
    pub intelligibility_weight: Option<f32>,
    pub similarity_weight: Option<f32>,
    pub gender: Option<String>,
    pub pitch: Option<i32>,
    pub speed: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSearchParams {
    pub query: String,
    pub summary: Option<bool>,
    pub freshness: Option<String>,
    pub count: Option<u32>,
}

#[tauri::command]
pub async fn web_search(
    params: WebSearchParams,
    state: State<'_, AppState>,
) -> Result<WebSearchResponse, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    let request = WebSearchRequest {
        query: params.query,
        summary: params.summary,
        freshness: params.freshness,
        count: params.count,
    };

    client.web_search(&request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_status(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<AsyncTask, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    client.get_task_status(&task_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    client.cancel_task(&task_id)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(true)
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

#[tauri::command]
pub async fn text_to_speech(
    window: Window,
    params: TtsParams,
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

    // Use input if provided, otherwise use inputs
    let text = params.inputs.clone().or(params.input.clone()).unwrap_or_default();
    let mut request = TtsRequest::new(params.model.clone(), text);
    
    if let Some(pt) = params.prompt_text.clone() {
        request = request.with_prompt_text(pt);
    }
    if let Some(pau) = params.prompt_audio_url.clone() {
        request = request.with_prompt_audio_url(pau);
    }
    if let Some(g) = params.gender.clone() {
        request = request.with_gender(g);
    }
    if let Some(p) = params.pitch {
        request = request.with_pitch(p);
    }
    if let Some(s) = params.speed {
        request = request.with_speed(s);
    }

let client_for_tts = client.as_ref().ok_or("Failed to create client")?;
    let task = client_for_tts.text_to_speech(&request).await.map_err(|e| e.to_string())?;
    
    let task_id = task.task_id.clone();
    eprintln!("[DEBUG] TTS task_id: {}", task_id);
    
    // If status is "completed", it's a sync response - download directly
    if task.status == "completed" {
        if let Some(output) = &task.output {
            if let Some(url) = output.get("url").and_then(|u| u.as_str()) {
                if let Some(path) = project_path {
                    let output_path = format!("{}/tts_{}.wav", path, task_id);
                    if let Err(e) = client_for_tts.download_file(url, &output_path).await {
                        return Err(format!("Failed to download: {}", e));
                    }
                    let _ = window.emit("tts-complete", serde_json::json!({
                        "output_path": output_path
                    }));
                }
            }
        }
        return Ok(task);
    }

    let window_clone = window.clone();

    tokio::spawn(async move {
        let poll_client = MoarkClient::new(api_token).with_base_url(base_url);
        
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            
            let check_result = poll_client.get_async_task(&task_id).await;
            
            match check_result {
                Ok(task_result) => {
                    let status = task_result.status.clone();
                    eprintln!("[DEBUG] TTS task status: {}", status);
                    let _ = window_clone.emit("tts-progress", serde_json::json!({
                        "task_id": task_id,
                        "status": status,
                        "output": task_result.output
                    }));

                    if status == "success" {
                        if let Some(path) = project_path {
                            if let Some(output) = &task_result.output {
                                if let Some(url) = output.get("file_url").and_then(|u| u.as_str()) {
                                    let output_path = format!("{}/tts_{}.wav", path, task_id);
                                    if let Err(e) = poll_client.download_file(url, &output_path).await {
                                        let _ = window_clone.emit("tts-error", serde_json::json!({
                                            "error": format!("Failed to download: {}", e)
                                        }));
                                    } else {
                                        eprintln!("[DEBUG] TTS saved to: {}", output_path);
                                        let _ = window_clone.emit("tts-complete", serde_json::json!({
                                            "output_path": output_path
                                        }));
                                    }
                                }
                            }
                        }
                        break;
                    } else if status == "failed" {
                        let _ = window_clone.emit("tts-error", serde_json::json!({
                            "error": "Task failed"
                        }));
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("[DEBUG] TTS poll error: {}", e);
                    let _ = window_clone.emit("tts-error", serde_json::json!({
                        "error": e.to_string()
                    }));
                    break;
                }
            }
        }
    });

    Ok(task)
}