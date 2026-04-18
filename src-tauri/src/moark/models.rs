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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChoice {
    pub index: u32,
    #[serde(rename = "delta")]
    pub delta: ChatMessage,
    #[serde(rename = "finish_reason")]
    pub finish_reason: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub id: String,
    #[serde(rename = "object")]
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<StreamChoice>,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResponse {
    pub created: u64,
    pub data: Vec<ImageData>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageData {
    #[serde(rename = "url")]
    pub url: Option<String>,
    #[serde(rename = "b64_json")]
    pub b64_json: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceFeatureRequest {
    pub model: String,
    pub prompt_text: String,
}

#[allow(dead_code)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchRequest {
    pub query: String,
    pub summary: Option<bool>,
    pub freshness: Option<String>,
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchResponse {
    pub code: u32,
    pub msg: Option<String>,
    pub data: Option<WebSearchData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchData {
    #[serde(rename = "_type")]
    pub type_field: Option<String>,
    #[serde(rename = "queryContext")]
    pub query_context: Option<QueryContext>,
    pub web_pages: Option<WebPages>,
    pub images: Option<SearchImages>,
    pub videos: Option<SearchVideos>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryContext {
    #[serde(rename = "originalQuery")]
    pub original_query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebPages {
    #[serde(rename = "webSearchUrl")]
    pub web_search_url: Option<String>,
    #[serde(rename = "totalEstimatedMatches")]
    pub total_estimated_matches: Option<u64>,
    pub value: Vec<WebPageResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebPageResult {
    pub id: Option<String>,
    pub name: Option<String>,
    pub url: Option<String>,
    #[serde(rename = "displayUrl")]
    pub display_url: Option<String>,
    pub snippet: Option<String>,
    pub summary: Option<String>,
    #[serde(rename = "siteName")]
    pub site_name: Option<String>,
    #[serde(rename = "siteIcon")]
    pub site_icon: Option<String>,
    #[serde(rename = "datePublished")]
    pub date_published: Option<String>,
    #[serde(rename = "dateLastCrawled")]
    pub date_last_crawled: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchImages {
    #[serde(rename = "webSearchUrl")]
    pub web_search_url: Option<String>,
    pub value: Vec<SearchImageResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchImageResult {
    pub name: Option<String>,
    #[serde(rename = "thumbnailUrl")]
    pub thumbnail_url: Option<String>,
    #[serde(rename = "contentUrl")]
    pub content_url: Option<String>,
    #[serde(rename = "hostPageUrl")]
    pub host_page_url: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchVideos {
    #[serde(rename = "webSearchUrl")]
    pub web_search_url: Option<String>,
    pub value: Vec<SearchVideoResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchVideoResult {
    pub name: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "thumbnailUrl")]
    pub thumbnail_url: Option<String>,
    #[serde(rename = "contentUrl")]
    pub content_url: Option<String>,
    #[serde(rename = "hostPageUrl")]
    pub host_page_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest {
    pub model: String,
    #[serde(rename = "input")]
    pub input: String,
    #[serde(rename = "prompt_text")]
    pub prompt_text: Option<String>,
    #[serde(rename = "prompt_audio_url")]
    pub prompt_audio_url: Option<String>,
    #[serde(rename = "emo_audio_prompt_url")]
    pub emo_audio_prompt_url: Option<String>,
    pub emo_alpha: Option<f32>,
    pub gender: Option<String>,
    pub pitch: Option<i32>,
    pub speed: Option<i32>,
}

impl TtsRequest {
    pub fn new(model: impl Into<String>, input: impl Into<String>) -> Self {
        Self {
            model: model.into(),
            input: input.into(),
            prompt_text: None,
            prompt_audio_url: None,
            emo_audio_prompt_url: None,
            emo_alpha: None,
            gender: None,
            pitch: None,
            speed: None,
        }
    }

    pub fn with_emo_audio_prompt_url(mut self, url: impl Into<String>) -> Self {
        self.emo_audio_prompt_url = Some(url.into());
        self
    }

    pub fn with_emo_alpha(mut self, alpha: f32) -> Self {
        self.emo_alpha = Some(alpha);
        self
    }

    pub fn with_prompt_text(mut self, prompt_text: impl Into<String>) -> Self {
        self.prompt_text = Some(prompt_text.into());
        self
    }

    pub fn with_prompt_audio_url(mut self, url: impl Into<String>) -> Self {
        self.prompt_audio_url = Some(url.into());
        self
    }

    pub fn with_gender(mut self, gender: impl Into<String>) -> Self {
        self.gender = Some(gender.into());
        self
    }

    pub fn with_pitch(mut self, pitch: i32) -> Self {
        self.pitch = Some(pitch);
        self
    }

    pub fn with_speed(mut self, speed: i32) -> Self {
        self.speed = Some(speed);
        self
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: Option<String>,
    pub object: Option<String>,
    pub owned_by: Option<String>,
    pub permissions: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelsList {
    pub object: Option<String>,
    pub data: Option<Vec<ModelInfo>>,
}
