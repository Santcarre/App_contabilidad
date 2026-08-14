"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
          <h2 className="text-xl font-semibold">Error inesperado</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Algo salió mal en la aplicación.
          </p>
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </body>
    </html>
  );
}
