# 会话索引：模力方舟 API 对接文档

**会话日期**: 2026-04-16
**会话目标**: 整理模力方舟（ Gitee AI）OpenAPI 对接文档

## 产出清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 对接文档 | `docs/GITEE-AI-OPENAPI.md` | 全语言 API 对接示例（Rust/Python/JavaScript） |
| Skill 文档 | `.opencode/skills/moark-api.md` | 可复用的 skill 参考 |

## 任务概述

1. 读取并分析 https://ai.gitee.com/docs/openapi/v1 官方文档
2. 整理认证方式和 API 调用方法
3. 添加 Rust、Python、JavaScript 多语言示例
4. 保存到项目 `docs/` 文件夹
5. 创建 skill 文档供后续复用

## 关键结论

- Base URL: `https://ai.gitee.com/v1`
- 认证方式: Bearer Token
- 每日免费额度: 100 次
- 推荐的 Rust 库: `async-openai`、`reqwest`

## 版本

- v1.0.0 (2026-04-16): 初始版本