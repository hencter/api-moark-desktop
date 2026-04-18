use std::pin::Pin;
use std::path::Path;
use std::io::Error as IoError;
use reqwest::Client;
use serde_json::Value;
use thiserror::Error;
use futures_util::StreamExt;

use super::models::{ChatRequest, ChatResponse, ImageRequest, ImageResponse, AsyncTask, VoiceCloneRequest, TtsRequest, WebSearchRequest, WebSearchResponse, ModelsList};

pub const BASE_URL: &str = "https://ai.gitee.com/v1";

#[derive(Error, Debug)]
pub enum MoarkError {
    #[error("Request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("IO error: {0}")]
    IoError(#[from] IoError),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[allow(dead_code)]
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Rate limit error")]
    RateLimitError,
    #[error("API error: {0}")]
    ApiError(String),
}

pub type Result<T> = std::result::Result<T, MoarkError>;

#[derive(Clone)]
pub struct MoarkClient {
    client: Client,
    pub base_url: String,
    pub api_token: String,
}

impl MoarkClient {
    pub fn new(api_token: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: BASE_URL.to_string(),
            api_token: api_token.into(),
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = base_url.into();
        self
    }

    #[allow(dead_code)]
    pub fn with_api_token(mut self, api_token: impl Into<String>) -> Self {
        self.api_token = api_token.into();
        self
    }

    pub async fn chat_completions(&self, request: &ChatRequest) -> Result<ChatResponse> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(MoarkError::RateLimitError);
        }

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn chat_completions_stream(
        &self,
        request: &ChatRequest,
    ) -> Result<Pin<Box<dyn futures_util::Stream<Item = std::result::Result<Value, MoarkError>> + Send>>> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let byte_stream = response.bytes_stream();
        
        let stream = async_stream::stream! {
            let mut stream = byte_stream;
            
            while let Some(chunk) = stream.next().await {
                match chunk {
                    Ok(bytes) => {
                        if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                            for line in text.lines() {
                                let line = line.trim();
                                if line.starts_with("data: ") {
                                    let data = line.strip_prefix("data: ").unwrap_or("");
                                    if data == "[DONE]" {
                                        continue;
                                    }
                                    if let Ok(value) = serde_json::from_str::<Value>(data) {
                                        yield Ok(value);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        yield Err(MoarkError::RequestError(e));
                    }
                }
            }
        };

        Ok(Box::pin(stream) as Pin<Box<dyn futures_util::Stream<Item = std::result::Result<Value, MoarkError>> + Send>>)
    }

    #[allow(dead_code)]
    pub async fn image_generations(&self, request: &ImageRequest) -> Result<ImageResponse> {
        let url = format!("{}/images/generations", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn test_connection(&self) -> Result<String> {
        let request = ChatRequest::new(
            "Qwen2.5-14B-Instruct",
            vec![super::models::ChatMessage {
                role: "user".to_string(),
                content: "你好".to_string(),
            }],
        )
        .with_max_tokens(10);

        let response = self.chat_completions(&request).await?;
        
        Ok(response.choices[0]
            .message
            .as_ref()
            .map(|m| m.content.clone())
            .unwrap_or_default())
    }

    pub async fn extract_voice_feature(&self, file_path: &str, model: &str, prompt_text: &str) -> Result<Vec<u8>> {
        let url = format!("{}/audio/voice-feature-extraction", self.base_url);
        
        let _file_name = Path::new(file_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("audio.wav");

        let part = match reqwest::multipart::Part::file(file_path).await {
            Ok(p) => p,
            Err(e) => return Err(MoarkError::IoError(e)),
        };

        let form = reqwest::multipart::Form::new()
            .text("model", model.to_string())
            .text("prompt_text", prompt_text.to_string())
            .part("file", part);

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .multipart(form)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let bytes = response.bytes().await?.to_vec();
        Ok(bytes)
    }

    pub async fn ping(&self) -> Result<String> {
        let url = format!("{}/", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(MoarkError::ApiError(format!("Ping failed: {}", response.status())));
        }

        let text = response.text().await?;
        if text == "Ready!" {
            Ok(text)
        } else {
            Err(MoarkError::ApiError(format!("Unexpected ping response: {}", text)))
        }
    }

    pub async fn list_models(&self) -> Result<ModelsList> {
        let url = format!("{}/models", self.base_url);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn get_async_task(&self, task_id: &str) -> Result<AsyncTask> {
        let url = format!("{}/task/{}", self.base_url, task_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn voice_clone(&self, request: &VoiceCloneRequest) -> Result<AsyncTask> {
        let url = format!("{}/async/audio/speech", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn text_to_speech(&self, request: &TtsRequest) -> Result<AsyncTask> {
        let url = format!("{}/async/audio/speech", self.base_url);
        
        let mut payload_map: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
        payload_map.insert("model".to_string(), serde_json::Value::String(request.model.clone()));
        payload_map.insert("inputs".to_string(), serde_json::Value::String(request.inputs.clone()));
        
        if request.prompt_text.is_some() {
            payload_map.insert("prompt_text".to_string(), serde_json::Value::String(request.prompt_text.clone().unwrap()));
        }
        if request.prompt_audio_url.is_some() {
            payload_map.insert("prompt_audio_url".to_string(), serde_json::Value::String(request.prompt_audio_url.clone().unwrap()));
        }
        
        eprintln!("[DEBUG] TTS URL: {}", url);
        eprintln!("[DEBUG] TTS payload: {}", serde_json::Value::Object(payload_map.clone()));
        
        let payload = serde_json::Value::Object(payload_map);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("X-Failover-Enabled", "true")
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        eprintln!("[DEBUG] TTS response status: {}", response.status());
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn web_search(&self, request: &WebSearchRequest) -> Result<WebSearchResponse> {
        let url = format!("{}/web-search", self.base_url);
        
        let query = request.query.clone();
        let summary = request.summary.unwrap_or(true);
        let freshness = request.freshness.clone().unwrap_or_else(|| "noLimit".to_string());
        let count = request.count.unwrap_or(8);
        
        let payload = serde_json::json!({
            "query": query,
            "summary": summary,
            "freshness": freshness,
            "count": count,
        });
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .header("X-Failover-Enabled", "true")
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn get_task_status(&self, task_id: &str) -> Result<AsyncTask> {
        let url = format!("{}/task/{}", self.base_url, task_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        let result: Value = response.json().await?;
        
        serde_json::from_value(result)
            .map_err(|e| MoarkError::ParseError(e.to_string()))
    }

    pub async fn cancel_task(&self, task_id: &str) -> Result<()> {
        let url = format!("{}/task/{}/cancel", self.base_url, task_id);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        Ok(())
    }

    pub async fn download_file(&self, url: &str, output_path: &str) -> Result<()> {
        let response = self.client
            .get(url)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(MoarkError::ApiError(format!("Download failed: Status {}", status)));
        }

        let bytes = response.bytes().await?;
        
        tokio::fs::write(output_path, bytes).await
            .map_err(|e| MoarkError::ApiError(format!("Failed to write file: {}", e)))?;

        Ok(())
    }
}