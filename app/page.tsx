"use client";

import {
  Boxes,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    title: "API 调用",
    value: "0",
    icon: Zap,
  },
  {
    title: "使用模型",
    value: "0",
    icon: Boxes,
  },
  {
    title: "平均耗时",
    value: "0ms",
    icon: Clock,
  },
  {
    title: "总成本",
    value: "¥0.00",
    icon: DollarSign,
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
        <p className="text-muted-foreground mt-1">欢迎使用 Moark 聚合助手</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="flex flex-row items-center justify-between pb-2">
                <span className="text-sm font-medium">{stat.title}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          <h2 className="text-lg font-semibold">最近活动</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          暂无活动记录。开始使用 API 测试台或工作流来创建您的第一个任务。
        </p>
      </div>
    </div>
  );
}
