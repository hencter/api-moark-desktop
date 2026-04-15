"use client";

import { useState } from "react";
import { Search, Bot, Image, Code2, FileText, Sparkles } from "lucide-react";

const modelTypes = [
  { value: "all", label: "全部" },
  { value: "text", label: "文本生成" },
  { value: "image", label: "图像生成" },
  { value: "code", label: "代码生成" },
];

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI 最新一代多模态大模型，支持文本、图像、音频理解与生成",
    type: "text",
    provider: "OpenAI",
  },
  {
    id: "claude-3.5",
    name: "Claude 3.5 Sonnet",
    description: "Anthropic 出品的 Claude 系列最新版本，擅长编码和复杂推理",
    type: "text",
    provider: "Anthropic",
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    description: "OpenAI 图像生成模型，可根据文字描述创建高质量图像",
    type: "image",
    provider: "OpenAI",
  },
  {
    id: "midjourney-v6",
    name: "Midjourney V6",
    description: "当前最受欢迎的 AI 艺术生成工具，擅长风格化图像创作",
    type: "image",
    provider: "Midjourney",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI 驱动的代码编辑器，内置代码补全、生成和重构功能",
    type: "code",
    provider: "Anysphere",
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    description: "专为代码任务优化的开源大模型，支持 80+ 编程语言",
    type: "code",
    provider: "DeepSeek",
  },
];

const typeIcons = {
  text: FileText,
  image: Image,
  code: Code2,
};

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || model.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">模型广场</h1>
        <p className="text-muted-foreground mt-1">浏览和选择可用的 AI 模型</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索模型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {modelTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setTypeFilter(type.value)}
              className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${
                typeFilter === type.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredModels.map((model) => {
          const Icon = typeIcons[model.type as keyof typeof typeIcons];
          return (
            <div
              key={model.id}
              className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {Icon ? (
                      <Icon className="h-5 w-5 text-primary" />
                    ) : (
                      <Bot className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{model.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {model.provider}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {model.description}
              </p>
              <div className="mt-4 pt-3 border-t flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {modelTypes.find((t) => t.value === model.type)?.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">未找到匹配的模型</p>
        </div>
      )}
    </div>
  );
}