"use client";

import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "@/lib/wallets";

export interface BilleterasData {
  wallets: Wallet[];
  currencyBase: string;
}

export function useBilleteras() {
  return useQuery({
    queryKey: ["billeteras"],
    queryFn: async () => {
      const res = await fetch("/api/billeteras");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error de conexión");
      return data as BilleterasData;
    },
  });
}