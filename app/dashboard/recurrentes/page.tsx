"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileList, MobileCard, MobileActions } from "@/components/layout/mobile-list";
import { Combobox } from "@/components/ui/combobox";
import { MoneyInput, parseMoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import CurrencySelect from "@/components/ui/currency-select";
import { Plus, Edit, Trash2, PauseCircle, PlayCircle, Calendar, Clock, Loader2, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getColorValue } from "@/lib/color-map";
import { useCategories } from "@/hooks/use-categories";
import { useSources } from "@/hooks/use-sources";
import {
  useRecurrents,
  useCreateRecurrent,
  useUpdateRecurrent,
  useToggleRecurrent,
  useDeleteRecurrent,
  useGenerateRecurrents,
  type Recurring,
} from "@/hooks/use-recurrents";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface FormState {
  type: "gasto" | "ingreso";
  amountOriginal: string;
  currencyOriginal: string;
  categoryId: string;
  sourceId: string;
  dayOfMonth: number;
  startDate: string;
  endDate: string;
  active: boolean;
  note: string;
}

const EMPTY_FORM: FormState = {
  type: "gasto",
  amountOriginal: "",
  currencyOriginal: "COP",
  categoryId: "",
  sourceId: "",
  dayOfMonth: 1,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  active: true,
  note: "",
};

export default function RecurrentesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecurrent, setEditingRecurrent] = useState<Recurring | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const { data: recurrents, isLoading, isError } = useRecurrents();
  const { data: categories } = useCategories();
  const { data: sources } = useSources();
  const createRecurrent = useCreateRecurrent();
  const updateRecurrent = useUpdateRecurrent();
  const toggleRecurrent = useToggleRecurrent();
  const deleteRecurrent = useDeleteRecurrent();
  const generateRecurrents = useGenerateRecurrents();

  const categoryOptions = (categories ?? [])
    .filter((c) => c.type === formData.type)
    .map((c) => ({
      value: c.id,
      label: c.name,
      icon: <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getColorValue(c.color) }} />,
    }));
  const sourceOptions = (sources ?? []).map((s) => ({
    value: s.id,
    label: s.name,
    icon: <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getColorValue(s.color) }} />,
  }));

  const openCreateDialog = () => {
    setEditingRecurrent(null);
    setFormData({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEditDialog = (rec: Recurring) => {
    setEditingRecurrent(rec);
    setFormData({
      type: rec.type,
      amountOriginal: rec.amountOriginal.toString(),
      currencyOriginal: rec.currencyOriginal,
      categoryId: rec.categoryId,
      sourceId: rec.sourceId,
      dayOfMonth: rec.dayOfMonth,
      startDate: rec.startDate,
      endDate: rec.endDate || "",
      active: rec.active,
      note: rec.note || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(formData.amountOriginal);
    if (!formData.categoryId || !formData.sourceId || amount <= 0) return;

    const payload = {
      type: formData.type,
      amountOriginal: amount,
      currencyOriginal: formData.currencyOriginal,
      categoryId: formData.categoryId,
      sourceId: formData.sourceId,
      frequency: "mensual" as const,
      dayOfMonth: formData.dayOfMonth,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      active: formData.active,
      note: formData.note.trim() || null,
    };

    if (editingRecurrent) {
      updateRecurrent.mutate({ id: editingRecurrent.id, ...payload }, { onSettled: () => setDialogOpen(false) });
    } else {
      createRecurrent.mutate(payload, { onSettled: () => setDialogOpen(false) });
    }
  };

  const handleToggle = (id: string, active: boolean) => {
    toggleRecurrent.mutate({ id, active });
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta recurrencia? Las transacciones ya generadas no se verán afectadas.")) {
      deleteRecurrent.mutate(id);
    }
  };

  const saving = createRecurrent.isPending || updateRecurrent.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos Recurrentes</h1>
          <p className="text-muted-foreground">Plantillas que se generan automáticamente cada mes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => generateRecurrents.mutate()} disabled={generateRecurrents.isPending}>
            {generateRecurrents.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Generar ahora
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva recurrencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRecurrent ? "Editar recurrencia" : "Nueva recurrencia"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => {
                        setFormData({ ...formData, type: v as "gasto" | "ingreso", categoryId: "" });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasto">Gasto</SelectItem>
                        <SelectItem value="ingreso">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <CurrencySelect
                      value={formData.currencyOriginal}
                      onChange={(v) => setFormData({ ...formData, currencyOriginal: v })}
                      options={["COP", "USD", "EUR"]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountOriginal">Monto</Label>
                  <MoneyInput
                    id="amountOriginal"
                    placeholder="0,00"
                    value={formData.amountOriginal}
                    onChange={(raw) => setFormData({ ...formData, amountOriginal: raw })}
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Combobox
                      options={categoryOptions}
                      value={formData.categoryId}
                      onChange={(v) => setFormData({ ...formData, categoryId: v })}
                      placeholder="Seleccionar categoría"
                      emptyText="Sin categorías de este tipo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medio de pago</Label>
                    <Combobox
                      options={sourceOptions}
                      value={formData.sourceId}
                      onChange={(v) => setFormData({ ...formData, sourceId: v })}
                      placeholder="Seleccionar medio de pago"
                      emptyText="Sin fuentes"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dayOfMonth">Día del mes</Label>
                    <input
                      id="dayOfMonth"
                      type="number"
                      min={1}
                      max={28}
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha inicio</Label>
                    <input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Fecha fin (opcional)</Label>
                    <input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Descripción</Label>
                  <input
                    id="note"
                    type="text"
                    maxLength={200}
                    placeholder="Aparece en la transacción generada (ej. Arriendo enero)"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                    />
                    <Label htmlFor="active">Activa</Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingRecurrent ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando recurrencias...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-16 text-red-600">
              Error al cargar las recurrencias. Intenta de nuevo.
            </div>
          ) : (
            <>
            {/* Móvil: cards apiladas */}
            <MobileList>
              {(recurrents ?? []).length === 0 ? (
                <li className="text-center py-8 text-muted-foreground">
                  No hay recurrencias. Crea tu primera plantilla.
                </li>
              ) : (
                (recurrents ?? []).map((rec) => (
                  <MobileCard key={rec.id}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium flex-1 min-w-0 leading-tight">
                          {rec.type === "gasto" ? "Gasto" : "Ingreso"} recurrente
                        </p>
                        <span className={`flex-shrink-0 ${rec.active ? "text-green-600 text-xs" : "text-gray-400 text-xs"}`}>
                          {rec.active ? "Activa" : "Pausada"}
                        </span>
                      </div>
                      <p className="font-mono tabular-nums font-medium">
                        {formatCurrency(rec.amountOriginal, rec.currencyOriginal)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[rec.categoryName, rec.sourceName].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Día {rec.dayOfMonth} de cada mes · Próxima:{" "}
                        {format(new Date(rec.nextGeneration + "T00:00:00"), "dd/MM/yyyy", { locale: es })}
                      </p>
                      {rec.note && <p className="text-sm text-muted-foreground truncate">{rec.note}</p>}
                    </div>
                    <MobileActions>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 ${rec.active ? "text-green-600" : "text-gray-400"}`}
                        onClick={() => handleToggle(rec.id, !rec.active)}
                        aria-label={rec.active ? "Pausar recurrencia" : "Activar recurrencia"}
                      >
                        {rec.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEditDialog(rec)} aria-label="Editar recurrencia">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => handleDelete(rec.id)} aria-label="Eliminar recurrencia">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </MobileActions>
                  </MobileCard>
                ))
              )}
            </MobileList>

            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Categoría / Medio de pago</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Última</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recurrents ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay recurrencias. Crea tu primera plantilla.
                    </TableCell>
                  </TableRow>
                ) : (
                  (recurrents ?? []).map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rec.type === "gasto" ? "Gasto" : "Ingreso"} recurrente</p>
                          <p className="text-sm text-muted-foreground">Día {rec.dayOfMonth} de cada mes</p>
                          {rec.note && <p className="text-sm text-muted-foreground">{rec.note}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{formatCurrency(rec.amountOriginal, rec.currencyOriginal)}</TableCell>
                      <TableCell>
                        <p>{rec.categoryName}</p>
                        <p className="text-sm text-muted-foreground">{rec.sourceName}</p>
                      </TableCell>
                      <TableCell>Mensual</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(rec.nextGeneration + "T00:00:00"), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rec.lastGenerated ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(rec.lastGenerated + "T00:00:00"), "dd/MM/yyyy", { locale: es })}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(rec.id, !rec.active)}
                          className={rec.active ? "text-green-600" : "text-gray-400"}
                        >
                          {rec.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        </Button>
                        <span className={rec.active ? "text-green-600" : "text-gray-400"}>
                          {rec.active ? "Activa" : "Pausada"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rec)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}