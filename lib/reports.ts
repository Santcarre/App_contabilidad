export interface ReportTransaction {
  id: string;
  type: "gasto" | "ingreso";
  amountBase: number;
  amountOriginal: number;
  currencyOriginal: string;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  sourceId: string;
  sourceName: string;
  note?: string;
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  prevIncome: number;
  prevExpense: number;
  prevBalance: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface BreakdownItem {
  id: string;
  name: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyPoint {
  date: string;
  balance: number;
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function isInMonth(dateStr: string, month: string): boolean {
  return dateStr.startsWith(month);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function summarizeMonth(transactions: ReportTransaction[], month: string): { income: number; expense: number; balance: number } {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (!isInMonth(tx.date, month)) continue;
    if (tx.type === "ingreso") income += tx.amountBase;
    else expense += tx.amountBase;
  }
  return { income: round2(income), expense: round2(expense), balance: round2(income - expense) };
}

export function summarizeWithPrev(transactions: ReportTransaction[], month: string): MonthSummary {
  const current = summarizeMonth(transactions, month);
  const prevMonth = shiftMonth(month, -1);
  const prev = summarizeMonth(transactions, prevMonth);
  return { ...current, prevIncome: prev.income, prevExpense: prev.expense, prevBalance: prev.balance };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyTrend(transactions: ReportTransaction[], endMonth: string, count = 12): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonth(endMonth, -i);
    const s = summarizeMonth(transactions, month);
    points.push({ month, ...s });
  }
  return points;
}

export function buildFullTrend(transactions: ReportTransaction[], endMonth: string): TrendPoint[] {
  let startMonth = endMonth;
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    if (key < startMonth) startMonth = key;
  }
  if (startMonth > endMonth) return [];
  const points: TrendPoint[] = [];
  let month = startMonth;
  let guard = 0;
  while (month <= endMonth && guard < 600) {
    const s = summarizeMonth(transactions, month);
    points.push({ month, ...s });
    month = shiftMonth(month, 1);
    guard++;
  }
  return points;
}

export function buildCategoryBreakdown(
  transactions: ReportTransaction[],
  month: string,
  type: "gasto" | "ingreso"
): BreakdownItem[] {
  const totals = new Map<string, { name: string; color: string; total: number; count: number }>();
  let grandTotal = 0;
  for (const tx of transactions) {
    if (!isInMonth(tx.date, month) || tx.type !== type) continue;
    const entry = totals.get(tx.categoryId) ?? { name: tx.categoryName, color: tx.categoryColor, total: 0, count: 0 };
    entry.total += tx.amountBase;
    entry.count += 1;
    totals.set(tx.categoryId, entry);
    grandTotal += tx.amountBase;
  }
  return [...totals.entries()]
    .map(([id, e]) => ({
      id,
      name: e.name,
      color: e.color,
      total: round2(e.total),
      count: e.count,
      percentage: grandTotal > 0 ? round2((e.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildSourceBreakdown(transactions: ReportTransaction[], month: string, type: "gasto" | "ingreso"): BreakdownItem[] {
  const totals = new Map<string, { name: string; color: string; total: number; count: number }>();
  let grandTotal = 0;
  for (const tx of transactions) {
    if (!isInMonth(tx.date, month) || tx.type !== type) continue;
    const entry = totals.get(tx.sourceId) ?? { name: tx.sourceName, color: "#64748b", total: 0, count: 0 };
    entry.total += tx.amountBase;
    entry.count += 1;
    totals.set(tx.sourceId, entry);
    grandTotal += tx.amountBase;
  }
  return [...totals.entries()]
    .map(([id, e]) => ({
      id,
      name: e.name,
      color: e.color,
      total: round2(e.total),
      count: e.count,
      percentage: grandTotal > 0 ? round2((e.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildDailyBalance(transactions: ReportTransaction[], month: string): DailyPoint[] {
  const byDay = new Map<string, number>();
  for (const tx of transactions) {
    if (!isInMonth(tx.date, month)) continue;
    byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + (tx.type === "ingreso" ? tx.amountBase : -tx.amountBase));
  }
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  let running = 0;
  const points: DailyPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    running = round2(running + (byDay.get(dateStr) ?? 0));
    points.push({ date: dateStr, balance: running });
  }
  return points;
}
