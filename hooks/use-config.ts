"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest as request } from "@/lib/api-client";

export interface AppConfig {
  theme: string;
  currencyBase: string;
  language: string;
  dateFormat: string;
  budgetStrictMode: boolean;
  currencies: string[];
}

export interface RateRow {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: "auto" | "manual";
  date: string;
  fetchedAt?: string;
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const data = await request("/api/configuracion");
      return data as AppConfig;
    },
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppConfig>) =>
      request("/api/configuracion", { method: "PUT", body: JSON.stringify(patch) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      const data = await request("/api/exchange-rates");
      return {
        rates: data.rates as RateRow[],
        baseCurrency: data.baseCurrency as string,
        currencies: data.currencies as string[],
      };
    },
  });
}

export function useUpdateRatesNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request("/api/exchange-rates", { method: "PATCH" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success(`Tasas actualizadas (${data.updated ?? 0} nuevas, ${data.appended ?? 0} agregadas)`);
      qc.invalidateQueries({ queryKey: ["rates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useOverrideRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetCurrency: string; rate: number }) =>
      request("/api/exchange-rates", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Tasa manual guardada");
      qc.invalidateQueries({ queryKey: ["rates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
