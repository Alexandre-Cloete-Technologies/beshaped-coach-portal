"use client";

import { Users, AlertTriangle, TrendingUp } from "lucide-react";

interface StatsCardProps {
  type: "active" | "attention" | "compliance";
  value: string | number;
  label: string;
}

const cardConfig = {
  active: {
    icon: Users,
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  attention: {
    icon: AlertTriangle,
    bgColor: "bg-red-100 dark:bg-red-950/50",
    iconColor: "text-red-600 dark:text-red-400",
  },
  compliance: {
    icon: TrendingUp,
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
};

export default function StatsCard({ type, value, label }: StatsCardProps) {
  const config = cardConfig[type];
  const Icon = config.icon;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${config.iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}
