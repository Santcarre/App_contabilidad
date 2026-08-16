"use client";

import { useQuery } from "@tanstack/react-query";
import type { MonthSummary, TrendPoint, BreakdownItem, DailyPoint } from "@/lib/reports";

export interface ReportData {
  currencyBase: string;
  summary: MonthSummary;
  trend: TrendPoint[];
  categoryBreakdown: BreakdownItem[];
  sourceBreakdown: BreakdownItem[];
  dailyBalance: DailyPoint[];
}

async function request(path: string): Promise<any> {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error de conexión");
  return data;
}

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useReport(
  month: string,
  type: "gasto" | "ingreso",
  period: "day" | "week" | "month" = "month",
  date?: string
) {
  const dateParam = period === "month" ? month : date ?? localToday();
  return useQuery({
    queryKey: ["reports", period, dateParam, type],
    queryFn: async () => {
      const params = new URLSearchParams({ month, type, period });
      if (period !== "month") params.set("date", dateParam);
      const data = await request(`/api/reportes?${params.toString()}`);
      return data as ReportData;
    },
  });
}