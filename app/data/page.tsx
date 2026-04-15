"use client";

import { Activity, FileJson, FileSpreadsheet, CheckCircle, XCircle, Clock } from "lucide-react";

interface UsageRecord {
  id: string;
  time: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  status: "success" | "failed";
}

const usageRecords: UsageRecord[] = [
  {
    id: "1",
    time: "2026-04-15 14:32:15",
    model: "GPT-4o",
    inputTokens: 1250,
    outputTokens: 3200,
    status: "success",
  },
  {
    id: "2",
    time: "2026-04-15 13:18:42",
    model: "Claude 3.5 Sonnet",
    inputTokens: 890,
    outputTokens: 2100,
    status: "success",
  },
  {
    id: "3",
    time: "2026-04-15 11:55:28",
    model: "GPT-4o",
    inputTokens: 2100,
    outputTokens: 4500,
    status: "success",
  },
  {
    id: "4",
    time: "2026-04-14 22:10:33",
    model: "DeepSeek Coder",
    inputTokens: 1500,
    outputTokens: 2800,
    status: "success",
  },
  {
    id: "5",
    time: "2026-04-14 18:45:12",
    model: "Claude 3.5 Sonnet",
    inputTokens: 450,
    outputTokens: 120,
    status: "failed",
  },
  {
    id: "6",
    time: "2026-04-14 15:22:08",
    model: "GPT-4o",
    inputTokens: 3200,
    outputTokens: 7800,
    status: "success",
  },
  {
    id: "7",
    time: "2026-04-13 09:10:55",
    model: "DALL-E 3",
    inputTokens: 120,
    outputTokens: 1,
    status: "success",
  },
  {
    id: "8",
    time: "2026-04-12 16:38:20",
    model: "DeepSeek Coder",
    inputTokens: 2800,
    outputTokens: 5100,
    status: "success",
  },
];

export default function DataPage() {
  const totalCalls = usageRecords.length;
  const totalInputTokens = usageRecords.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutputTokens = usageRecords.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const cost = (totalInputTokens * 0.001 + totalOutputTokens * 0.003).toFixed(4);

  const handleExport = (format: "json" | "csv") => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(usageRecords, null, 2);
      filename = "api-usage.json";
      mimeType = "application/json";
    } else {
      const headers = ["时间", "模型", "输入Token", "输出Token", "状态"];
      const rows = usageRecords.map((r) => [
        r.time,
        r.model,
        r.inputTokens.toString(),
        r.outputTokens.toString(),
        r.status,
      ]);
      content = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      filename = "api-usage.csv";
      mimeType = "text/csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">数据管理</h1>
        <p className="text-muted-foreground mt-1">查看 API 使用记录和导出数据</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">调用次数</p>
              <p className="text-2xl font-bold">{totalCalls}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总 Token</p>
              <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">预估成本 (USD)</p>
              <p className="text-2xl font-bold">${cost}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">使用记录</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border bg-background border-input hover:bg-accent transition-colors"
          >
            <FileJson className="h-4 w-4" />
            <span className="text-sm font-medium">JSON</span>
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border bg-background border-input hover:bg-accent transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm font-medium">CSV</span>
          </button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">模型</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">输入 Token</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">输出 Token</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usageRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {record.time}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{record.model}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">
                    {record.inputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">
                    {record.outputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {record.status === "success" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        失败
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}