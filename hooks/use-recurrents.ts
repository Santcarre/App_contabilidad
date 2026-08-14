"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest as request } from "@/lib/api-client";

export interface Recurring {
  id: string;
  type: "gasto" | "ingreso";
  amountOriginal: number;
  currencyOriginal: string;
  categoryId: string;
  categoryName: string;
  sourceId: string;
  sourceName: string;
  frequency: "mensual";
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  nextGeneration: string;
  lastGenerated?: string | null;
  note?: string;
}

export type RecurringInput = {
  type: "gasto" | "ingreso";
  amountOriginal: number;
  currencyOriginal: string;
  categoryId: string;
  sourceId: string;
  frequency: "mensual";
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  note?: string | null;
};

export function useRecurrents() {
  return useQuery({
    queryKey: ["recurrents"],
    queryFn: async () => {
      const data = await request("/api/recurrentes");
      return data.recurrents as Recurring[];
    },
  });
}

export function useCreateRecurrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringInput) =>
      request("/api/recurrentes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Recurrencia creada");
      qc.invalidateQueries({ queryKey: ["recurrents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateRecurrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringInput & { id: string }) =>
      request("/api/recurrentes", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Recurrencia actualizada");
      qc.invalidateQueries({ queryKey: ["recurrents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useToggleRecurrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      request("/api/recurrentes", { method: "PUT", body: JSON.stringify({ id, active }) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["recurrents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRecurrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/api/recurrentes?id=${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Recurrencia eliminada");
      qc.invalidateQueries({ queryKey: ["recurrents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGenerateRecurrents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request("/api/recurrentes", { method: "PATCH" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      if (data?.generated > 0) {
        toast.success(`${data.generated} recurrencias generadas`);
      } else {
        toast.info("Nada que generar por ahora");
      }
      qc.invalidateQueries({ queryKey: ["recurrents"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}