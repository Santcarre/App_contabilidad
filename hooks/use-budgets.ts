"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest as request } from "@/lib/api-client";

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  limitAmount: number;
  periodo: "dia" | "semana" | "mes";
  periodKey: string;
  spent: number;
  alert80: boolean;
  alert100: boolean;
}

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
}

export type BudgetInput = {
  categoryId: string;
  limitAmount: number;
  periodo: "dia" | "semana" | "mes";
  fecha: string;
  alert80: boolean;
  alert100: boolean;
};

export function useBudgets(periodo: "dia" | "semana" | "mes", fecha: string) {
  return useQuery({
    queryKey: ["budgets", periodo, fecha],
    queryFn: async () => {
      const data = await request(`/api/presupuestos?periodo=${periodo}&fecha=${fecha}`);
      return data.budgets as Budget[];
    },
  });
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ["budget-categories"],
    queryFn: async () => {
      const data = await request("/api/categorias");
      return (data.categories ?? [])
        .filter((c: any) => c.type === "gasto")
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color,
        })) as BudgetCategory[];
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) =>
      request("/api/presupuestos", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Presupuesto creado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput & { id: string }) =>
      request("/api/presupuestos", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Presupuesto actualizado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/api/presupuestos?id=${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Presupuesto eliminado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}