# 会话索引：模力方舟 API 对接文档

**会话日期**: 2026-04-16
**会话目标**: 整理模力方舟（Gitee AI）OpenAPI 对接文档并完成开发

## 产出清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 对接文档 | `docs/GITEE-AI-OPENAPI.md` | 全语言 API 对接示例（Rust/Python/JavaScript） |
| Skill 文档 | `.opencode/skills/moark-api.md` | 可复用的 skill 参考 |
| Rust 后端 API | `src-tauri/src/moark/` | 模力方舟 API 封装（models, client） |
| Tauri 命令 | `src-tauri/src/commands.rs` | 前端调用接口（set_api_token, chat, test_connection） |
| 前端对话页面 | `app/chat/page.tsx` | AI 对话界面 |

## 任务概述

### 第一阶段：文档整理
1. 读取并分析 https://ai.gitee.com/docs/openapi/v1 官方文档
2. 整理认证方式和 API 调用方法
3. 添加 Rust、Python、JavaScript 多语言示例
4. 保存到项目 `docs/` 文件夹
5. 创建 skill 文档供后续复用

### 第二阶段：开发实现
1. 创建 Rust 后端模块 `src-tauri/src/moark/`
   - `models.rs`: API 数据结构定义
   - `client.rs`: HTTP 客户端封装
2. 创建 Tauri 命令 `src-tauri/src/commands.rs`
   - `set_api_token`: 设置 API Token
   - `chat`: 发送聊天请求
   - `test_connection`: 测试连接
   - `get_connection_status`: 获取连接状态
3. 创建前端对话页面 `app/chat/page.tsx`
   - 支持模型选择
   - 支持 Token 设置
   - 消息展示
4. 更新侧边栏导航 `components/app-sidebar.tsx`

## 关键结论

- Base URL: `https://ai.gitee.com/v1`
- 认证方式: Bearer Token
- 每日免费额度: 100 次
- 推荐的 Rust 库: `async-openai`、`reqwest`

## 版本

- v1.0.0 (2026-04-16): 初始版本
- v1.1.0 (2026-04-16): 添加完整对话功能