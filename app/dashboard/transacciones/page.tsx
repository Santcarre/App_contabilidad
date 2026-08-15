"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileList, MobileCard, MobileActions } from "@/components/layout/mobile-list";
import { Plus, ChevronDown, ChevronUp, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";

const PAGE_SIZE = 25;

export default function TransaccionesPage() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    categoryId: "",
    sourceId: "",
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useTransactions({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    type: filters.type || undefined,
    limit: PAGE_SIZE,
    offset,
  });
  const deleteTransaction = useDeleteTransaction();

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const updateFilters = (patch: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setOffset(0);
  };

  const sortedTransactions = [...(data?.transactions ?? [])].sort((a, b) => {
    const aVal = (a as any)[sortConfig.key] ?? "";
    const bVal = (b as any)[sortConfig.key] ?? "";
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar esta transacción?")) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  const handleExport = () => {
    const rows = [
      ["Fecha", "Tipo", "Monto", "Moneda", "Monto base", "Moneda base", "Categoría", "Medio de pago", "Nota"],
      ...sortedTransactions.map((tx) => [
        tx.date,
        tx.type === "gasto" ? "Gasto" : "Ingreso",
        tx.amountOriginal,
        tx.currencyOriginal,
        tx.amountBase,
        tx.currencyBase,
        tx.categoryName ?? "",
        tx.sourceName ?? "",
        tx.note ?? "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="text-muted-foreground">Gestiona tus gastos e ingresos</p>
        </div>
        <Link href="/dashboard/transacciones/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva transacción
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de transacciones</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1 flex-1">
                <Label>Desde</Label>
                <Input type="date" value={filters.startDate} onChange={(e) => updateFilters({ startDate: e.target.value })} />
              </div>
              <div className="space-y-1 flex-1">
                <Label>Hasta</Label>
                <Input type="date" value={filters.endDate} onChange={(e) => updateFilters({ endDate: e.target.value })} />
              </div>
              <div className="space-y-1 flex-1">
                <Label>Tipo</Label>
                <Select value={filters.type} onValueChange={(v) => updateFilters({ type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Móvil: cards apiladas */}
            <MobileList>
              {isLoading ? (
                <li className="text-center py-8 text-muted-foreground">Cargando transacciones...</li>
              ) : sortedTransactions.length === 0 ? (
                <li className="text-center py-8 text-muted-foreground">
                  {isFetching ? "Actualizando..." : "No hay transacciones para mostrar"}
                </li>
              ) : (
                sortedTransactions.map((tx) => (
                  <MobileCard key={tx.id}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), "dd/MM/yyyy", { locale: es })}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${
                            tx.type === "gasto" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {tx.type === "gasto" ? "Gasto" : "Ingreso"}
                        </span>
                      </div>
                      <p className="font-mono tabular-nums font-medium">
                        {formatCurrency(tx.amountOriginal, tx.currencyOriginal)}
                        {tx.currencyOriginal !== tx.currencyBase && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({formatCurrency(tx.amountBase, tx.currencyBase)})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[tx.categoryName, tx.sourceName].filter(Boolean).join(" · ")}
                      </p>
                      {tx.note && <p className="text-sm text-muted-foreground truncate">{tx.note}</p>}
                    </div>
                    <MobileActions>
                      <Link
                        href={`/dashboard/transacciones/${tx.id}/editar`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-sm text-primary hover:bg-accent"
                        aria-label="Editar transacción"
                      >
                        Editar
                      </Link>
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => handleDelete(tx.id)} aria-label="Eliminar transacción">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </MobileActions>
                  </MobileCard>
                ))
              )}
            </MobileList>

            {/* Desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: "date", label: "Fecha" },
                      { key: "type", label: "Tipo" },
                      { key: "amountOriginal", label: "Monto" },
                      { key: "categoryName", label: "Categoría" },
                      { key: "sourceName", label: "Medio de pago" },
                      { key: "note", label: "Nota" },
                    ].map((col) => (
                      <TableHead key={col.key} className="cursor-pointer hover:bg-accent" onClick={() => handleSort(col.key)}>
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortConfig.key === col.key && (
                            sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Cargando transacciones...
                      </TableCell>
                    </TableRow>
                  ) : sortedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isFetching ? "Actualizando..." : "No hay transacciones para mostrar"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.date), "dd/MM/yyyy", { locale: es })}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tx.type === "gasto" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                            {tx.type === "gasto" ? "Gasto" : "Ingreso"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(tx.amountOriginal, tx.currencyOriginal)}
                          {tx.currencyOriginal !== tx.currencyBase && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({formatCurrency(tx.amountBase, tx.currencyBase)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{tx.categoryName}</TableCell>
                        <TableCell>{tx.sourceName}</TableCell>
                        <TableCell className="max-w-xs truncate">{tx.note || "-"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Link href={`/dashboard/transacciones/${tx.id}/editar`} className="text-sm text-primary hover:underline mr-3">
                            Editar
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {total} transacciones
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
