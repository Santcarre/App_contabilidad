import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";
import { generateRecurrentTransactions, type SheetsAdapter } from "@/lib/recurrent-generator";

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

function createAdapter(sheets: sheets_v4.Sheets, spreadsheetId: string): SheetsAdapter {
  return {
    async getRows(range: string): Promise<any[][]> {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return res.data.values ?? [];
    },
    async append(sheetName: string, values: any[]): Promise<string> {
      const res = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
      return res.data.updates?.updatedRange ?? "";
    },
    async update(range: string, values: any[][]): Promise<void> {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = getServiceAccountAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const usersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: "Usuarios!A:J",
    });
    const users = (usersRes.data.values ?? []).slice(1)
      .filter((r) => r[9] === "TRUE")
      .map((row) => ({ email: row[0], spreadsheetId: row[5] }));

    let totalGenerated = 0;
    let totalErrors = 0;

    for (const user of users) {
      try {
        const result = await generateRecurrentTransactions(createAdapter(sheets, user.spreadsheetId), user.spreadsheetId);
        totalGenerated += result.generated;
        totalErrors += result.errors;
      } catch (err) {
        console.error(`Failed to generate recurrents for ${user.email}:`, err);
        totalErrors++;
      }
    }

    return NextResponse.json({ generated: totalGenerated, errors: totalErrors, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Cron recurrentes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}