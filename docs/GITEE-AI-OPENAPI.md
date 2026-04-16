# 模力方舟（Gitee AI）OpenAPI 对接文档

> 模力方舟是开源中国打造的 AI 算力平台，提供开箱即用的大模型 Serverless API 服务。
> 官方文档：https://ai.gitee.com/docs/openapi/v1
> 示例代码仓库：https://gitee.com/moark/examples

## 目录

- [基础信息](#基础信息)
- [认证方式](#认证方式)
- [Rust 语言调用](#rust-语言调用)
  - [使用 reqwest (原生 HTTP)](#使用-reqwest-原生-http)
  - [使用 async-openai 库](#使用-async-openai-库)
  - [Rust 流式响应](#rust-流式响应)
  - [Rust 文生图](#rust-文生图)
- [Python 语言调用](#python-语言调用)
- [JavaScript 语言调用](#javascript-语言调用)
- [流式响应](#流式响应)
- [文生图 API](#文生图-api)
- [视频生成 API](#视频生成-api)
- [文本翻译 API](#文本翻译-api)
- [故障转移机制](#故障转移机制)
- [常用模型列表](#常用模型列表)
- [常见问题](#常见问题)

---

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `https://ai.gitee.com/v1` |
| 认证方式 | Bearer Token |
| 每日免费额度 | 100 次 |
| API 兼容性 | OpenAI 风格兼容 |

### 注册与获取令牌

1. 访问 [模力方舟](https://ai.gitee.com/) 并登录
2. 进入 工作台 -> 设置 -> 访问令牌
3. 创建访问令牌（ Token）
4. （可选）购买资源包解锁更多模型

---

## 认证方式

所有 API 请求需要在 Header 中添加认证信息：

```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

---

## Rust 语言调用

推荐使用以下 Rust 库来调用模力方舟 API：

| 库 | 说明 | 推荐度 |
|-----|------|--------|
| [async-openai](https://crates.io/crates/async-openai) | OpenAI 兼容客户端，功能全面 | ⭐⭐⭐⭐⭐ |
| [reqwest](https://crates.io/crates/reqwest) | 原生 HTTP 客户端，轻量 | ⭐⭐⭐⭐ |
| [openai-oxide](https://crates.io/crates/openai-oxide) | 现代化客户端，支持 WebSocket | ⭐⭐⭐ |

### 使用 reqwest (原生 HTTP)

首先添加依赖：

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

#### 基础调用

```rust
use reqwest::Client;
use serde_json::json;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();
    let api_token = "<your_access_token>";
    let model = "DeepSeek-R1";

    let response = client
        .post("https://ai.gitee.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_token))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [
                {"role": "user", "content": "请帮我写一首关于春天的五言绝句"}
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }))
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;
    let content = result["choices"][0]["message"]["content"].as_str().unwrap_or("");
    println!("模型回应: {}", content);

    Ok(())
}
```

#### 流式响应 (SSE)

```rust
use reqwest::Client;
use serde_json::json;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();
    let api_token = "<your_access_token>";
    let model = "Qwen2.5-72B-Instruct";

    let response = client
        .post("https://ai.gitee.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_token))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "stream": true,
            "messages": [
                {"role": "user", "content": "请给我讲个故事"}
            ]
        }))
        .send()
        .await?;

    // 处理 SSE 流式响应
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        if let Ok(bytes) = chunk {
            if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let data = line.strip_prefix("data: ").unwrap_or("");
                        if data == "[DONE]" {
                            continue;
                        }
                        // 解析 JSON (简化处理)
                        println!("{}", data);
                    }
                }
            }
        }
    }

    Ok(())
}
```

### 使用 async-openai 库

首先添加依赖：

```toml
[dependencies]
async-openai = "0.34"
tokio = { version = "1", features = ["full"] }
```

#### 基础调用

```rust
use async_openai::{
    Client,
    config::OpenAIConfig,
    types::{ChatCompletionTool, ChatCompletionToolFunction},
};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = OpenAIConfig::new()
        .with_api_key("<your_access_token>")
        .with_api_base("https://ai.gitee.com/v1");

    let client = Client::with_config(config);

    let response = client
        .chat()
        .create(serde_json::json!({
            "model": "Qwen2.5-72B-Instruct",
            "messages": [
                {"role": "system", "content": "你是一个有用的助手。"},
                {"role": "user", "content": "写一个 python 简明教程"}
            ],
            "temperature": 0.7,
            "max_tokens": 512
        }))
        .await?;

    let content = response.choices[0].message.content.as_ref().unwrap();
    println!("{}", content);

    Ok(())
}
```

#### 流式响应

```rust
use async_openai::{Client, config::OpenAIConfig};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = OpenAIConfig::new()
        .with_api_key("<your_access_token>")
        .with_api_base("https://ai.gitee.com/v1");

    let client = Client::with_config(config);

    let mut stream = client
        .chat()
        .create_stream(serde_json::json!({
            "model": "Qwen2.5-72B-Instruct",
            "messages": [
                {"role": "user", "content": "写一个 python 简明教程"}
            ],
            "stream": true
        }))
        .await?;

    while let Some(chunk) = stream.next().await {
        if let Ok(content) = chunk {
            if let Some(text) = content.choices.first().and_then(|c| c.delta.content.as_ref()) {
                print!("{}", text);
            }
        }
    }

    Ok(())
}
```

#### 自定义请求头 (故障转移)

```rust
use async_openai::{Client, config::OpenAIConfig};

let config = OpenAIConfig::new()
    .with_api_key("<your_access_token>")
    .with_api_base("https://ai.gitee.com/v1")
    .with_default_header("X-Failover-Enabled", "true");  // 启用故障转移
```

### 文生图 (Rust)

```rust
use async_openai::{Client, config::OpenAIConfig};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = OpenAIConfig::new()
        .with_api_key("<your_access_token>")
        .with_api_base("https://ai.gitee.com/v1");

    let client = Client::with_config(config);

    let response = client
        .images()
        .create(serde_json::json!({
            "prompt": "a white siamese cat",
            "model": "Kolors",
            "size": "1024x1024"
        }))
        .await?;

    let url = response.data[0].url.as_ref().unwrap();
    println!("Image URL: {}", url);

    Ok(())
}
```

---

## Python 语言调用

### Python 示例

```python
import requests

url = "https://ai.gitee.com/v1/chat/completions"
headers = {
    "Authorization": "Bearer <your_access_token>",
    "Content-Type": "application/json"
}
data = {
    "model": "DeepSeek-R1",
    "messages": [
        {"role": "user", "content": "请帮我写一首关于春天的五言绝句"}
    ],
    "max_tokens": 100,
    "temperature": 0.7
}

response = requests.post(url, headers=headers, json=data)
if response.status_code == 200:
    result = response.json()
    print("模型回应:", result['choices'][0]['message']['content'])
else:
    print(f"请求失败，状态码: {response.status_code}")
```

---

## 文本生成 API

### 接口地址

```
POST https://ai.gitee.com/v1/chat/completions
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型名称，如 "DeepSeek-R1"、"Qwen2.5-72B-Instruct" |
| messages | array | 是 | 消息列表，每条消息包含 role 和 content |
| temperature | float | 否 | 生成随机性，0-1 之间，默认 0.7 |
| top_p | float | 否 | 生成保守性，0-1 之间，默认 0.95 |
| max_tokens | int | 否 | 最大生成 token 数 |
| stream | boolean | 否 | 是否使用流式输出，默认 false |
| frequency_penalty | float | 否 | 重复惩罚，-2.0 到 2.0 之间 |
| presence_penalty | float | 否 | 存在惩罚，-2.0 到 2.0 之间 |
| tools | array | 否 | 函数调用工具列表 |
| guided_json | object | 否 | JSON Schema 格式要求 |

### messages 消息角色

| 角色 | 说明 |
|------|------|
| system | 系统角色，用于设定 AI 的行为和性格 |
| user | 用户角色，表示用户的问题或指令 |
| assistant | 助手角色，表示 AI 的回答 |

### 使用 OpenAI SDK

```python
from openai import OpenAI

base_url = "https://ai.gitee.com/v1"
model_name = "Qwen2.5-72B-Instruct"

client = OpenAI(base_url=base_url, api_key="<your_access_token>")

completion = client.chat.completions.create(
    model=model_name,
    stream=False,
    temperature=0.7,
    top_p=0.95,
    frequency_penalty=1.05,
    messages=[
        {"role": "system", "content": "你是一个有用的助手。"},
        {"role": "user", "content": "写一个 python 简明教程"}
    ]
)

print(completion.choices[0].message.content)
```

### 使用 curl

```bash
curl https://ai.gitee.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "model": "Qwen2.5-72B-Instruct",
    "stream": false,
    "messages": [
      {"role": "system", "content": "你是一个有用的助手。"},
      {"role": "user", "content": "写一个 python 简明教程"}
    ]
  }'
```

### 使用 JavaScript

```javascript
async function query(data) {
  const response = await fetch(
    "https://ai.gitee.com/v1/chat/completions",
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer <your_access_token>"
      },
      method: "POST",
      body: JSON.stringify({
        model: "Qwen2.5-72B-Instruct",
        messages: [
          { role: "system", content: "你是一个有用的助手。" },
          { role: "user", content: "写一个 python 简明教程" }
        ]
      })
    }
  );
  const result = await response.json();
  console.log(JSON.stringify(result));
}
```

---

## 流式响应

### 使用 OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai.gitee.com/v1",
    api_key="<your_access_token>"
)

completion = client.chat.completions.create(
    model="Qwen2.5-72B-Instruct",
    stream=True,
    messages=[
        {"role": "user", "content": "写一个 python 简明教程"}
    ]
)

for chunk in completion:
    print(chunk.choices[0].delta.content, end="")
```

### SSE 流式响应

```python
import requests

url = "https://ai.gitee.com/v1/chat/completions"
headers = {
    "Authorization": "Bearer <your_access_token>",
    "Content-Type": "application/json"
}
data = {
    "model": "Qwen2.5-72B-Instruct",
    "stream": True,
    "messages": [
        {"role": "user", "content": "请给我讲个故事"}
    ]
}

response = requests.post(url, headers=headers, json=data, stream=True)
for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            print(line[6:])  # 去掉 "data: " 前缀
```

---

## 文生图 API

### 接口地址

```
POST https://ai.gitee.com/v1/images/generations
```

### 使用 OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai.gitee.com/v1",
    api_key="<your_access_token>"
)

response = client.images.generate(
    prompt="a white siamese cat",
    model="Kolors",
    size="1024x1024"
)

# 获取图片 URL
image_url = response.data[0].url
print(image_url)
```

### 使用 requests

```python
import requests
import base64

url = "https://ai.gitee.com/v1/images/generations"
headers = {
    "Authorization": "Bearer <your_access_token>",
    "Content-Type": "application/json"
}
data = {
    "prompt": "a white siamese cat",
    "model": "Kolors",
    "size": "1024x1024",
    "response_format": "b64_json"
}

response = requests.post(url, headers=headers, json=data)
if response.status_code == 200:
    result = response.json()
    image_data = result['data'][0]['b64_json']
    # 保存图片
    with open("output.png", "wb") as f:
        f.write(base64.b64decode(image_data))
```

---

## 视频生成 API

> 视频生成���用异步接口，需要轮询任务状态

### 接口地址

```
POST https://ai.gitee.com/v1/async/videos/generations
GET  https://ai.gitee.com/v1/task/{task_id}
```

### 示例代码

```python
import requests
import time
import json

API_URL = "https://ai.gitee.com/v1/async/videos/generations"
API_TOKEN = "<your_access_token>"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

def create_task(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()

def poll_task(task_id):
    status_url = f"https://ai.gitee.com/v1/task/{task_id}"
    timeout = 30 * 60
    retry_interval = 10

    while True:
        response = requests.get(status_url, headers=headers)
        result = response.json()
        status = result.get("status")

        if status == "succeeded":
            return result
        elif status == "failed":
            print(f"Task failed: {result}")
            return None

        time.sleep(retry_interval)

# 创建任务
result = create_task({
    "model": "Wan2.1-T2V-1.3B",
    "prompt": "A cat running in the snow",
    "num_inference_steps": 50
})

task_id = result.get("task_id")
print(f"Task ID: {task_id}")

# 等待完成
final_result = poll_task(task_id)
if final_result:
    video_url = final_result.get("output", {}).get("video", [{}])[0].get("url")
    print(f"Video URL: {video_url}")
```

---

## 文本翻译 API

### 接口地址

```
POST https://ai.gitee.com/v1/translate
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string/array | 是 | 待翻译的文本 |
| target | string | 是 | 目标语言代码 |
| source | string | 否 | 源语言代码 |
| model | string | 否 | 模型名称，默认 Qwen3-4B |

### 支持的模型

- Qwen3-4B
- Qwen3-14B
- Qwen3-32B
- DeepSeek-V3
- HY-MT1.5-7B

### 示例代码

```python
import requests

API_URL = "https://ai.gitee.com/v1/translate"
API_TOKEN = "<your_access_token>"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "model": "Qwen3-4B",
    "q": "你好，世界",
    "target": "en"
}

response = requests.post(API_URL, headers=headers, json=payload)
result = response.json()

print(result["translations"][0]["translated_text"])  # Hello, world!
```

---

## 故障转移机制

启用故障转移后，当主算力出现问题时，系统会自动切换到备用算力。

### 使用方式

在请求头中添加：

```http
X-Failover-Enabled: true
```

### Python 示例

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai.gitee.com/v1",
    api_key="<your_access_token>",
    default_headers={"X-Failover-Enabled": "true"}
)

response = client.chat.completions.create(
    model="Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "你好"}]
)
```

### curl 示例

```bash
curl https://ai.gitee.com/v1/chat/completions \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -H "X-Failover-Enabled: true" \
  -d '{"model": "Qwen2.5-72B-Instruct", "messages": [{"role": "user", "content": "你好"}]}'
```

> 注意：启用故障转移后，扣费将按照最后一次成功调用的算力模型计算。

---

## 常用模型列表

### 文本生成模型

- DeepSeek-R1
- DeepSeek-R1-Distill-Qwen-14B
- Qwen2.5-72B-Instruct
- Qwen2.5-32B-Instruct
- Qwen2.5-14B-Instruct
- Yi-1.5-34B-Chat
- ChatGLM4-9B

### 图像生成模型

- Kolors
- Flux
- Stable Diffusion XL
- Wan2.1-T2V-14B

### 视频生成模型

- Wan2.1-T2V-14B
- Wan2.1-T2V-1.3B

完整模型列表请参考：[模型广场](https://ai.gitee.com/serverless-api)

---

## 常见问题

### Q1: 免费模型无法使用？

用户需购买任意金额的全模型资源包，并创建一个访问令牌，使用该令牌即可调用免费的 API 服务。

### Q2: 模型 API 访问速度较慢？

模型广场的 API 资源为公共池，不支持单账号扩容。如有高并发业务需求，请使用"专属算力部署"服务。

### Q3: 异步任务出现大量调用错误？

单个用户同时创建的异步任务上限为 5 个，请检查当前任务并发数是否超限。

### Q4: 如何查看调用日志？

用户可在"使用日志"中查看到调用链路和扣费详情。

---

## 参考资源

- 官方文档：https://ai.gitee.com/docs
- 接口文档：https://ai.gitee.com/docs/openapi/v1
- 示例代码：https://gitee.com/moark/examples
- 新手入门：https://ai.gitee.com/docs/getting-started
- 调用语言大模型：https://ai.gitee.com/docs/products/apis/texts/text-generation

---

*最后更新：2026-04-16*

---

## 项目配置

如需将模力方舟对接文档保存为项目 skill，可参考以下结构：

```
.opencode/skills/
├── SKILL.md
└── rules/
    └── ...
```

> 详细配置请参考 [.opencode/skills/SKILL.md](#skill)