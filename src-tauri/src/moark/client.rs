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

    /// 文本转语音 API
/// 
/// ai.gitee.com 有两种 TTS 端点:
/// 1. 异步端点 /v1/async/audio/speech - 用于 IndexTTS-2, Spark-TTS 等模型
/// 2. 同步端点 /v1/audio/speech - 用于 MegaTTS3 等模型
/// 
/// 区别:
/// - 异步: 返回 task_id, 需要轮询获取结果
/// - 同步: 直接返回音频 URL
/// 
/// 字段区别:
/// - 异步用 "inputs" (复数)
/// - 同步用 "input" (单数)
/// 
/// 文档示例 (异步):
/// {
///   "model": "IndexTTS-2",
///   "inputs": "要转换的文本",
///   "prompt_text": "",
///   "prompt_audio_url": "",
///   "gender": "",
///   "pitch": 1,
///   "speed": 1
/// }
pub async fn text_to_speech(&self, request: &TtsRequest) -> Result<AsyncTask> {
        // ===== 1. 根据模型名称判断用哪个端点 =====
        // 异步模型列表 (这些只能用异步端点)
        let async_models = ["indextts-2", "spark-tts", "audiofly", "qwen3-tts", "cosyvoice3"];
        let model_lower = request.model.to_lowercase();
        // 检查模型名是否包含异步模型名称
        let is_async = async_models.iter().any(|m| model_lower.contains(m));
        
        // 构建 URL
        // 如果是异步模型: https://ai.gitee.com/v1/async/audio/speech
        // 如果是同步模型: https://ai.gitee.com/v1/audio/speech
        let (url, use_sync) = if is_async {
            (format!("{}/async/audio/speech", self.base_url), false)
        } else {
            (format!("{}/audio/speech", self.base_url), true)
        };
        
        // ===== 2. 构建请求体 =====
        let mut payload_map: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
        
        // model 字段 - 模型名称
        payload_map.insert("model".to_string(), serde_json::Value::String(request.model.clone()));
        
        // text 字段 - 要转换的文本
        // 优先用 inputs，没有就用 input
        let text = request.inputs.clone()
            .or(request.input.clone())
            .unwrap_or_default();
        
        // 根据端点选择正确的字段名
        if use_sync {
            // 同步端点用 "input" (单数)
            payload_map.insert("input".to_string(), serde_json::Value::String(text));
        } else {
            // 异步端点用 "inputs" (复数)
            payload_map.insert("inputs".to_string(), serde_json::Value::String(text));
        }
        
        // ===== 3. 可选字段 - 文档示例显示这些字段必须传 (即使是空字符串) =====
        // 参考文档: https://ai.gitee.com/docs/products/apis/audio-tts-async
        
        // prompt_text - 文本提示,指导语音风格/内容
        payload_map.insert("prompt_text".to_string(), 
            serde_json::Value::String(request.prompt_text.clone().unwrap_or_default()));
        
        // prompt_audio_url - 音频提示URL,指导语音风格/语调
        payload_map.insert("prompt_audio_url".to_string(), 
            serde_json::Value::String(request.prompt_audio_url.clone().unwrap_or_default()));
        
        // gender - 性别 (male/female)
        payload_map.insert("gender".to_string(), 
            serde_json::Value::String(request.gender.clone().unwrap_or_default()));
        
        // pitch - 音调,默认1
        payload_map.insert("pitch".to_string(), 
            serde_json::Value::Number(request.pitch.unwrap_or(1).into()));
        
        // speed - 语速,默认1
        payload_map.insert("speed".to_string(), 
            serde_json::Value::Number(request.speed.unwrap_or(1).into()));
        if let Some(ref pl) = request.prompt_language {
            if !pl.is_empty() {
                payload_map.insert("prompt_language".to_string(), serde_json::Value::String(pl.clone()));
            }
        }
        if let Some(iw) = request.intelligibility_weight {
            payload_map.insert("intelligibility_weight".to_string(), serde_json::json!(iw));
        }
        if let Some(sw) = request.similarity_weight {
            payload_map.insert("similarity_weight".to_string(), serde_json::json!(sw));
        }
        
        let payload = serde_json::Value::Object(payload_map);
        
        // 调试日志
        eprintln!("[DEBUG] TTS URL: {}", url);
        eprintln!("[DEBUG] TTS model: {}", request.model);
        eprintln!("[DEBUG] TTS is_async: {}", is_async);
        eprintln!("[DEBUG] TTS use_sync: {}", use_sync);
        eprintln!("[DEBUG] TTS payload: {}", payload);
        eprintln!("[DEBUG] TTS api_token first 10 chars: {}", &self.api_token[..10.min(self.api_token.len())]);
        
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
            eprintln!("[DEBUG] TTS error body: {}", error_text);
            return Err(MoarkError::ApiError(format!("Status: {}, Error: {}", status, error_text)));
        }

        if use_sync {
            // For sync endpoint, wrap result in AsyncTask-like format
            let result: serde_json::Value = response.json().await?;
            let task_id = format!("sync_{}", chrono::Utc::now().timestamp_millis());
            Ok(AsyncTask {
                task_id,
                status: "completed".to_string(),
                created_at: None,
                started_at: None,
                completed_at: None,
                output: Some(result),
                urls: None,
            })
        } else {
            let result: AsyncTask = response.json().await?;
            Ok(result)
        }
    }

    #[allow(dead_code)]
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