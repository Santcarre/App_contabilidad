export interface SortableTransaction {
  date: string;
  createdAt?: string;
}

/**
 * Ordena por fecha desc con desempate por createdAt desc: si varias
 * transacciones comparten fecha (p. ej. varias de hoy), la más recientemente
 * creada queda arriba en vez de mantener el orden de inserción de la hoja.
 */
export function sortTransactionsDesc<T extends SortableTransaction>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
}