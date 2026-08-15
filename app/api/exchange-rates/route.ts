import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { fetchLatestRates, getCopRates, parseStoredRate, DEFAULT_CURRENCIES } from "@/lib/currency";
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
    const baseCurrency = config.currencyBase || "COP";

    const ratesRes = await sheets.getRows("TasasCambio!A:F");
    const rates = ratesRes.slice(1).map((row) => ({
      baseCurrency: row[0], targetCurrency: row[1], rate: parseStoredRate(row[2]),
      source: row[3], date: row[4], fetchedAt: row[5],
    }));

    return NextResponse.json({ rates, baseCurrency, currencies: config.currencies ?? DEFAULT_CURRENCIES });
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
    const copRates = getCopRates(eurRates); // lanza si Frankfurter no trae COP

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const ratesRes = await sheets.getRows("TasasCambio!A:F");
    const rows = ratesRes.slice(1);

    const isValidRate = (v: any) => {
      const n = parseStoredRate(v);
      return Number.isFinite(n) && n > 0;
    };

    let updated = 0;
    let appended = 0;
    let deleted = 0;

    for (const target of targets) {
      const rate = copRates[target];
      // Nunca escribir NaN/undefined en la hoja
      if (!Number.isFinite(rate) || rate <= 0) continue;

      // Filas de hoy para (base, target): manual > auto. Las corruptas
      // (tasa vacía/NaN) y duplicadas se eliminan (descendente, para no
      // correr los índices al borrar).
      const matching = rows
        .map((row, i) => ({ row, sheetRow: i + 2 }))
        .filter(({ row }) => row[0] === baseCurrency && row[1] === target && row[4] === today);

      const keeper =
        matching.find(({ row }) => isValidRate(row[2]) && row[3] === "manual") ??
        matching.find(({ row }) => isValidRate(row[2]) && row[3] === "auto");

      const toDelete = matching
        .filter((m) => m !== keeper)
        .sort((a, b) => b.sheetRow - a.sheetRow);
      for (const d of toDelete) {
        await sheets.deleteRows("TasasCambio", d.sheetRow);
        deleted++;
      }

      if (keeper) {
        // Si el que queda es manual, prevalece: no lo pisamos
        if (keeper.row[3] === "manual") continue;
        const removedBefore = toDelete.filter((d) => d.sheetRow < keeper.sheetRow).length;
        const sheetRow = keeper.sheetRow - removedBefore;
        await sheets.update(`TasasCambio!C${sheetRow}:F${sheetRow}`, [[rate, "auto", today, now]]);
        updated++;
      } else {
        await sheets.append("TasasCambio", [baseCurrency, target, rate, "auto", today, now]);
        appended++;
      }
    }

    return NextResponse.json({ success: true, updated, appended, deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
