import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { NextResponse } from "next/server";

async function getConfig(sheets: SheetsClient): Promise<Record<string, any>> {
  const res = await sheets.getRows("Configuracion!A:C");
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

export async function GET() {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);
    const config = await getConfig(sheets);

    return NextResponse.json({
      theme: config.theme ?? "system",
      currencyBase: config.currencyBase ?? "COP",
      language: config.language ?? "es",
      dateFormat: config.dateFormat ?? "DD/MM/YYYY",
      budgetStrictMode: config.budgetStrictMode === true || config.budgetStrictMode === "true",
      currencies: config.currencies ?? ["USD", "EUR"],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const existing = await getConfig(sheets);
    const allowedKeys = ["theme", "currencyBase", "language", "dateFormat", "budgetStrictMode", "currencies"];
    const now = new Date().toISOString();

    for (const key of allowedKeys) {
      if (!(key in body)) continue;
      const value = body[key];
      if (value === undefined) continue;
      const raw = typeof value === "string" && !["true", "false"].includes(value) && !/^\[.*\]$/.test(value)
        ? value
        : JSON.stringify(value);

      if (key in existing) {
        const res = await sheets.getRows("Configuracion!A:C");
        const rowIndex = res.slice(1).findIndex((r) => r[0] === key);
        const sheetRow = rowIndex + 2;
        await sheets.update(`Configuracion!B${sheetRow}:C${sheetRow}`, [[raw, now]]);
      } else {
        await sheets.append("Configuracion", [key, raw, now]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
