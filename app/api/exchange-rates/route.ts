import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { fetchLatestRates, getCopRates, DEFAULT_CURRENCIES } from "@/lib/currency";
import { NextRequest, NextResponse } from "next/server";

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
    const baseCurrency = config.currencyBase || "COP";

    const ratesRes = await sheets.getRows("TasasCambio!A:F");
    const rates = ratesRes.slice(1).map((row) => ({
      baseCurrency: row[0], targetCurrency: row[1], rate: parseFloat(row[2]),
      source: row[3], date: row[4], fetchedAt: row[5],
    }));

    return NextResponse.json({ rates, baseCurrency, currencies: config.currencies ?? DEFAULT_CURRENCIES });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetCurrency, rate } = body;
    if (!targetCurrency || typeof rate !== "number" || rate <= 0) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const config = await getConfig(sheets);
    const baseCurrency = config.currencyBase || "COP";

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const ratesRes = await sheets.getRows("TasasCambio!A:F");
    const rowIndex = ratesRes.slice(1).findIndex(
      (r) => r[0] === baseCurrency && r[1] === targetCurrency && r[4] === today
    );

    if (rowIndex !== -1) {
      const sheetRow = rowIndex + 2;
      await sheets.update(`TasasCambio!C${sheetRow}:F${sheetRow}`, [[rate, "manual", today, now]]);
    } else {
      await sheets.append("TasasCambio", [baseCurrency, targetCurrency, rate, "manual", today, now]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const config = await getConfig(sheets);
    const baseCurrency = config.currencyBase || "COP";
    const targets = (config.currencies ?? DEFAULT_CURRENCIES) as string[];

    const eurRates = await fetchLatestRates();
    const copRates = getCopRates(eurRates);

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const ratesRes = await sheets.getRows("TasasCambio!A:F");
    const rows = ratesRes.slice(1);

    let updated = 0;
    let appended = 0;
    for (const target of targets) {
      if (!(target in copRates)) continue;
      const rowIndex = rows.findIndex((r) => r[0] === baseCurrency && r[1] === target && r[4] === today);
      if (rowIndex !== -1) {
        if (rows[rowIndex][3] === "manual") continue;
        const sheetRow = rowIndex + 2;
        await sheets.update(`TasasCambio!C${sheetRow}:F${sheetRow}`, [[copRates[target as "USD" | "EUR"], "auto", today, now]]);
        updated++;
      } else {
        await sheets.append("TasasCambio", [baseCurrency, target, copRates[target as "USD" | "EUR"], "auto", today, now]);
        appended++;
      }
    }

    return NextResponse.json({ success: true, updated, appended });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
