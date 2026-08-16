"use client";

import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "@/lib/wallets";

export interface BilleterasData {
  wallets: Wallet[];
  currencyBase: string;
  today: string;
}

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useBilleteras() {
  const today = localToday();
  return useQuery({
    queryKey: ["billeteras", today],
    queryFn: async () => {
      const res = await fetch(`/api/billeteras?today=${today}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error de conexión");
      return data as BilleterasData;
    },
  });
}