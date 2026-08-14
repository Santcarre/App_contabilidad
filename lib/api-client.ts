// Cliente HTTP compartido con soporte offline (S6-03).
// Las mutaciones (POST/PUT/PATCH/DELETE) se encolan en IndexedDB cuando no
// hay red y se sincronizan al reconectar. Devuelve { queued: true } en ese
// caso para que la UI informe al usuario.

import { enqueueOp, isOnline } from "@/lib/offline-queue";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiRequest(path: string, init?: RequestInit): Promise<any> {
  const method = (init?.method ?? "GET").toUpperCase();
  const opts: RequestInit = {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  };

  if (MUTATING.has(method) && !isOnline()) {
    await enqueueOp({ url: path, method, body: opts.body as string | undefined });
    return { queued: true };
  }

  try {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Error de conexión");
    return data;
  } catch (err) {
    if (MUTATING.has(method)) {
      // Error de red (fetch TypeError): guardar para sincronizar
      await enqueueOp({ url: path, method, body: opts.body as string | undefined });
      return { queued: true };
    }
    throw err;
  }
}
