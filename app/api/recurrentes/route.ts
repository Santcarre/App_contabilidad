import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { recurringSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { generateRecurrentTransactions, formatLocalDate } from "@/lib/recurrent-generator";

async function getRecurrents(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Recurrentes!A:N");
  return getRecurrentsFromRows(res);
}

function getRecurrentsFromRows(res: any[][]): any[] {
  return res.slice(1).map((row) => ({
    id: row[0], type: row[1], amountOriginal: parseFloat(row[2]), currencyOriginal: row[3],
    categoryId: row[4], sourceId: row[5], frequency: row[6], dayOfMonth: parseInt(row[7]),
    startDate: row[8], endDate: row[9] || null, active: row[10] === "TRUE",
    nextGeneration: row[11], lastGenerated: row[12] || null, createdAt: row[13],
    note: row[14] || "",
  }));
}

async function getCategories(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Categorias!A:H");
  return getCategoriesFromRows(res);
}

function getCategoriesFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[6] === "TRUE").map((row) => ({
    id: row[0], name: row[1], type: row[2],
  }));
}

async function getSources(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Fuentes!A:H");
  return getSourcesFromRows(res);
}

function getSourcesFromRows(res: any[][]): any[] {
  return res.slice(1).filter((r) => r[6] === "TRUE").map((row) => ({
    id: row[0], name: row[1],
  }));
}

export async function GET(request: NextRequest) {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const batch = await sheets.batchGet([
      "Recurrentes!A:N",
      "Categorias!A:H",
      "Fuentes!A:H",
    ]);
    const recurrents = getRecurrentsFromRows(batch["Recurrentes!A:N"] ?? []);
    const categories = getCategoriesFromRows(batch["Categorias!A:H"] ?? []);
    const sources = getSourcesFromRows(batch["Fuentes!A:H"] ?? []);
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const srcMap = Object.fromEntries(sources.map((s) => [s.id, s.name]));

    const enriched = recurrents.map((r) => ({
      ...r,
      categoryName: catMap[r.categoryId] || "Desconocida",
      sourceName: srcMap[r.sourceId] || "Desconocida",
    }));

    return NextResponse.json({ recurrents: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = recurringSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    // Calculate nextGeneration
    const start = new Date(parsed.data.startDate + "T00:00:00");
    start.setDate(parsed.data.dayOfMonth);
    if (start < new Date(parsed.data.startDate + "T00:00:00")) {
      start.setMonth(start.getMonth() + 1);
    }
    const nextGeneration = formatLocalDate(start);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await sheets.append("Recurrentes", [
      id, parsed.data.type, parsed.data.amountOriginal, parsed.data.currencyOriginal,
      parsed.data.categoryId, parsed.data.sourceId, parsed.data.frequency, parsed.data.dayOfMonth,
      parsed.data.startDate, parsed.data.endDate || "", true, nextGeneration, "", now,
      parsed.data.note || "",
    ]);

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

    const res = await sheets.getRows("Recurrentes!A:N");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const sheetRow = rowIndex + 2;
    // Recalculate nextGeneration if dayOfMonth or startDate changed
    let nextGeneration = res[rowIndex + 1][11];
    if (data.dayOfMonth || data.startDate) {
      const day = data.dayOfMonth ?? parseInt(res[rowIndex + 1][7]);
      const start = new Date((data.startDate ?? res[rowIndex + 1][8]) + "T00:00:00");
      start.setDate(day);
      if (start < new Date()) {
        start.setMonth(start.getMonth() + 1);
      }
      nextGeneration = formatLocalDate(start);
    }

    await sheets.update(`Recurrentes!B${sheetRow}:L${sheetRow}`, [[
      data.type, data.amountOriginal, data.currencyOriginal, data.categoryId, data.sourceId,
      data.frequency, data.dayOfMonth, data.startDate, data.endDate || "",
      data.active ?? true, nextGeneration,
    ]]);

    if (data.note !== undefined) {
      await sheets.update(`Recurrentes!O${sheetRow}`, [[data.note || ""]]);
    }

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

    const res = await sheets.getRows("Recurrentes!A:N");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const sheetRow = rowIndex + 2;
    await sheets.deleteRows("Recurrentes", sheetRow);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/recurrentes/generate - Manual trigger for generation
export async function PATCH(request: NextRequest) {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const result = await generateRecurrentTransactions(sheets, spreadsheetId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}