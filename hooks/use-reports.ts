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

export function useReport(month: string, type: "gasto" | "ingreso") {
  return useQuery({
    queryKey: ["reports", month, type],
    queryFn: async () => {
      const data = await request(`/api/reportes?month=${month}&type=${type}`);
      return data as ReportData;
    },
  });
}
