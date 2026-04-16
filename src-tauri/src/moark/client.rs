use std::pin::Pin;
use reqwest::Client;
use serde_json::Value;
use thiserror::Error;

use super::models::{ChatRequest, ChatResponse, ImageRequest, ImageResponse};

pub const BASE_URL: &str = "https://ai.gitee.com/v1";

#[derive(Error, Debug)]
pub enum MoarkError {
    #[error("Request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Rate limit error")]
    RateLimitError,
    #[error("API error: {0}")]
    ApiError(String),
}

pub type Result<T> = std::result::Result<T, MoarkError>;

pub struct MoarkClient {
    client: Client,
    base_url: String,
    api_token: String,
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

#[cfg(feature = "stream")]
    pub async fn chat_completions_stream(
        &self,
        request: &ChatRequest,
    ) -> Result<tokio_stream::StreamItem<'static, Result<Value, MoarkError>>> {
        use futures_util::StreamExt;
        
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
        
        let stream = tokio_stream::iter(byte_stream.map(|chunk| {
            match chunk {
                Ok(bytes) => {
                    if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                        let mut buffer = text;
                        while let Some(newline_pos) = buffer.find('\n') {
                            let line = buffer.drain(..newline_pos + 1).collect::<String>();
                            let line = line.trim();
                            
                            if line.starts_with("data: ") {
                                let data = line.strip_prefix("data: ").unwrap_or("");
                                
                                if data == "[DONE]" {
                                    continue;
                                }
                                
                                if let Ok(value) = serde_json::from_str::<Value>(data) {
                                    return Some(Ok(value));
                                }
                            }
                        }
                    }
                    None
                }
                Err(e) => Some(Err(MoarkError::RequestError(e))),
            }
        }).filter_map(|x| x));

        Ok(stream)
    }

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
            "Qwen2.5-0.5-Instruct",
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
}