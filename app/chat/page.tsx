"use client";

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Trash2, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const MODELS = [
  { id: "DeepSeek-R1", name: "DeepSeek R1" },
  { id: "Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
  { id: "Qwen2.5-32B-Instruct", name: "Qwen 2.5 32B" },
  { id: "Qwen2.5-14B-Instruct", name: "Qwen 2.5 14B" },
  { id: "Yi-1.5-34B-Chat", name: "Yi 1.5 34B" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("DeepSeek-R1");
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkConnection = async () => {
    try {
      const connected = await invoke<boolean>("get_connection_status");
      setIsConnected(connected);
    } catch {
      setIsConnected(false);
    }
  };

  const handleSetToken = async () => {
    if (!apiToken.trim()) return;
    try {
      await invoke("set_api_token", { apiToken: apiToken.trim() });
      setIsConnected(true);
      setShowSettings(false);
      setApiToken("");
    } catch (error) {
      alert(`设置失败: ${error}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await invoke<ChatResponse>("chat", {
        params: {
          model: selectedModel,
          messages: [...messages, userMessage],
          temperature: 0.7,
          max_tokens: 2048,
        },
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `错误: ${error}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">AI 对话</h1>
          <p className="text-sm text-muted-foreground mt-1">
            与 AI 模型进行对话
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">模型:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-9 px-3 rounded-lg border bg-background border-input text-sm"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            title={isConnected ? "已连接" : "未连接"}
          >
            <Settings
              className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-red-500"}`}
            />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="px-6 py-4 border-b bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                API Token
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="输入模力方舟 API Token"
                  className="flex-1"
                />
                <Button onClick={handleSetToken}>保存</Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {isConnected ? "✓ 已连接" : "○ 未连接"}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">开始对话</p>
              <p className="text-sm mt-2">
                {isConnected
                  ? "选择模型并发送消息开始对话"
                  : "请先设置 API Token"}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-4 border-t">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "输入消息... (Enter 发送, Shift+Enter 换行)"
                : "请先设置 API Token"
            }
            disabled={!isConnected || isLoading}
            className="flex-1 min-h-[44px] max-h-[200px] px-4 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!isConnected || isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}