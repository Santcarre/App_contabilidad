import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { fetchLatestRates, DEFAULT_CURRENCIES } from "@/lib/currency";

export const dynamic = "force-dynamic";

const USERS_SPREADSHEET_ID = process.env.GOOGLE_USERS_SPREADSHEET_ID ?? "";
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SERVICE_ACCOUNT_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n");
const CRON_SECRET = process.env.CRON_SECRET ?? "";

function getServiceAccountAuth() {
  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
  });
}

async function getActiveUsers() {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SPREADSHEET_ID,
    range: "Usuarios!A:J",
  });
  const rows = res.data.values ?? [];
  return rows.slice(1)
    .filter((r) => r[9] === "TRUE" && r[5])
    .map((row) => ({
      email: row[0],
      spreadsheetId: row[5],
      currencyBase: row[6] || "COP",
    }));
}

async function getUserCurrencies(sheets: any, spreadsheetId: string): Promise<string[]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Configuracion!A:C",
    });
    const rows = res.data.values ?? [];
    const row = rows.slice(1).find((r: string[]) => r[0] === "currencies");
    if (row?.[1]) {
      try {
        return JSON.parse(row[1]);
      } catch {
        return DEFAULT_CURRENCIES;
      }
    }
  } catch {
    // fallthrough
  }
  return DEFAULT_CURRENCIES;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getActiveUsers();
    const eurRates = await fetchLatestRates();
    const eurToBase: Record<string, number> = {};
    for (const user of users) {
      const copPerEur = 1 / (eurRates.COP ?? 1);
      eurToBase[user.currencyBase] = user.currencyBase === "EUR" ? 1 : copPerEur;
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const errors: string[] = [];

    let updated = 0;
    for (const user of users) {
      try {
        const auth = getServiceAccountAuth();
        const sheets = google.sheets({ version: "v4", auth });

        const targets = await getUserCurrencies(sheets, user.spreadsheetId);
        const baseRateEur = user.currencyBase === "EUR" ? 1 : 1 / (eurRates.COP ?? 1);

        const ratesRes = await sheets.spreadsheets.values.get({
          spreadsheetId: user.spreadsheetId,
          range: "TasasCambio!A:F",
        });
        const existingRows = (ratesRes.data.values ?? []).slice(1);

        const updates: { sheetRow: number; values: any[] }[] = [];
        const rows: any[][] = [];
        for (const target of targets) {
          if (target === user.currencyBase) continue;
          const rate = target === "EUR" ? baseRateEur : baseRateEur * (eurRates[target] ?? 1);
          if (!isFinite(rate) || rate <= 0) continue;
          const rowIndex = existingRows.findIndex((r) => r[0] === user.currencyBase && r[1] === target && r[4] === today);
          if (rowIndex !== -1) {
            if (existingRows[rowIndex][3] === "manual") continue;
            updates.push({ sheetRow: rowIndex + 2, values: [rate, "auto", today, now] });
          } else {
            rows.push([user.currencyBase, target, rate, "auto", today, now]);
          }
        }

        if (updates.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: user.spreadsheetId,
            requestBody: {
              valueInputOption: "USER_ENTERED",
              data: updates.map((u) => ({
                range: `TasasCambio!C${u.sheetRow}:F${u.sheetRow}`,
                values: [u.values],
              })),
            },
          });
        }

        if (rows.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: user.spreadsheetId,
            range: "TasasCambio!A:F",
            valueInputOption: "USER_ENTERED",
            requestBody: { values: rows },
          });
        }
        updated += rows.length + updates.length;
      } catch (err) {
        console.error(`Failed to update rates for ${user.email}:`, err);
        errors.push(user.email);
      }
    }

    return NextResponse.json({
      generated: updated,
      errors,
      durationMs: Date.now() - startedAt,
      timestamp: now,
    });
  } catch (error: any) {
    console.error("Cron exchange-rates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
