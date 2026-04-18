"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Key, Plus, Eye, EyeOff, Globe, Palette, Info, X, Loader2, CheckCircle } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

const defaultApiKeys: ApiKey[] = [
  { id: "1", name: "OpenAI API", key: "sk-xxxxx...xxxxx", createdAt: "2026-04-10" },
  { id: "2", name: "Anthropic API", key: "sk-ant-xxxxx...xxxxx", createdAt: "2026-04-12" },
];

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

const APP_VERSION = "1.0.0";
const APP_DESCRIPTION = "API Moark Desktop - 一个强大的 API 管理与测试桌面应用";

type Tab = "api" | "app" | "about";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("api");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(defaultApiKeys);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [selectedLang, setSelectedLang] = useState("zh-CN");
  
  const [giteeToken, setGiteeToken] = useState("");
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [isSettingToken, setIsSettingToken] = useState(false);

  useEffect(() => {
    loadGiteeToken();
  }, []);

  const loadGiteeToken = async () => {
    try {
      const token = await invoke<string | null>("get_global_api_token");
      if (token) {
        setGiteeToken(token);
        setIsTokenSet(true);
      }
    } catch (e) {
      console.error("Failed to load token:", e);
    }
  };

  const saveGiteeToken = async () => {
    if (!giteeToken.trim()) return;
    setIsSettingToken(true);
    try {
      await invoke("set_global_api_token", { apiToken: giteeToken });
      setIsTokenSet(true);
    } catch (e) {
      console.error("Failed to save token:", e);
    } finally {
      setIsSettingToken(false);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addApiKey = () => {
    if (newKeyName && newKeyValue) {
      setApiKeys([
        ...apiKeys,
        {
          id: Date.now().toString(),
          name: newKeyName,
          key: newKeyValue.length > 12 ? `${newKeyValue.slice(0, 8)}...${newKeyValue.slice(-4)}` : newKeyValue,
          createdAt: new Date().toISOString().split("T")[0],
        },
      ]);
      setNewKeyName("");
      setNewKeyValue("");
      setShowAddModal(false);
    }
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  };

  const tabs = [
    { id: "api" as Tab, label: "API密钥", icon: Key },
    { id: "app" as Tab, label: "应用", icon: Globe },
    { id: "about" as Tab, label: "关于", icon: Info },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-1">管理您的 API 密钥、应用配置和主题</p>
      </div>

      <div className="flex gap-1 border-b pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom: -1px left-0 right-0 h-px bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "api" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Gitee AI Token</h3>
                <p className="text-sm text-muted-foreground">用于语音合成、搜索等 AI 功能</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={giteeToken}
                onChange={(e) => {
                  setGiteeToken(e.target.value);
                  setIsTokenSet(false);
                }}
                placeholder="请输入 Gitee AI API Token"
                className="flex-1 px-3 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={saveGiteeToken}
                disabled={!giteeToken.trim() || isSettingToken}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSettingToken ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isTokenSet ? (
                  <CheckCircle className="h-4 w-4" />
                ) : null}
                {isTokenSet ? "已保存" : "保存"}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              添加新密钥
            </button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">密钥</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">创建时间</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{apiKey.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {visibleKeys.has(apiKey.id) ? apiKey.key.replace(/•/g, "*") : apiKey.key}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{apiKey.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-2 rounded-md hover:bg-accent transition-colors"
                          title={visibleKeys.has(apiKey.id) ? "隐藏" : "显示"}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="p-2 rounded-md hover:bg-accent transition-colors text-destructive"
                          title="删除"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {apiKeys.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无 API 密钥</p>
              <p className="text-sm mt-1">点击上方按钮添加新密钥</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "app" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">语言</h3>
              </div>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">主题</h3>
              </div>
              <ModeToggle />
            </div>
          </div>
        </div>
      )}

      {activeTab === "about" && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-8 shadow-sm text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
                <Key className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">API Moark Desktop</h2>
            <p className="text-muted-foreground mt-2">版本 {APP_VERSION}</p>
            <p className="mt-4 max-w-md mx-auto text-muted-foreground">{APP_DESCRIPTION}</p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-4">功能特性</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                多模型支持 - GPT, Claude, DeepSeek 等
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                API 密钥安全管理
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                使用数据分析与导出
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                工作流编排与自动化
              </li>
            </ul>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">添加 API 密钥</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">名称</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如: OpenAI API"
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">密钥</label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="sk-..."
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={addApiKey}
                disabled={!newKeyName || !newKeyValue}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}