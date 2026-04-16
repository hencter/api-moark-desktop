use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::moark::{ChatMessage, ChatRequest, MoarkClient};

pub struct AppState {
    pub moark_client: Arc<Mutex<Option<MoarkClient>>>,
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
    params: ChatParams,
    state: State<'_, AppState>,
) -> Result<ChatResponse, String> {
    let guard = state.moark_client.lock().await;
    let client = guard.as_ref().ok_or("API token not set. Please set API token first.")?;

    let mut request = ChatRequest::new(params.model, params.messages);
    
    if let Some(temp) = params.temperature {
        request = request.with_temperature(temp);
    }
    if let Some(max) = params.max_tokens {
        request = request.with_max_tokens(max);
    }
    if let Some(stream) = params.stream {
        request = request.with_stream(stream);
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