"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MODELS = [
  { id: "DeepSeek-R1", name: "DeepSeek R1" },
  { id: "Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
  { id: "Qwen2.5-32B-Instruct", name: "Qwen 2.5 32B" },
  { id: "Qwen2.5-14B-Instruct", name: "Qwen 2.5 14B" },
  { id: "Yi-1.5-34B-Chat", name: "Yi 1.5 34B" },
  { id: "ChatGLM4-9B", name: "ChatGLM4 9B" },
];

interface ChatResponse {
  id: string;
  content: string;
  model: string;
}

interface Params {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export default function ApiTestPage() {
  const [selectedModel, setSelectedModel] = useState("DeepSeek-R1");
  const [inputText, setInputText] = useState("");
  const [params, setParams] = useState<Params>({ temperature: 0.7, maxTokens: 2048, topP: 0.95, frequencyPenalty: 0, presencePenalty: 0 });
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [apiToken, setApiToken] = useState("");

  useEffect(() => {
    initToken();
  }, []);

  const initToken = async () => {
    try {
      const token = await invoke<string | null>("get_global_api_token");
      if (token) {
        setApiToken(token);
        setIsConnected(true);
      }
    } catch (e) {
      setIsConnected(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !isConnected) return;
    setIsLoading(true);
    setResponse("");

    try {
      const result = await invoke<ChatResponse>("chat", {
        params: {
          model: selectedModel,
          messages: [{ role: "user", content: inputText }],
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          top_p: params.topP,
          stream: false,
        },
      });
      setResponse(`模型: ${result.model}\nID: ${result.id}\n\n内容:\n${result.content}`);
    } catch (error) {
      setResponse(`错误: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInputText("");
    setResponse("");
    setParams({ temperature: 0.7, maxTokens: 2048, topP: 0.95, frequencyPenalty: 0, presencePenalty: 0 });
  };

  const handleSetToken = async () => {
    if (!apiToken.trim()) return;
    try {
      await invoke("set_global_api_token", { apiToken: apiToken.trim() });
      setIsConnected(true);
    } catch (error) {
      alert(`设置失败: ${error}`);
    }
  };

  const updateParam = (key: keyof Params, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API 测试台</h1>
        <p className="text-muted-foreground mt-1">调用 ai.gitee.com API 测试界面</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择模型</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">输入文本</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入提示词..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">参数调节</label>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Temperature</span>
                  <span className="text-muted-foreground">{params.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={params.temperature}
                  onChange={(e) => updateParam("temperature", parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-auto bg-muted"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Max Tokens</span>
                  <span className="text-muted-foreground">{params.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={params.maxTokens}
                  onChange={(e) => updateParam("maxTokens", parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-auto bg-muted"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Top P</span>
                  <span className="text-muted-foreground">{params.topP}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={params.topP}
                  onChange={(e) => updateParam("topP", parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-auto bg-muted"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Frequency Penalty</span>
                  <span className="text-muted-foreground">{params.frequencyPenalty}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={params.frequencyPenalty}
                  onChange={(e) => updateParam("frequencyPenalty", parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-auto bg-muted"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Presence Penalty</span>
                  <span className="text-muted-foreground">{params.presencePenalty}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={params.presencePenalty}
                  onChange={(e) => updateParam("presencePenalty", parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-auto bg-muted"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  发送请求
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="h-10 px-4 rounded-lg border border-input hover:bg-accent flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重置
            </button>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">响应结果</label>
            {response && (
              <button
                onClick={handleCopy}
                className="h-8 px-3 rounded-lg border border-input hover:bg-accent flex items-center gap-1 text-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    复制
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="min-h-[400px] rounded-lg border bg-muted/50 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在请求...
              </div>
            ) : response ? (
              <pre className="whitespace-pre-wrap text-sm font-mono">{response}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                响应结果将显示在这里
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
