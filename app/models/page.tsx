"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, Bot, Image, Code2, FileText, Sparkles, Loader2 } from "lucide-react";

interface ModelInfo {
  id: string;
  object?: string;
  owned_by?: string;
}

const modelTypes = [
  { value: "all", label: "全部" },
  { value: "text", label: "文本生成" },
  { value: "image", label: "图像生成" },
  { value: "code", label: "代码生成" },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: Image,
  code: Code2,
};

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const result = await invoke<{ data: ModelInfo[] }>("list_models");
      if (result.data) {
        setModels(result.data);
      }
    } catch (e) {
      console.error("Failed to load models:", e);
    } finally {
      setLoading(false);
    }
  };

  const getModelType = (modelId: string): string => {
    const id = modelId.toLowerCase();
    if (id.includes("image") || id.includes("sd") || id.includes("flux") || id.includes("kolors")) return "image";
    if (id.includes("code") || id.includes("coder")) return "code";
    return "text";
  };

  const getModelProvider = (modelId: string): string => {
    const id = modelId.toLowerCase();
    if (id.includes("qwen")) return "通义千问";
    if (id.includes("deepseek")) return "DeepSeek";
    if (id.includes("yi")) return "零一万物";
    if (id.includes("chatglm")) return "智谱AI";
    if (id.includes("glm")) return "智谱AI";
    if (id.includes("hunyuan")) return "腾讯混元";
    if (id.includes("ernie") || id.includes("wenxin")) return "百度";
    if (id.includes("step")) return "阶跃星辰";
    if (id.includes("intern")) return "书生大模型";
    return modelId.split("-")[0];
  };

  const filteredModels = models.filter((model) => {
    const modelType = getModelType(model.id);
    const matchesSearch =
      model.id.toLowerCase().includes(search.toLowerCase()) ||
      (model.owned_by || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || modelType === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredModelsData = filteredModels.map((model) => ({
    id: model.id,
    name: model.id,
    description: model.owned_by || "来自 ai.gitee.com 模型广场",
    type: getModelType(model.id),
    provider: getModelProvider(model.id),
  }));

  const filteredModelsFinal = filteredModelsData.filter((model) => {
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModelsFinal.map((model) => {
            const Icon = typeIcons[model.type] || Bot;
            return (
              <div
                key={model.id}
                className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
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
      )}

      {!loading && filteredModelsFinal.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">未找到匹配的模型</p>
        </div>
      )}
    </div>
  );
}