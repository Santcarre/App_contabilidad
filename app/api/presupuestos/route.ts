import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { budgetSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { localDateString } from "@/lib/utils";
import { convertAmountToBase, parseStoredRate, type RateRow } from "@/lib/currency";
import { budgetPeriodKey, budgetPeriodRange, type BudgetPeriod } from "@/lib/reports";

function getBudgetsFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[0]).map((row) => ({
    id: row[0], categoryId: row[1], limitAmount: parseFloat(row[2]),
    periodKey: row[3], alert80: row[4] === "TRUE", alert100: row[5] === "TRUE", createdAt: row[6],
    currencyBase: row[7] || "COP",
    periodo: (row[8] as BudgetPeriod) || "mes",
  }));
}

// El values.append de Google Sheets escribió presupuestos en las columnas
// I..Q (en vez de A..I) cuando el encabezado tenía la columna Periodo recién
// agregada. Detecta esas filas (A vacío pero id en la columna I) y las
// desplaza a A..I. Es idempotente.
async function migrateBudgetLayout(sheets: SheetsClient): Promise<void> {
  const res = await sheets.getRows("Presupuestos!A1:Q100");
  const moves: { row: number; values: any[] }[] = [];
  for (let i = 1; i < res.length; i++) {
    const row = res[i];
    if (!row[0] && row[8]) {
      moves.push({ row: i + 1, values: row.slice(8, 17) });
    }
  }
  if (moves.length === 0) return;
  await sheets.batchUpdate([
    ...moves.map((m) => ({ range: `Presupuestos!A${m.row}:I${m.row}`, values: [m.values] })),
    ...moves.map((m) => ({ range: `Presupuestos!J${m.row}:Q${m.row}`, values: [[...Array(8).fill("")]] })),
  ]);
}

async function getCategories(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Categorias!A:H");
  return getCategoriesFromRows(res);
}

function getCategoriesFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[6] === "TRUE" && r[2] === "gasto").map((row) => ({
    id: row[0], name: row[1], color: row[4],
  }));
}

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

function getSpentByCategoryFromRows(res: any[][], start: string, end: string, currencyBase: string, rateRows: RateRow[]): Record<string, number> {
  const spent: Record<string, number> = {};
  for (const row of res.slice(1)) {
    const date = row[8];
    if (!row[0] || row[1] !== "gasto" || !date || date < start || date > end) continue;
    const categoryId = row[6];
    const txBase = row[5] || "COP";
    const amount = convertAmountToBase(parseFloat(row[4]) || 0, txBase, currencyBase, date, rateRows);
    spent[categoryId] = (spent[categoryId] ?? 0) + amount;
  }
  return spent;
}

export async function GET(request: NextRequest) {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);
    await migrateBudgetLayout(sheets);

    const periodoParam = request.nextUrl.searchParams.get("periodo");
    const fechaParam = request.nextUrl.searchParams.get("fecha");
    const periodo: BudgetPeriod = periodoParam === "dia" || periodoParam === "semana" ? periodoParam : "mes";
    const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : localDateString();
    const key = budgetPeriodKey(periodo, fecha);
    const range = budgetPeriodRange(periodo, fecha);

    const batch = await sheets.batchGet([
      "Presupuestos!A:I",
      "Categorias!A:H",
      "Transacciones!A:M",
      "Configuracion!A:C",
      "TasasCambio!A:F",
    ]);
    const budgets = getBudgetsFromRows(batch["Presupuestos!A:I"] ?? []);
    const categories = getCategoriesFromRows(batch["Categorias!A:H"] ?? []);
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
    const spentByCategory = getSpentByCategoryFromRows(batch["Transacciones!A:M"] ?? [], range.start, range.end, currencyBase, rateRows);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const filtered = budgets.filter((b) => b.periodo === periodo && b.periodKey === key);
    const enriched = filtered.map((b) => ({
      ...b,
      categoryName: catMap[b.categoryId]?.name || "Desconocida",
      categoryColor: catMap[b.categoryId]?.color || "gray-500",
      limitAmount: convertAmountToBase(b.limitAmount, b.currencyBase, currencyBase, fecha, rateRows),
      spent: Math.round((spentByCategory[b.categoryId] ?? 0) * 100) / 100,
    }));

    return NextResponse.json({ budgets: enriched, currencyBase });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos del presupuesto." }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);
    await migrateBudgetLayout(sheets);

    const res = await sheets.getRows("Presupuestos!A:I");
    const existing = getBudgetsFromRows(res);
    const periodKey = budgetPeriodKey(parsed.data.periodo, parsed.data.fecha);
    if (existing.some((b) => b.categoryId === parsed.data.categoryId && b.periodo === parsed.data.periodo && b.periodKey === periodKey)) {
      return NextResponse.json({ error: "Ya tienes un presupuesto para esta categoría en este período." }, { status: 409 });
    }

    const config = getConfigFromRows(await sheets.getRows("Configuracion!A:C"));
    const currencyBase = config.currencyBase || "COP";

    // Migración: añade la columna Periodo al encabezado de hojas creadas antes de esta versión.
    // Si falla, no debe bloquear la creación del presupuesto.
    try {
      const header = await sheets.getRows("Presupuestos!A1:I1");
      if (!header[0]?.[8]) {
        await sheets.update("Presupuestos!I1", [["Periodo"]]);
      }
    } catch {
      // migración opcional
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Escritura explícita en la siguiente fila libre (values.append es poco
    // confiable cuando el encabezado tiene huecos y desplaza las columnas).
    const nextRow = res.length + 1;
    await sheets.update(`Presupuestos!A${nextRow}:I${nextRow}`, [[
      id, parsed.data.categoryId, parsed.data.limitAmount, periodKey, parsed.data.alert80, parsed.data.alert100, now, currencyBase, parsed.data.periodo,
    ]]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const parsed = budgetSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos del presupuesto." }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);
    await migrateBudgetLayout(sheets);

    const res = await sheets.getRows("Presupuestos!A:I");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
    const existing = res.slice(1)[rowIndex];

    const periodKey = budgetPeriodKey(parsed.data.periodo, parsed.data.fecha);
    const sheetRow = rowIndex + 2;
    await sheets.update(`Presupuestos!B${sheetRow}:I${sheetRow}`, [[
      parsed.data.categoryId,
      parsed.data.limitAmount,
      periodKey,
      parsed.data.alert80,
      parsed.data.alert100,
      existing[6] ?? new Date().toISOString(),
      existing[7] || "COP",
      parsed.data.periodo,
    ]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    await migrateBudgetLayout(sheets);

    const res = await sheets.getRows("Presupuestos!A:I");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const sheetRow = rowIndex + 2;
    await sheets.update(`Presupuestos!A${sheetRow}:I${sheetRow}`, [["", "", "", "", "", "", "", "", ""]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}