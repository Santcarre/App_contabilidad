"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { toast, Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initOfflineSync, processQueue, getOfflineCount } from "@/lib/offline-queue";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    // Sincroniza la cola offline al arrancar, al volver la red y al re-enfocar
    initOfflineSync();
    // Si quedaron operaciones pendientes al recargar, avisa
    getOfflineCount().then((count) => {
      if (count > 0) {
        processQueue().then((res) => {
          if (res.pending > 0) {
            toast.info(`Hay ${res.pending} cambio(s) pendiente(s) de sincronizar`);
          }
        });
      }
    });
    // Background Sync: registra el tag y procesa la cola cuando el SW avisa
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "OFFLINE_SYNC") processQueue();
      });
      navigator.serviceWorker.ready.then((reg) => {
        const syncManager = (reg as any).sync;
        if (syncManager) {
          syncManager.register("contabilidad-outbox").catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}