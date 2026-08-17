"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionDetailsDialog } from "@/components/transaccion-detalle";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useReport } from "@/hooks/use-reports";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { getCurrentMonth, formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/currency";
import { CategoryIcon } from "@/components/ui/icon-picker";
import type { Period } from "@/lib/reports";

function pctChange(current: number, prev: number): number | null {
  if (prev <= 0) return null;
  return (current / prev - 1) * 100;
}

function StatValue({ value, loading }: { value: string; loading: boolean }) {
  if (loading) return <div className="h-8 w-28 animate-pulse rounded bg-muted" />;
  return <div className="text-2xl font-bold">{value}</div>;
}

function StatChange({
  change,
  loading,
  invertColors,
  noDataText,
  prevText,
}: {
  change: number | null;
  loading: boolean;
  invertColors?: boolean;
  noDataText: string;
  prevText: string;
}) {
  if (loading) return <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />;
  if (change === null) return <p className="text-xs text-muted-foreground">Sin datos de {noDataText}</p>;
  const positive = change >= 0;
  const good = invertColors ? !positive : positive;
  return (
    <p className={`text-xs ${good ? "text-green-600" : "text-red-600"}`}>
      {change >= 0 ? "+" : ""}
      {change.toFixed(1)}% vs {prevText}
    </p>
  );
}

const PERIOD_LABELS: Record<Period, { noun: string; prev: string }> = {
  day: { noun: "de hoy", prev: "ayer" },
  week: { noun: "de la semana", prev: "la semana anterior" },
  month: { noun: "del mes", prev: "el mes anterior" },
};

const quickActions = [
  { name: "Nuevo Gasto", href: "/dashboard/transacciones/nueva?type=gasto", icon: Minus, color: "bg-red-100 text-red-600" },
  { name: "Nuevo Ingreso", href: "/dashboard/transacciones/nueva?type=ingreso", icon: Plus, color: "bg-green-100 text-green-600" },
  { name: "Ver Reportes", href: "/dashboard/reportes", icon: ArrowRight, color: "bg-blue-100 text-blue-600" },
];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export default function DashboardPage() {
  const month = getCurrentMonth();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const labels = PERIOD_LABELS[period];
  const { data: report, isLoading } = useReport(month, "gasto", period);
  const { data: recentData, isLoading: recentLoading } = useTransactions({ limit: 5 });
  const base = report?.currencyBase ?? "COP";
  const s = report?.summary;
  const recent = recentData?.transactions ?? [];

  const stats = [
    {
      name: `Ingresos ${labels.noun}`,
      value: s ? formatCurrency(s.income, base) : "—",
      icon: TrendingUp,
      color: "text-green-600",
      change: s ? pctChange(s.income, s.prevIncome) : null,
    },
    {
      name: `Gastos ${labels.noun}`,
      value: s ? formatCurrency(s.expense, base) : "—",
      icon: TrendingDown,
      color: "text-red-600",
      change: s ? pctChange(s.expense, s.prevExpense) : null,
      invertColors: true,
    },
    {
      name: "Balance",
      value: s ? formatCurrency(s.balance, base) : "—",
      icon: Minus,
      color: s && s.balance >= 0 ? "text-green-600" : "text-red-600",
      change: s ? pctChange(s.balance, s.prevBalance) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
          <p className="text-muted-foreground">Bienvenido a tu contabilidad personal</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <StatValue value={stat.value} loading={isLoading} />
              <StatChange
                change={stat.change}
                loading={isLoading}
                invertColors={stat.invertColors}
                noDataText={labels.prev}
                prevText={labels.prev}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.name} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{action.name}</p>
                    <p className="text-sm text-muted-foreground">Acceso rápido</p>
                  </div>
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Últimas transacciones</CardTitle>
          <Link href="/dashboard/transacciones" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin transacciones todavía. Crea la primera.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((tx) => {
                const isIncome = tx.type === "ingreso";
                return (
                  <li
                    key={tx.id}
                    className="rounded-lg border transition-colors hover:bg-accent"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Ver detalles de ${tx.note || tx.categoryName || "la transacción"}`}
                    >
                      <span
                        className={`rounded-full p-1.5 ${isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                      >
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      {tx.sourceIcon && (
                        <span className="rounded-md bg-muted p-1.5" title={tx.sourceName}>
                          <CategoryIcon name={tx.sourceIcon} color={tx.sourceColor} className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tx.note || tx.categoryName || "Sin descripción"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)} · {tx.sourceName || "Sin fuente"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-green-600" : "text-red-600"}`}>
                          {isIncome ? "+" : "−"}
                          {formatCurrency(tx.amountOriginal, tx.currencyOriginal)}
                        </p>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tx.currencyOriginal}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <TransactionDetailsDialog tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}