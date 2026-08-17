import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { transactionSchema } from "@/lib/validation";
import { getRate, convertAmountToBase, parseStoredRate } from "@/lib/currency";
import { ExchangeRate } from "@/lib/currency";
import { sortTransactionsDesc } from "@/lib/transactions";
import { NextRequest, NextResponse } from "next/server";

async function getConfigFromSheet(sheets: SheetsClient): Promise<any> {
  const res = await sheets.getRows("Configuracion!A:C");
  return getConfigFromRows(res);
}

function getConfigFromRows(res: any[][]): any {
  const config: Record<string, any> = {};
  for (const row of res) {
    if (!row[0] || row[0] === "key") continue;
    let value: any = row[1];
    try {
      value = JSON.parse(row[1]);
    } catch {
      // keep raw string value
    }
    config[row[0]] = value;
  }
  return config;
}

async function getExchangeRates(sheets: SheetsClient): Promise<ExchangeRate[]> {
  const res = await sheets.getRows("TasasCambio!A:F");
  return getExchangeRatesFromRows(res);
}

function getExchangeRatesFromRows(res: any[][]): ExchangeRate[] {
  return res.slice(1).map((row) => ({
    baseCurrency: row[0],
    targetCurrency: row[1],
    rate: parseFloat(row[2]),
    source: row[3],
    date: row[4],
    fetchedAt: row[5],
  }));
}

async function getCategories(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Categorias!A:H");
  return getCategoriesFromRows(res);
}

function getCategoriesFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[6] === "TRUE").map((row) => ({
    id: row[0], name: row[1], type: row[2], icon: row[3], color: row[4], order: parseInt(row[5]),
  }));
}

async function getSources(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Fuentes!A:H");
  return getSourcesFromRows(res);
}

function getSourcesFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[6] === "TRUE").map((row) => ({
    id: row[0], name: row[1], type: row[2], icon: row[3], color: row[4], initialBalance: parseFloat(row[5]),
  }));
}

function safeAction<T>(action: () => Promise<T>) {
  return action().catch((error: any) => {
    console.error("[Server Action Error]", error);
    if (error?.code === 429) throw new Error("RATE_LIMIT");
    if (error?.code === 403) throw new Error("FORBIDDEN");
    if (error?.message?.includes("RefreshAccessTokenError")) throw new Error("TOKEN_EXPIRED");
    throw new Error("INTERNAL_ERROR");
  });
}

export async function GET(request: NextRequest) {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const sourceId = searchParams.get("sourceId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // For now, fetch all and filter in memory (TODO: optimize with range queries)
    const batch = await sheets.batchGet([
      "Transacciones!A:M",
      "Categorias!A:H",
      "Fuentes!A:H",
      "TasasCambio!A:F",
      "Configuracion!A:C",
    ]);
    const txRows = batch["Transacciones!A:M"] ?? [];
    const categories = getCategoriesFromRows(batch["Categorias!A:H"] ?? []);
    const sources = getSourcesFromRows(batch["Fuentes!A:H"] ?? []);
    const exchangeRates = getExchangeRatesFromRows(batch["TasasCambio!A:F"] ?? []);
    const config = getConfigFromRows(batch["Configuracion!A:C"] ?? []);

    const currencyBase = config.currencyBase || "COP";

    let transactions = txRows.slice(1).map((row) => ({
      id: row[0],
      type: row[1],
      amountOriginal: parseFloat(row[2]),
      currencyOriginal: row[3],
      amountBase: parseFloat(row[4]),
      currencyBase: row[5],
      categoryId: row[6],
      sourceId: row[7],
      date: row[8],
      note: row[9],
      recurringId: row[10],
      createdAt: row[11],
      updatedAt: row[12],
    }));

    // Apply filters
    if (startDate) transactions = transactions.filter((t) => t.date >= startDate);
    if (endDate) transactions = transactions.filter((t) => t.date <= endDate);
    if (type) transactions = transactions.filter((t) => t.type === type);
    if (categoryId) transactions = transactions.filter((t) => t.categoryId === categoryId);
    if (sourceId) transactions = transactions.filter((t) => t.sourceId === sourceId);

    // Sort by date desc (ties: createdAt desc — mismo día, el más reciente arriba)
    transactions = sortTransactionsDesc(transactions);

    // Paginate
    const total = transactions.length;
    transactions = transactions.slice(offset, offset + limit);

    // Enrich with category/source names + icons/colors
    const catMap = Object.fromEntries(
      categories.map((c) => [c.id, { name: c.name, icon: c.icon, color: c.color }])
    );
    const srcMap = Object.fromEntries(
      sources.map((s) => [s.id, { name: s.name, icon: s.icon, color: s.color }])
    );

    const enriched = transactions.map((t) => {
      const src = srcMap[t.sourceId];
      const cat = catMap[t.categoryId];
      return {
        ...t,
        categoryName: cat?.name || "Desconocida",
        categoryIcon: cat?.icon,
        categoryColor: cat?.color,
        sourceName: src?.name || "Desconocida",
        sourceIcon: src?.icon,
        sourceColor: src?.color,
      };
    });

    return NextResponse.json({ transactions: enriched, total, limit, offset });
  } catch (error: any) {
    console.error("GET /api/transacciones error:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const [categories, sources, exchangeRates, config] = await Promise.all([
      getCategories(sheets),
      getSources(sheets),
      getExchangeRates(sheets),
      getConfigFromSheet(sheets),
    ]);

    const currencyBase = config.currencyBase || "COP";
    const category = categories.find((c) => c.id === parsed.data.categoryId);
    const source = sources.find((s) => s.id === parsed.data.sourceId);

    if (!category) throw new Error("CATEGORY_NOT_FOUND");
    if (!source) throw new Error("SOURCE_NOT_FOUND");
    if (category.type !== parsed.data.type) throw new Error("CATEGORY_TYPE_MISMATCH");

    // Calculate amountBase
    let amountBase = parsed.data.amountOriginal;
    if (parsed.data.currencyOriginal !== currencyBase) {
      const manualRates = exchangeRates.filter((r) => r.source === "manual" && r.baseCurrency === currencyBase);
      const autoRates = exchangeRates.filter((r) => r.source === "auto" && r.baseCurrency === currencyBase);
      const rate = getRate(currencyBase, parsed.data.currencyOriginal, parsed.data.date, manualRates, autoRates);
      amountBase = parsed.data.amountOriginal * rate;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await sheets.append("Transacciones", [
      id,
      parsed.data.type,
      parsed.data.amountOriginal,
      parsed.data.currencyOriginal,
      Math.round(amountBase * 100) / 100,
      currencyBase,
      parsed.data.categoryId,
      parsed.data.sourceId,
      parsed.data.date,
      parsed.data.note || "",
      parsed.data.recurringId || "",
      now,
      now,
    ]);

    let budgetAlert: { level: "warning" | "exceeded"; categoryName: string; spent: number; limit: number; currency: string } | null = null;
    if (parsed.data.type === "gasto") {
      const month = parsed.data.date.slice(0, 7);
      const budgetsRes = await sheets.getRows("Presupuestos!A:H");
      const budget = budgetsRes
        .slice(1)
        .find((r) => r[0] && r[1] === parsed.data.categoryId && r[3] === month);
      if (budget) {
        const budgetBase = budget[7] || "COP";
        const ratesRes = await sheets.getRows("TasasCambio!A:F");
        const rateRows = ratesRes.slice(1).filter((r) => r[0]).map((r) => ({
          baseCurrency: r[0],
          targetCurrency: r[1],
          rate: parseStoredRate(r[2]),
          source: r[3] === "manual" ? ("manual" as const) : ("auto" as const),
          date: r[4],
          fetchedAt: r[5],
        }));
        const today = new Date().toISOString().split("T")[0];
        const limit = convertAmountToBase(parseFloat(budget[2]) || 0, budgetBase, currencyBase, today, rateRows);
        const txRows = await sheets.getRows("Transacciones!A:M");
        const spent =
          txRows
            .slice(1)
            .filter((r) => r[0] && r[1] === "gasto" && r[6] === parsed.data.categoryId && r[8]?.startsWith(month))
            .reduce((sum, r) => sum + convertAmountToBase(parseFloat(r[4]) || 0, r[5] || "COP", currencyBase, r[8], rateRows), 0) + amountBase;
        const pct = limit > 0 ? spent / limit : 1;
        if (pct >= 1 && budget[5] === "TRUE") {
          budgetAlert = { level: "exceeded", categoryName: category.name, spent: Math.round(spent * 100) / 100, limit, currency: currencyBase };
        } else if (pct >= 0.8 && budget[4] === "TRUE") {
          budgetAlert = { level: "warning", categoryName: category.name, spent: Math.round(spent * 100) / 100, limit, currency: currencyBase };
        }
      }
    }

    return NextResponse.json({ success: true, id, budgetAlert });
  } catch (error: any) {
    console.error("POST /api/transacciones error:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const res = await sheets.getRows("Transacciones!A:M");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const [categories, sources, exchangeRates, config] = await Promise.all([
      getCategories(new SheetsClient(accessToken, spreadsheetId)),
      getSources(new SheetsClient(accessToken, spreadsheetId)),
      getExchangeRates(new SheetsClient(accessToken, spreadsheetId)),
      getConfigFromSheet(new SheetsClient(accessToken, spreadsheetId)),
    ]);

    const currencyBase = config.currencyBase || "COP";
    let amountBase = parsed.data.amountOriginal;
    if (parsed.data.currencyOriginal !== currencyBase) {
      const manualRates = exchangeRates.filter((r) => r.source === "manual" && r.baseCurrency === currencyBase);
      const autoRates = exchangeRates.filter((r) => r.source === "auto" && r.baseCurrency === currencyBase);
      const rate = getRate(currencyBase, parsed.data.currencyOriginal, parsed.data.date, manualRates, autoRates);
      amountBase = parsed.data.amountOriginal * rate;
    }

    const sheetRow = rowIndex + 2;
    await sheets.update(`Transacciones!B${sheetRow}:M${sheetRow}`, [[
      parsed.data.type,
      parsed.data.amountOriginal,
      parsed.data.currencyOriginal,
      Math.round(amountBase * 100) / 100,
      currencyBase,
      parsed.data.categoryId,
      parsed.data.sourceId,
      parsed.data.date,
      parsed.data.note || "",
      parsed.data.recurringId || "",
      "",
      new Date().toISOString(),
    ]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/transacciones error:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const res = await sheets.getRows("Transacciones!A:M");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const sheetRow = rowIndex + 2;
    await sheets.deleteRows("Transacciones", sheetRow);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/transacciones error:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}