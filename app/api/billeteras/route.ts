import { NextRequest, NextResponse } from "next/server";
import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { computeWallets, type WalletSource, type WalletTransaction } from "@/lib/wallets";
import { parseStoredRate, type RateRow } from "@/lib/currency";

export const dynamic = "force-dynamic";

function serverToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

export async function GET(request: NextRequest) {
  try {
    // El cliente envía su fecha local para que el "día" respete su zona horaria.
    const todayParam = request.nextUrl.searchParams.get("today");
    const today = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : serverToday();

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

    const sources: WalletSource[] = (batch["Fuentes!A:H"] ?? [])
      .slice(1)
      .filter((r) => r[0])
      .map((r) => ({
        id: r[0],
        name: r[1],
        type: r[2],
        icon: r[3],
        color: r[4],
        initialBalance: parseFloat(r[5]) || 0,
        active: r[6] === "TRUE",
      }));

    const categories = new Map<string, string>();
    for (const r of (batch["Categorias!A:H"] ?? []).slice(1)) {
      if (r[0]) categories.set(r[0], r[1]);
    }

    const transactions: WalletTransaction[] = (batch["Transacciones!A:M"] ?? [])
      .slice(1)
      .filter((r) => r[0] && r[7])
      .map((r) => ({
        id: r[0],
        type: r[1] === "ingreso" ? "ingreso" : "gasto",
        amountOriginal: parseFloat(r[2]) || 0,
        currencyOriginal: r[3] || "COP",
        amountBase: 0,
        date: r[8],
        sourceId: r[7],
        categoryName: categories.get(r[6]) ?? undefined,
        note: r[9] || undefined,
      }));

    const wallets = computeWallets(sources, transactions, currencyBase, rateRows, today);
    return NextResponse.json({ wallets, currencyBase, today });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}