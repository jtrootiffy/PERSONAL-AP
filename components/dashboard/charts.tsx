"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/currency";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  planning: "#0ea5e9",
  not_started: "#94a3b8",
  in_progress: "#6366f1",
  on_hold: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
};

export function IncomeChart({
  data,
  currency,
}: {
  data: { label: string; income: number; invoiced: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={64}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v) => formatCurrency(v, currency, { compact: true })}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            fontSize: 12,
          }}
          formatter={(value: number, name) => [
            formatCurrency(value, currency),
            name === "income" ? "Income received" : "Invoiced",
          ]}
        />
        <Legend
          formatter={(value) => (value === "income" ? "Income received" : "Invoiced")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="invoiced" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={22} />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#incomeFill)"
        />
        <Line type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={0} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ProjectStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const chartData = data.map((d) => ({
    name: PROJECT_STATUS_LABELS[d.status as ProjectStatus] ?? d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No projects yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={100}
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TaskProgressRing({
  percent,
  completed,
  total,
}: {
  percent: number;
  completed: number;
  total: number;
}) {
  const data = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "Remaining", value: Math.max(total - completed, 0), color: "#e2e8f0" },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={64}
            outerRadius={88}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{percent}%</span>
        <span className="text-xs text-muted-foreground">
          {completed}/{total} tasks
        </span>
      </div>
    </div>
  );
}
