"use client";

import { useState } from "react";
import { Send, Copy, Check, RefreshCw, Loader2 } from "lucide-react";

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-3.5", name: "Claude 3.5 Sonnet" },
  { id: "deepseek-chat", name: "DeepSeek Chat" },
  { id: "qwen-turbo", name: "Qwen Turbo" },
];

const defaultParams = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export default function ApiTestPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [inputText, setInputText] = useState("");
  const [params, setParams] = useState(defaultParams);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setResponse("");
    
    setTimeout(() => {
      setResponse(`这是模拟的 API 响应结果。\n\n模型: ${models.find(m => m.id === selectedModel)?.name}\n输入: ${inputText}\n\n参数:\n- temperature: ${params.temperature}\n- maxTokens: ${params.maxTokens}\n- topP: ${params.topP}\n\n响应内容将在这里显示...`);
      setIsLoading(false);
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInputText("");
    setResponse("");
    setParams(defaultParams);
  };

  const updateParam = (key: keyof typeof defaultParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API 测试台</h1>
        <p className="text-muted-foreground mt-1">模拟 API 调用测试界面</p>
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
              {models.map((model) => (
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
