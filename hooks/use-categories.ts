"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest as request } from "@/lib/api-client";

export interface Category {
  id: string;
  name: string;
  type: "gasto" | "ingreso";
  icon: string;
  color: string;
  order: number;
  active: boolean;
  isDefault?: boolean;
}

export type CategoryInput = {
  name: string;
  type: "gasto" | "ingreso";
  icon: string;
  color: string;
  order?: number;
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await request("/api/categorias");
      return data.categories as Category[];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      request("/api/categorias", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Categoría creada");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput & { id: string }) =>
      request("/api/categorias", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Categoría actualizada");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/api/categorias?id=${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      if (data?.queued) { toast.info("Sin conexión: se guardó para sincronizar cuando vuelvas a estar en línea"); return; }
      toast.success("Categoría desactivada");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
