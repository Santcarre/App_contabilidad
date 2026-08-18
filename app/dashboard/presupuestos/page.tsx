"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { formatCurrency, localDateString } from "@/lib/utils";
import { MoneyField, parseMoneyInput } from "@/components/ui/money-field";
import { getColorValue } from "@/lib/color-map";
import { useRates } from "@/hooks/use-config";
import {
  useBudgets,
  useBudgetCategories,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  type Budget,
} from "@/hooks/use-budgets";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { periodRange } from "@/lib/reports";

const PERIOD_LABELS: Record<string, string> = { dia: "Día", semana: "Semana", mes: "Mes" };
const PERIOD_ADJECTIVE: Record<string, string> = { dia: "diarios", semana: "semanales", mes: "mensuales" };

function periodLabel(periodo: string, fecha: string): string {
  const iso = periodo === "mes" ? `${fecha.slice(0, 7)}-01` : fecha;
  if (periodo === "dia") return format(parseISO(iso), "EEEE d 'de' MMMM yyyy", { locale: es });
  if (periodo === "semana") {
    const { start, end } = periodRange("week", fecha);
    return `${format(parseISO(start), "d 'de' MMMM", { locale: es })} – ${format(parseISO(end), "d 'de' MMMM yyyy", { locale: es })}`;
  }
  return format(parseISO(iso), "MMMM yyyy", { locale: es });
}

const MONTH_ITEMS = (() => {
  const items: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    items.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) });
  }
  return items;
})();

export default function PresupuestosPage() {
  const { data: ratesData } = useRates();
  const currencyBase = ratesData?.baseCurrency ?? "COP";
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("mes");
  const [fecha, setFecha] = useState(() => localDateString());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    categoryId: "",
    limitAmount: "",
    alert80: true,
    alert100: true,
  });

  const { data: budgets, isLoading, isError } = useBudgets(periodo, fecha);
  const { data: categories, isLoading: categoriesLoading } = useBudgetCategories();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const openCreateDialog = () => {
    setEditingBudget(null);
    setFormData({ categoryId: "", limitAmount: "", alert80: true, alert100: true });
    setDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      limitAmount: budget.limitAmount.toString(),
      alert80: budget.alert80,
      alert100: budget.alert100,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(formData.limitAmount);
    if (!formData.categoryId || amount <= 0) return;

    const payload = {
      categoryId: formData.categoryId,
      limitAmount: amount,
      periodo,
      fecha,
      alert80: formData.alert80,
      alert100: formData.alert100,
    };

    if (editingBudget) {
      updateBudget.mutate({ id: editingBudget.id, ...payload }, { onSettled: () => setDialogOpen(false) });
    } else {
      createBudget.mutate(payload, { onSettled: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar este presupuesto?")) {
      deleteBudget.mutate(id);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const loading = isLoading || categoriesLoading;
  const saving = createBudget.isPending || updateBudget.isPending;
  const semanaDesde = format(startOfWeek(parseISO(fecha), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const semanaHasta = format(endOfWeek(parseISO(fecha), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const mesValue = fecha.slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground">Controla tus límites de gasto por categoría</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label className="text-sm">Período</Label>
            <div className="flex items-center gap-2">
              <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as "dia" | "semana" | "mes")}>
                <TabsList>
                  <TabsTrigger value="dia">Día</TabsTrigger>
                  <TabsTrigger value="semana">Semana</TabsTrigger>
                  <TabsTrigger value="mes">Mes</TabsTrigger>
                </TabsList>
              </Tabs>
              {periodo === "dia" && (
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => e.target.value && setFecha(e.target.value)}
                  className="w-[160px]"
                  aria-label="Día del período"
                />
              )}
              {periodo === "semana" && (
                <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
                  <Input
                    type="date"
                    value={semanaDesde}
                    onChange={(e) => e.target.value && setFecha(e.target.value)}
                    className="w-full sm:w-[150px]"
                    aria-label="Inicio del intervalo de la semana"
                  />
                  <span className="hidden text-muted-foreground sm:inline">–</span>
                  <Input
                    type="date"
                    value={semanaHasta}
                    onChange={(e) => e.target.value && setFecha(e.target.value)}
                    className="w-full sm:w-[150px]"
                    aria-label="Fin del intervalo de la semana"
                  />
                </div>
              )}
              {periodo === "mes" && (
                <Select value={mesValue} onValueChange={(m) => setFecha(`${m}-01`)}>
                  <SelectTrigger className="w-[180px]" aria-label="Mes del período">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_ITEMS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo presupuesto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudget ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Categoría</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })} required>
                    <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <MoneyField
                    id="limitAmount"
                    label={`Límite ${PERIOD_ADJECTIVE[periodo]} (${currencyBase})`}
                    value={formData.limitAmount}
                    onChange={(raw) => setFormData({ ...formData, limitAmount: raw })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{periodLabel(periodo, fecha)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="alert80" checked={formData.alert80} onCheckedChange={(v) => setFormData({ ...formData, alert80: v })} />
                  <Label htmlFor="alert80">Alertar al 80%</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="alert100" checked={formData.alert100} onCheckedChange={(v) => setFormData({ ...formData, alert100: v })} />
                  <Label htmlFor="alert100">Alertar al 100%</Label>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBudget ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando presupuestos...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-red-600">
          Error al cargar los presupuestos. Intenta de nuevo.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(budgets ?? []).length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay presupuestos {PERIOD_ADJECTIVE[periodo]} para este período</p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer presupuesto
                </Button>
              </CardContent>
            </Card>
          ) : (
            (budgets ?? []).map((budget) => {
              const percentage = budget.limitAmount > 0 ? (budget.spent / budget.limitAmount) * 100 : 0;
              const isOver = percentage >= 100;
              const isWarning = percentage >= 80;
              return (
                <Card key={budget.id} className={isOver ? "border-red-200" : isWarning ? "border-yellow-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: getColorValue(budget.categoryColor) }}>
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{budget.categoryName}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">
                            {PERIOD_LABELS[budget.periodo]} · {periodLabel(budget.periodo, budget.periodKey)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(budget)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(budget.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Gastado</span>
                      <span className="font-semibold">{formatCurrency(budget.spent, currencyBase)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Límite</span>
                      <span className="font-semibold">{formatCurrency(budget.limitAmount, currencyBase)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Restante</span>
                      <span className={`font-semibold ${isOver ? "text-red-600" : isWarning ? "text-yellow-600" : "text-green-600"}`}>
                        {formatCurrency(Math.max(0, budget.limitAmount - budget.spent), currencyBase)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>{percentage.toFixed(0)}%</span>
                      <span>100%</span>
                    </div>
                    {(isOver || isWarning) && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{isOver ? "Presupuesto excedido" : "Cerca del límite (80%)"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}