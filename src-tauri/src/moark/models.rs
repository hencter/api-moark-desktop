use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(rename = "content")]
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(rename = "stream")]
    pub stream: Option<bool>,
    #[serde(rename = "temperature")]
    pub temperature: Option<f32>,
    #[serde(rename = "top_p")]
    pub top_p: Option<f32>,
    #[serde(rename = "max_tokens")]
    pub max_tokens: Option<u32>,
    #[serde(rename = "frequency_penalty")]
    pub frequency_penalty: Option<f32>,
    #[serde(rename = "presence_penalty")]
    pub presence_penalty: Option<f32>,
}

impl ChatRequest {
    pub fn new(model: impl Into<String>, messages: Vec<ChatMessage>) -> Self {
        Self {
            model: model.into(),
            messages,
            stream: None,
            temperature: None,
            top_p: None,
            max_tokens: None,
            frequency_penalty: None,
            presence_penalty: None,
        }
    }

    pub fn with_stream(mut self, stream: bool) -> Self {
        self.stream = Some(stream);
        self
    }

    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = Some(temperature);
        self
    }

    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub index: u32,
    #[serde(rename = "message")]
    pub message: Option<ChatMessage>,
    #[serde(rename = "delta")]
    pub delta: Option<ChatMessage>,
    #[serde(rename = "finish_reason")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    #[serde(rename = "object")]
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChoice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    #[serde(rename = "prompt_tokens")]
    pub prompt_tokens: u32,
    #[serde(rename = "completion_tokens")]
    pub completion_tokens: u32,
    #[serde(rename = "total_tokens")]
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChoice {
    pub index: u32,
    #[serde(rename = "delta")]
    pub delta: ChatMessage,
    #[serde(rename = "finish_reason")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub id: String,
    #[serde(rename = "object")]
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<StreamChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageRequest {
    pub prompt: String,
    pub model: String,
    #[serde(rename = "n")]
    pub n: Option<u32>,
    pub size: Option<String>,
    #[serde(rename = "response_format")]
    pub response_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResponse {
    pub created: u64,
    pub data: Vec<ImageData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageData {
    #[serde(rename = "url")]
    pub url: Option<String>,
    #[serde(rename = "b64_json")]
    pub b64_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceFeatureRequest {
    pub model: String,
    pub prompt_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceFeatureResponse {
    pub voice_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsyncTask {
    #[serde(rename = "task_id")]
    pub task_id: String,
    pub status: String,
    #[serde(rename = "created_at")]
    pub created_at: Option<String>,
    #[serde(rename = "started_at")]
    pub started_at: Option<String>,
    #[serde(rename = "completed_at")]
    pub completed_at: Option<String>,
    pub output: Option<Value>,
    pub urls: Option<AsyncTaskUrls>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsyncTaskUrls {
    pub get: Option<String>,
    pub cancel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceCloneRequest {
    pub model: String,
    pub input: String,
    #[serde(rename = "voice_url")]
    pub voice_url: Option<String>,
    #[serde(rename = "prompt_text")]
    pub prompt_text: Option<String>,
}
