import { google, sheets_v4 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface SheetsRange {
  range: string;
  values?: any[][];
}

export interface BatchUpdateRequest {
  range: string;
  values: any[][];
}

export class SheetsClient {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(accessToken: string, spreadsheetId: string) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = spreadsheetId;
  }

  async batchGet(ranges: string[]): Promise<Record<string, any[][]>> {
    const res = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges,
    });
    // Google normaliza los rangos devueltos (p.ej. "Transacciones!A1:M1000" o
    // "'Mi Hoja'!A1:B2"). Normalizamos las claves al rango tal como se pidió
    // para que los callers encuentren batch["Transacciones!A:M"].
    const requestedBySheet = new Map(
      ranges.map((r) => [r.split("!")[0].replace(/^'+|'+$/g, "").toLowerCase(), r])
    );
    return Object.fromEntries(
      res.data.valueRanges?.map((r) => {
        const returnedName = (r.range ?? "").split("!")[0].replace(/^'+|'+$/g, "").toLowerCase();
        const requestedKey = requestedBySheet.get(returnedName);
        return [requestedKey ?? r.range!, r.values ?? []];
      }) ?? []
    );
  }

  async batchUpdate(updates: BatchUpdateRequest[]): Promise<void> {
    await this.retry(async () => {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates,
        },
      });
    });
  }

  async append(sheetName: string, values: any[]): Promise<string> {
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
    return res.data.updates?.updatedRange ?? "";
  }

  async update(range: string, values: any[][]): Promise<void> {
    await this.retry(async () => {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
    });
  }

  async getRows(range: string): Promise<any[][]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });
    return res.data.values ?? [];
  }

  async deleteRows(sheetName: string, rowNumber: number): Promise<void> {
    await this.retry(async () => {
      const meta = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: "sheets(properties(sheetId,title))",
      });
      const sheet = meta.data.sheets?.find(
        (s) => s.properties?.title === sheetName
      );
      if (!sheet?.properties?.sheetId) {
        throw new Error(`Sheet not found: ${sheetName}`);
      }
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: "ROWS",
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            },
          ],
        },
      });
    });
  }

  private async retry<T>(
    fn: () => Promise<T>,
    options: { retries: number; baseDelay: number; maxDelay: number } = { retries: 5, baseDelay: 1000, maxDelay: 16000 }
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (error.code === 429 && attempt < options.retries) {
          const delay = Math.min(options.baseDelay * Math.pow(2, attempt), options.maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError!;
  }
}