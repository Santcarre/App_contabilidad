"use client";

import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useReport } from "@/hooks/use-reports";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import dynamic from "next/dynamic";
import { exportToCSV } from "@/utils/export";
import { getColorValue } from "@/lib/color-map";
import { Switch } from "@/components/ui/switch";

const TREND_SERIES = [
  { key: "income", label: "Ingresos", color: "#22c55e" },
  { key: "expense", label: "Gastos", color: "#ef4444" },
  { key: "balance", label: "Balance", color: "#3b82f6" },
] as const;

type TrendSeriesKey = (typeof TREND_SERIES)[number]["key"];

const MonthlyTrendChart = dynamic(() => import("@/components/report-charts").then((m) => m.MonthlyTrendChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" />,
});
const CategoryPieChart = dynamic(() => import("@/components/report-charts").then((m) => m.CategoryPieChart), {
  loading: () => <div className="h-[380px] w-full animate-pulse rounded-lg bg-muted" />,
});
const SourcePieChart = dynamic(() => import("@/components/report-charts").then((m) => m.SourcePieChart), {
  loading: () => <div className="h-[380px] w-full animate-pulse rounded-lg bg-muted" />,
});
const DailyBalanceChart = dynamic(() => import("@/components/report-charts").then((m) => m.DailyBalanceChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" />,
});

function parseMonthParam(value: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Cargando...</div>}>
      <ReportesContent />
    </Suspense>
  );
}

function ReportesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("resumen");
  const [month, setMonth] = useState(() => parseMonthParam(searchParams.get("month")));
  const [type, setType] = useState<"gasto" | "ingreso">("gasto");
  const [visibleSeries, setVisibleSeries] = useState<Record<TrendSeriesKey, boolean>>({
    income: true,
    expense: true,
    balance: false,
  });

  const toggleSeries = (key: TrendSeriesKey) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const anySeriesVisible = TREND_SERIES.some((s) => visibleSeries[s.key]);

  useEffect(() => {
    const urlMonth = searchParams.get("month");
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) && urlMonth !== month) {
      setMonth(urlMonth);
    }
  }, [searchParams, month]);

  const updateMonth = (next: string) => {
    setMonth(next);
    router.replace(`/dashboard/reportes?month=${next}`, { scroll: false });
  };

  const { data: report, isLoading, isError } = useReport(month, type);
  const currencyBase = report?.currencyBase ?? "COP";

  const trend = report?.trend ?? [];

  const navigateMonth = (direction: "prev" | "next") => {
    const [year, m] = month.split("-").map(Number);
    const base = new Date(year, m - 1, 1);
    const next = direction === "prev" ? subMonths(base, 1) : addMonths(base, 1);
    updateMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleExport = () => {
    if (!report) return;
    const base = report.currencyBase;
    if (activeTab === "resumen") {
      exportToCSV(`resumen-${month}.csv`,
        ["Mes", "Ingresos", "Gastos", "Balance"],
        trend.map((t) => [t.month, formatCurrency(t.income, base), formatCurrency(t.expense, base), formatCurrency(t.balance, base)]));
    } else if (activeTab === "categorias") {
      exportToCSV(`categorias-${month}.csv`,
        ["Categoría", "Total", "Cantidad", "%"],
        report.categoryBreakdown.map((c) => [c.name, formatCurrency(c.total, base), c.count, `${c.percentage}%`]));
    } else if (activeTab === "fuentes") {
      exportToCSV(`fuentes-${month}.csv`,
        ["Medio de pago", "Total", "Cantidad", "%"],
        report.sourceBreakdown.map((s) => [s.name, formatCurrency(s.total, base), s.count, `${s.percentage}%`]));
    } else {
      exportToCSV(`balance-diario-${month}.csv`,
        ["Fecha", "Balance acumulado"],
        report.dailyBalance.map((d) => [d.date, formatCurrency(d.balance, base)]));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Visualiza y analiza tus finanzas</p>        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="month"
            value={month}
            aria-label="Seleccionar mes"
            onChange={(e) => {
              if (e.target.value) updateMonth(e.target.value);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!report || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando reportes...
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex items-center justify-center py-16 text-red-600">
          Error al cargar los reportes. Intenta de nuevo.
        </div>
      )}

      {report && !isLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full h-auto flex-wrap sm:w-auto sm:h-10 sm:flex-nowrap">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="fuentes">Medio de Pago</TabsTrigger>
            <TabsTrigger value="tendencia">Tendencia</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{formatCurrency(report.summary.income, currencyBase)}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.summary.prevIncome > 0
                      ? `${((report.summary.income / report.summary.prevIncome - 1) * 100).toFixed(1)}% vs mes anterior`
                      : "Mes actual"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{formatCurrency(report.summary.expense, currencyBase)}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.summary.prevExpense > 0
                      ? `${((report.summary.expense / report.summary.prevExpense - 1) * 100).toFixed(1)}% vs mes anterior`
                      : "Mes actual"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance</CardTitle>
                  <Minus className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${report.summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(report.summary.balance, currencyBase)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ingresos - Gastos</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Evolución mensual</CardTitle>
                    {trend.length > 12 && (
                      <p className="text-xs text-muted-foreground">
                        Arrastra el deslizador para recorrer el historial
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {TREND_SERIES.map((s) => (
                      <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <Switch checked={visibleSeries[s.key]} onCheckedChange={() => toggleSeries(s.key)} />
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {trend.length === 0 || trend.every((t) => !t.income && !t.expense) ? (
                  <EmptyState message="Sin movimientos registrados. Registra gastos e ingresos para ver tu evolución." />
                ) : !anySeriesVisible ? (
                  <EmptyState message="Activa al menos una serie (Ingresos, Gastos o Balance) para ver el gráfico." />
                ) : (
                  <MonthlyTrendChart trend={trend} currencyBase={currencyBase} visible={visibleSeries} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Desglose por Categoría</CardTitle>
                  <Select value={type} onValueChange={(v) => setType(v as "gasto" | "ingreso")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasto">Gastos</SelectItem>
                      <SelectItem value="ingreso">Ingresos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {report.categoryBreakdown.length === 0 ? (
                  <EmptyState message={`Sin ${type === "gasto" ? "gastos" : "ingresos"} en este mes.`} />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <CategoryPieChart data={report.categoryBreakdown} currencyBase={currencyBase} />
                    <div className="space-y-2">
                      {report.categoryBreakdown.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getColorValue(c.color) }} />
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.count} movimientos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(c.total, currencyBase)}</p>
                            <p className="text-xs text-muted-foreground">{c.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuentes">
            <Card>
              <CardHeader>
                <CardTitle>Desglose por Medio de Pago (gastos)</CardTitle>
              </CardHeader>
              <CardContent>
                {report.sourceBreakdown.length === 0 ? (
                  <EmptyState message="Sin gastos en este mes." />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <SourcePieChart data={report.sourceBreakdown} currencyBase={currencyBase} />
                    <div className="space-y-2">
                      {report.sourceBreakdown.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getColorValue(s.color) }} />
                            <p className="text-sm font-medium">{s.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(s.total, currencyBase)}</p>
                            <p className="text-xs text-muted-foreground">{s.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tendencia">
            <Card>
              <CardHeader>
                <CardTitle>Balance diario acumulado del mes</CardTitle>
              </CardHeader>
              <CardContent>
                {report.dailyBalance.every((d) => d.balance === 0) ? (
                  <EmptyState message="Sin movimientos en este mes para graficar." />
                ) : (
                  <DailyBalanceChart data={report.dailyBalance} currencyBase={currencyBase} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
