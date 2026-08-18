"use client";

import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput, parseMoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CurrencySelect from "@/components/ui/currency-select";
import { Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "@/components/ui/combobox";
import { CategoryIcon } from "@/components/ui/icon-picker";
import { formatCurrency, localDateString } from "@/lib/utils";
import { convert, getLatestRate } from "@/lib/currency";
import { useRates } from "@/hooks/use-config";
import { useCategories } from "@/hooks/use-categories";
import { useSources } from "@/hooks/use-sources";
import { useCreateTransaction } from "@/hooks/use-transactions";
export default function NuevaTransaccionPage() {
  return (
    <Suspense fallback={null}>
      <NuevaTransaccionForm />
    </Suspense>
  );
}

function NuevaTransaccionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = (searchParams.get("type") as "gasto" | "ingreso") || "gasto";

  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: sources, isLoading: loadingSources } = useSources();
  const { data: ratesData } = useRates();
  const createTransaction = useCreateTransaction();

  const [formData, setFormData] = useState({
    type: defaultType,
    amount: "",
    currency: "COP",
    categoryId: "",
    sourceId: "",
    date: localDateString(),
    note: "",
  });

  const currencyBase = ratesData?.baseCurrency ?? "COP";
  const currencyOptions = [...new Set([currencyBase, ...(ratesData?.currencies ?? ["USD", "EUR"])])];
  const today = localDateString();
  const amountNum = parseMoneyInput(formData.amount);
  const rate =
    formData.currency !== currencyBase && ratesData
      ? getLatestRate(ratesData.rates, formData.currency, today)
      : undefined;
  const previewBase =
    rate !== undefined && amountNum > 0
      ? convert(amountNum, formData.currency, currencyBase, rate)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountOriginal = parseMoneyInput(formData.amount);
    if (!amountOriginal || amountOriginal <= 0) return;

    await createTransaction.mutateAsync(
      {
        type: formData.type,
        amountOriginal,
        currencyOriginal: formData.currency,
        categoryId: formData.categoryId,
        sourceId: formData.sourceId,
        date: formData.date,
        note: formData.note || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/transacciones");
          router.refresh();
        },
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const availableCategories = categories?.filter((c) => c.type === formData.type && c.active) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{formData.type === "gasto" ? "Nuevo Gasto" : "Nuevo Ingreso"}</h1>
          <p className="text-muted-foreground">Registra una nueva transacción</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la transacción</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => {
                    const type = v as "gasto" | "ingreso";
                    setFormData((p) => ({ ...p, type, categoryId: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <CurrencySelect
                  id="currency"
                  value={formData.currency}
                  onChange={(c) => setFormData((p) => ({ ...p, currency: c }))}
                  options={currencyOptions}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <MoneyInput
                  id="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(raw) => setFormData((p) => ({ ...p, amount: raw }))}
                  name="amount"
                  className="pl-9"
                  required
                />
              </div>
              {previewBase !== null && (
                <p className="text-xs text-muted-foreground pl-9">
                  {formatCurrency(amountNum, formData.currency)} ≈{" "}
                  <span className="font-medium">{formatCurrency(previewBase, currencyBase)}</span> en {currencyBase}
                </p>
              )}
              {formData.currency !== currencyBase && rate === undefined && (
                <p className="text-xs text-amber-600 pl-9">
                  No hay tasa de cambio para {formData.currency}. Actualízala en Configuración antes de guardar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  name="date"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Combobox
                  options={availableCategories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    icon: <CategoryIcon name={cat.icon} color={cat.color} />,
                  }))}
                  value={formData.categoryId}
                  onChange={(v) => setFormData((p) => ({ ...p, categoryId: v }))}
                  placeholder={loadingCategories ? "Cargando..." : "Seleccionar categoría"}
                  emptyText="Sin categorías"
                />
              </div>

              <div className="space-y-2">
                <Label>Medio de pago</Label>
                <Combobox
                  options={(sources?.filter((s) => s.active) ?? []).map((src) => ({
                    value: src.id,
                    label: src.name,
                    icon: <CategoryIcon name={src.icon} color={src.color} />,
                  }))}
                  value={formData.sourceId}
                  onChange={(v) => setFormData((p) => ({ ...p, sourceId: v }))}
                  placeholder={loadingSources ? "Cargando..." : "Seleccionar medio de pago"}
                  emptyText="Sin fuentes"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Nota (opcional)</Label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
                placeholder="Detalles adicionales..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createTransaction.isPending} className="flex-1">
                {createTransaction.isPending ? "Guardando..." : "Guardar transacción"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
