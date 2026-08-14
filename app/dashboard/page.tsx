"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useReport } from "@/hooks/use-reports";
import { getCurrentMonth, formatCurrency } from "@/lib/utils";

function pctChange(current: number, prev: number): number | null {
  if (prev <= 0) return null;
  return (current / prev - 1) * 100;
}

function StatValue({ value, loading }: { value: string; loading: boolean }) {
  if (loading) return <div className="h-8 w-28 animate-pulse rounded bg-muted" />;
  return <div className="text-2xl font-bold">{value}</div>;
}

function StatChange({ change, loading, invertColors }: { change: number | null; loading: boolean; invertColors?: boolean }) {
  if (loading) return <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />;
  if (change === null) return <p className="text-xs text-muted-foreground">Sin datos del mes anterior</p>;
  const positive = change >= 0;
  const good = invertColors ? !positive : positive;
  return (
    <p className={`text-xs ${good ? "text-green-600" : "text-red-600"}`}>
      {change >= 0 ? "+" : ""}
      {change.toFixed(1)}% vs mes anterior
    </p>
  );
}

const quickActions = [
  { name: "Nuevo Gasto", href: "/dashboard/transacciones/nueva?type=gasto", icon: Minus, color: "bg-red-100 text-red-600" },
  { name: "Nuevo Ingreso", href: "/dashboard/transacciones/nueva?type=ingreso", icon: Plus, color: "bg-green-100 text-green-600" },
  { name: "Ver Reportes", href: "/dashboard/reportes", icon: ArrowRight, color: "bg-blue-100 text-blue-600" },
];

export default function DashboardPage() {
  const month = getCurrentMonth();
  const { data: report, isLoading } = useReport(month, "gasto");
  const base = report?.currencyBase ?? "COP";
  const s = report?.summary;

  const stats = [
    {
      name: "Ingresos del mes",
      value: s ? formatCurrency(s.income, base) : "—",
      icon: TrendingUp,
      color: "text-green-600",
      change: s ? pctChange(s.income, s.prevIncome) : null,
    },
    {
      name: "Gastos del mes",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido a tu contabilidad personal</p>
        </div>
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
              <StatChange change={stat.change} loading={isLoading} invertColors={stat.invertColors} />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Próximos pasos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Configura tus categorías en <a href="/dashboard/categorias" className="underline">Categorías</a></p>
            <p>• Define tus medios de pago en <a href="/dashboard/fuentes" className="underline">Medios de Pago</a></p>
            <p>• Establece presupuestos en <a href="/dashboard/presupuestos" className="underline">Presupuestos</a></p>
            <p>• Crea recurrentes en <a href="/dashboard/recurrentes" className="underline">Recurrentes</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}