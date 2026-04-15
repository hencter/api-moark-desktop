"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  GitBranch,
  Zap,
  Database,
  Settings,
} from "lucide-react";

const navItems = [
  {
    title: "仪表板",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "模型广场",
    href: "/models",
    icon: Boxes,
  },
  {
    title: "工作流",
    href: "/workflows",
    icon: GitBranch,
  },
  {
    title: "API测试",
    href: "/api-test",
    icon: Zap,
  },
  {
    title: "数据管理",
    href: "/data",
    icon: Database,
  },
  {
    title: "设置",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 h-screen border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold">Moark 聚合</h1>
        <p className="text-xs text-muted-foreground">AI 模型聚合助手</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </aside>
  );
}