---
name: moark-api
description: "模力方舟（Gitee AI）Serverless API 对接指南。支持文本生成、文生图、视频生成、文本翻译等功能调用。提供 Rust/Python/JavaScript 多语言示例代码。"
---

# 模力方舟（Gitee AI）Serverless API 对接指南

模力方舟是开源中国打造的 AI 算力平台，提供开箱即用的大模型 Serverless API 服务。

> 官方文档：https://ai.gitee.com/docs/openapi/v1
> 示例代码仓库：https://gitee.com/moark/examples

## When to Apply

This Skill should be used when the task involves **integrating with Gitee AI (模力方舟) API**.

### Must Use

- 调用模力方舟 API 进行文本生成
- 调用模力方舟 API 进行图像生成
- 调用模力方舟 API 进行视频生成
- 调用模力方舟 API 进行文本翻译
- 配置故障转移机制

### Skip

- 与模力方舟无关的 API 调用
- 纯 UI/UX 开发任务

---

## 快速参考

### 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `https://ai.gitee.com/v1` |
| 认证方式 | Bearer Token |
| 每日免费额度 | 100 次 |
| API 兼容性 | OpenAI 风格兼容 |

### 常用模型

| 类型 | 模型名称 |
|------|--------|
| 文本 | DeepSeek-R1, Qwen2.5-72B-Instruct |
| 图像 | Kolors, Flux |
| 视频 | Wan2.1-T2V-14B |

---

## Rust 语言调用

### 推荐库

| 库 | 说明 |
|-----|------|
| [async-openai](https://crates.io/crates/async-openai) | OpenAI 兼容客户端 |
| [reqwest](https://crates.io/crates/reqwest) | 原生 HTTP 客户端 |

### 使用 reqwest

```rust
use reqwest::Client;
use serde_json::json;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();
    let api_token = "<your_access_token>";

    let response = client
        .post("https://ai.gitee.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_token))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "DeepSeek-R1",
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

### 使用 async-openai

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
        .chat()
        .create(serde_json::json!({
            "model": "Qwen2.5-72B-Instruct",
            "messages": [
                {"role": "system", "content": "你是一个有用的助手。"},
                {"role": "user", "content": "写一个 python 简明教程"}
            ],
            "temperature": 0.7
        }))
        .await?;

    let content = response.choices[0].message.content.as_ref().unwrap();
    println!("{}", content);

    Ok(())
}
```

### 流式��应

```rust
use async_openai::{Client, config::OpenAIConfig};
use futures::StreamExt;
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
            "messages": [{"role": "user", "content": "请给我讲个故事"}],
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

---

## Python 语言调用

### 使用 openai SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://ai.gitee.com/v1",
    api_key="<your_access_token>"
)

completion = client.chat.completions.create(
    model="Qwen2.5-72B-Instruct",
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
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

---

## 故障转移机制

在请求头中添加 `X-Failover-Enabled: true` 启用故障转移。

```rust
let config = OpenAIConfig::new()
    .with_api_key("<your_access_token>")
    .with_api_base("https://ai.gitee.com/v1")
    .with_default_header("X-Failover-Enabled", "true");
```

---

## 参考资源

- 官方文档：https://ai.gitee.com/docs
- 接口文档：https://ai.gitee.com/docs/openapi/v1
- 示例代码：https://gitee.com/moark/examples
- 新手入门：https://ai.gitee.com/docs/getting-started