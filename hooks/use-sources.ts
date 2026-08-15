"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest as request } from "@/lib/api-client";

export interface Source {
  id: string;
  name: string;
  type: "efectivo" | "digital" | "banco" | "tarjeta";
  icon: string;
  color: string;
  initialBalance: number;
  active: boolean;
  isDefault?: boolean;
}

export type SourceInput = {
  name: string;
  type: "efectivo" | "digital" | "banco" | "tarjeta";
  icon: string;
  color: string;
  initialBalance?: number;
};

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const data = await request("/api/fuentes");
      return data.sources as Source[];
    },
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SourceInput) =>
      request("/api/fuentes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Fuente creada");
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SourceInput & { id: string }) =>
      request("/api/fuentes", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Fuente actualizada");
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/api/fuentes?id=${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Fuente desactivada");
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["billeteras"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
