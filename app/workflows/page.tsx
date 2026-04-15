"use client";

import { useState } from "react";
import { Plus, Search, Workflow, Clock, Play, Pause, MoreHorizontal } from "lucide-react";

const workflows = [
  {
    id: "wf-001",
    name: "内容生成工作流",
    description: "自动根据主题生成文章大纲，支持多轮迭代优化",
    status: "active",
    createdAt: "2024-04-10 14:30:00",
  },
  {
    id: "wf-002",
    name: "图像处理管道",
    description: "批量图像增强、风格迁移与尺寸标准化",
    status: "paused",
    createdAt: "2024-04-08 09:15:00",
  },
  {
    id: "wf-003",
    name: "代码审查自动化",
    description: "自动检测代码问题并生成修复建议",
    status: "active",
    createdAt: "2024-04-05 16:45:00",
  },
];

const statusConfig = {
  active: { label: "运行中", color: "text-green-500 bg-green-500/10" },
  paused: { label: "已暂停", color: "text-yellow-500 bg-yellow-500/10" },
};

export default function WorkflowsPage() {
  const [search, setSearch] = useState("");

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      wf.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">工作流管理</h1>
          <p className="text-muted-foreground mt-1">管理和运行自动化工作流</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          新建工作流
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索工作流..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid gap-0">
          {filteredWorkflows.map((workflow) => {
            const status = statusConfig[workflow.status as keyof typeof statusConfig];
            return (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Workflow className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {workflow.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {workflow.createdAt}
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                    {workflow.status === "active" ? (
                      <Pause className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">未找到匹配的工作流</p>
        </div>
      )}
    </div>
  );
}