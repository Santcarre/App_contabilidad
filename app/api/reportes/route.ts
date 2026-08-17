import { NextRequest, NextResponse } from "next/server";
import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import {
  buildCategoryBreakdown,
  buildDailyBalance,
  buildFullTrend,
  buildSourceBreakdown,
  summarizeWithPrev,
  summarizeWithPrevPeriod,
  type Period,
  type ReportTransaction,
} from "@/lib/reports";
import { convertAmountToBase, parseStoredRate, type RateRow } from "@/lib/currency";

export const dynamic = "force-dynamic";

function getConfigFromRows(res: any[][]): Record<string, any> {
  const config: Record<string, any> = {};
  for (const row of res) {
    if (!row[0] || row[0] === "key") continue;
    try {
      config[row[0]] = JSON.parse(row[1]);
    } catch {
      config[row[0]] = row[1];
    }
  }
  return config;
}

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const typeParam = request.nextUrl.searchParams.get("type");
    const type = typeParam === "ingreso" ? "ingreso" : "gasto";

    const periodParam = request.nextUrl.searchParams.get("period");
    const period: Period = periodParam === "day" || periodParam === "week" ? periodParam : "month";
    const dateParam = request.nextUrl.searchParams.get("date");
    const today = new Date().toISOString().slice(0, 10);
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month debe ser YYYY-MM" }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const batch = await sheets.batchGet([
      "Transacciones!A:M",
      "Categorias!A:H",
      "Fuentes!A:H",
      "Configuracion!A:C",
      "TasasCambio!A:F",
    ]);

    const config = getConfigFromRows(batch["Configuracion!A:C"] ?? []);
    const currencyBase = config.currencyBase || "COP";

    const rateRows: RateRow[] = (batch["TasasCambio!A:F"] ?? [])
      .slice(1)
      .filter((r) => r[0])
      .map((r) => ({
        baseCurrency: r[0],
        targetCurrency: r[1],
        rate: parseStoredRate(r[2]),
        source: r[3] === "manual" ? "manual" : "auto",
        date: r[4],
        fetchedAt: r[5],
      }));

    const txRows = (batch["Transacciones!A:M"] ?? []).slice(1).filter((r) => r[0]);
    const catRows = batch["Categorias!A:H"] ?? [];
    const srcRows = batch["Fuentes!A:H"] ?? [];

    const categories = new Map<string, { name: string; color: string }>();
    for (const r of catRows.slice(1)) {
      if (r[0]) categories.set(r[0], { name: r[1], color: r[4] ?? "#64748b" });
    }
    const sources = new Map<string, { name: string; color: string }>();
    for (const r of srcRows.slice(1)) {
      if (r[0]) sources.set(r[0], { name: r[1], color: r[4] ?? "#64748b" });
    }

    const transactions: ReportTransaction[] = txRows.map((row) => {
      const categoryId = row[6];
      const sourceId = row[7];
      const cat = categories.get(categoryId);
      const src = sources.get(sourceId);
      const txBase = row[5] || "COP";
      const txDate = row[8] || new Date().toISOString().split("T")[0];
      return {
        id: row[0],
        type: row[1] as "gasto" | "ingreso",
        amountBase: convertAmountToBase(parseFloat(row[4]) || 0, txBase, currencyBase, txDate, rateRows),
        amountOriginal: parseFloat(row[2]) || 0,
        currencyOriginal: row[3] || "COP",
        date: row[8],
        categoryId,
        categoryName: cat?.name ?? "Sin categoría",
        categoryColor: cat?.color ?? "#64748b",
        sourceId,
        sourceName: src?.name ?? "Sin fuente",
        sourceColor: src?.color,
        note: row[9] || undefined,
      };
    });

    const summary =
      period === "month" ? summarizeWithPrev(transactions, month) : summarizeWithPrevPeriod(transactions, period, date);
    const trend = buildFullTrend(transactions, month);
    const categoryBreakdown = buildCategoryBreakdown(transactions, month, type);
    const sourceBreakdown = buildSourceBreakdown(transactions, month, "gasto");
    const dailyBalance = buildDailyBalance(transactions, month);

    return NextResponse.json({
      currencyBase,
      summary,
      trend,
      categoryBreakdown,
      sourceBreakdown,
      dailyBalance,
    });
  } catch (error: any) {
    console.error("GET /api/reportes error:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}