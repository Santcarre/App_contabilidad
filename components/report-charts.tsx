"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseISO } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { getColorValue } from "@/lib/color-map";

export function MonthlyTrendChart({
  trend,
  currencyBase,
  visible,
}: {
  trend: any[];
  currencyBase: string;
  visible: { income: boolean; expense: boolean; balance: boolean };
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={trend}>
        <XAxis dataKey="month" type="category" minTickGap={24} tickFormatter={(m) => format(parseISO(m + "-01"), "MMM yy", { locale: es })} />
        <YAxis width={100} tickFormatter={(v) => formatCurrency(Number(v ?? 0), currencyBase)} />
        <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0), currencyBase)]} labelFormatter={(m) => format(parseISO(String(m) + "-01"), "MMMM yyyy", { locale: es })} />
        <Legend />
        {visible.income && <Bar dataKey="income" fill="#22c55e" name="Ingresos" radius={[4, 4, 0, 0]} />}
        {visible.expense && <Bar dataKey="expense" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />}
        {visible.balance && <Bar dataKey="balance" fill="#3b82f6" name="Balance" radius={[4, 4, 0, 0]} />}
        {trend.length > 12 && (
          <Brush
            dataKey="month"
            height={28}
            travellerWidth={12}
            stroke="hsl(var(--border))"
            fill="hsl(var(--muted))"
            startIndex={trend.length - 12}
            endIndex={trend.length - 1}
            traveller={({ x, y, width, height }: any) => (
              <rect x={x} y={y} width={width} height={height} fill="hsl(var(--primary))" rx={3} />
            )}
            tickFormatter={(m) => format(parseISO(String(m) + "-01"), "MMM", { locale: es })}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data, currencyBase }: { data: any[]; currencyBase: string }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
          dataKey="total"
          nameKey="name"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {data.map((c) => (
            <Cell key={c.id} fill={getColorValue(c.color)} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0), currencyBase)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SourcePieChart({ data, currencyBase }: { data: any[]; currencyBase: string }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
          dataKey="total"
          nameKey="name"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {data.map((s) => (
            <Cell key={s.id} fill={getColorValue(s.color)} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0), currencyBase)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DailyBalanceChart({ data, currencyBase }: { data: any[]; currencyBase: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" type="category" tickFormatter={(v) => format(parseISO(String(v)), "dd")} />
        <YAxis tickFormatter={(v) => formatCurrency(Number(v ?? 0), currencyBase)} />
        <Tooltip formatter={(v) => [formatCurrency(Number(v ?? 0), currencyBase)]} labelFormatter={(d) => format(parseISO(String(d)), "dd MMM yyyy", { locale: es })} />
        <Area type="monotone" dataKey="balance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}