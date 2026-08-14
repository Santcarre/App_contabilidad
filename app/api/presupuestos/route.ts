import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { budgetSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

async function getBudgets(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Presupuestos!A:G");
  return getBudgetsFromRows(res);
}

function getBudgetsFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[0]).map((row) => ({
    id: row[0], categoryId: row[1], limitAmount: parseFloat(row[2]),
    month: row[3], alert80: row[4] === "TRUE", alert100: row[5] === "TRUE", createdAt: row[6],
  }));
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

async function getSpentByCategory(sheets: SheetsClient, month: string): Promise<Record<string, number>> {
  const res = await sheets.getRows("Transacciones!A:M");
  return getSpentByCategoryFromRows(res, month);
}

function getSpentByCategoryFromRows(res: any[][], month: string): Record<string, number> {
  const spent: Record<string, number> = {};
  for (const row of res.slice(1)) {
    if (!row[0] || row[1] !== "gasto" || !row[8]?.startsWith(month)) continue;
    const categoryId = row[6];
    spent[categoryId] = (spent[categoryId] ?? 0) + (parseFloat(row[4]) || 0);
  }
  return spent;
}

export async function GET(request: NextRequest) {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const month = request.nextUrl.searchParams.get("month");
    if (!month) return NextResponse.json({ error: "MISSING_MONTH" }, { status: 400 });

    const batch = await sheets.batchGet([
      "Presupuestos!A:G",
      "Categorias!A:H",
      "Transacciones!A:M",
    ]);
    const budgets = getBudgetsFromRows(batch["Presupuestos!A:G"] ?? []);
    const categories = getCategoriesFromRows(batch["Categorias!A:H"] ?? []);
    const spentByCategory = getSpentByCategoryFromRows(batch["Transacciones!A:M"] ?? [], month);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const filtered = budgets.filter((b) => b.month === month);
    const enriched = filtered.map((b) => ({
      ...b,
      categoryName: catMap[b.categoryId]?.name || "Desconocida",
      categoryColor: catMap[b.categoryId]?.color || "gray-500",
      spent: Math.round((spentByCategory[b.categoryId] ?? 0) * 100) / 100,
    }));

    return NextResponse.json({ budgets: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const existing = await getBudgets(sheets);
    if (existing.some((b) => b.categoryId === parsed.data.categoryId && b.month === parsed.data.month)) {
      return NextResponse.json({ error: "BUDGET_EXISTS" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await sheets.append("Presupuestos", [id, parsed.data.categoryId, parsed.data.limitAmount, parsed.data.month, parsed.data.alert80, parsed.data.alert100, now]);

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

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const res = await sheets.getRows("Presupuestos!A:G");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const sheetRow = rowIndex + 2;
    await sheets.update(`Presupuestos!B${sheetRow}:F${sheetRow}`, [[
      data.categoryId, data.limitAmount, data.month, data.alert80, data.alert100,
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

    const res = await sheets.getRows("Presupuestos!A:G");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // For budgets, we actually delete the row (no soft delete)
    // In a real app, you might want to keep history. For now, we'll just clear it.
    const sheetRow = rowIndex + 2;
    await sheets.update(`Presupuestos!A${sheetRow}:G${sheetRow}`, [["", "", "", "", "", "", ""]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}