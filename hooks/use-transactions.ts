"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { apiRequest as request } from "@/lib/api-client";

export interface Transaction {
  id: string;
  type: "gasto" | "ingreso";
  amountOriginal: number;
  currencyOriginal: string;
  amountBase: number;
  currencyBase: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  sourceId: string;
  sourceName?: string;
  sourceIcon?: string;
  sourceColor?: string;
  date: string;
  note?: string;
  recurringId?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryId?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}

export type TransactionInput = {
  type: "gasto" | "ingreso";
  amountOriginal: number;
  currencyOriginal: string;
  categoryId: string;
  sourceId: string;
  date: string;
  note?: string;
  recurringId?: string;
};

export function useTransactions(filters?: TransactionFilters) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.sourceId) params.set("sourceId", filters.sourceId);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const qs = params.toString();

  return useQuery({
    queryKey: ["transactions", filters ?? {}],
    queryFn: async () => {
      const data = await request(`/api/transacciones${qs ? `?${qs}` : ""}`);
      return {
        transactions: data.transactions as Transaction[],
        total: data.total as number,
      };
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      request("/api/transacciones", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Transacción creada");
      if (data?.budgetAlert) {
        const { level, categoryName, spent, limit, currency } = data.budgetAlert;
        const message = `${categoryName}: gastado ${formatCurrency(spent, currency)} de ${formatCurrency(limit, currency)}`;
        if (level === "exceeded") {
          toast.error(`Presupuesto excedido — ${message}`);
        } else {
          toast.warning(`Cerca del límite (80%) — ${message}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput & { id: string }) =>
      request("/api/transacciones", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Transacción actualizada");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request(`/api/transacciones?id=${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Transacción eliminada");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
