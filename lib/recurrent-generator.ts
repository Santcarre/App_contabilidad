import { addMonths } from "date-fns";
import { getRate, type ExchangeRate } from "@/lib/currency";

export interface SheetsAdapter {
  getRows(range: string): Promise<any[][]>;
  append(sheetName: string, values: any[]): Promise<string>;
  update(range: string, values: any[][]): Promise<void>;
}

export interface GenerateResult {
  generated: number;
  errors: number;
  skipped: number;
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calcNextGeneration(nextGeneration: string, dayOfMonth: number): string {
  const next = addMonths(new Date(nextGeneration + "T00:00:00"), 1);
  next.setDate(dayOfMonth);
  return formatLocalDate(next);
}

function getConfigCurrencyBase(sheets: SheetsAdapter): Promise<string> {
  return sheets.getRows("Configuracion!A:C").then((rows) => {
    const row = rows.find((r) => r[0] === "currencyBase");
    return row?.[1] || "COP";
  });
}

async function getExchangeRates(sheets: SheetsAdapter): Promise<ExchangeRate[]> {
  const res = await sheets.getRows("TasasCambio!A:F");
  return res.slice(1).map((row) => ({
    baseCurrency: row[0],
    targetCurrency: row[1],
    rate: parseFloat(row[2]),
    source: row[3],
    date: row[4],
    fetchedAt: row[5],
  }));
}

interface RecurrentRow {
  rowNumber: number;
  id: string;
  type: string;
  amountOriginal: number;
  currencyOriginal: string;
  categoryId: string;
  sourceId: string;
  dayOfMonth: number;
  endDate: string | null;
  active: boolean;
  nextGeneration: string;
  note: string;
}

function parseRecurrents(rows: any[][]): RecurrentRow[] {
  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    id: row[0],
    type: row[1],
    amountOriginal: parseFloat(row[2]) || 0,
    currencyOriginal: row[3],
    categoryId: row[4],
    sourceId: row[5],
    dayOfMonth: parseInt(row[7]) || 1,
    endDate: row[9] || null,
    active: row[10] === "TRUE",
    nextGeneration: row[11],
    note: row[14] || "",
  }));
}

export async function generateRecurrentTransactions(
  sheets: SheetsAdapter,
  spreadsheetId: string
): Promise<GenerateResult> {
  const today = formatLocalDate(new Date());
  const result: GenerateResult = { generated: 0, errors: 0, skipped: 0 };

  const recurrents = parseRecurrents(await sheets.getRows("Recurrentes!A:N"));
  const due = recurrents.filter(
    (r) => r.active && r.nextGeneration && r.nextGeneration <= today && (!r.endDate || r.endDate >= today)
  );
  if (due.length === 0) return result;

  const [currencyBase, exchangeRates] = await Promise.all([
    getConfigCurrencyBase(sheets),
    getExchangeRates(sheets),
  ]);
  const manualRates = exchangeRates.filter((r) => r.source === "manual" && r.baseCurrency === currencyBase);
  const autoRates = exchangeRates.filter((r) => r.source === "auto" && r.baseCurrency === currencyBase);

  const now = new Date().toISOString();

  for (const rec of due) {
    try {
      let amountBase = rec.amountOriginal;
      if (rec.currencyOriginal !== currencyBase) {
        const rate = getRate(currencyBase, rec.currencyOriginal, rec.nextGeneration, manualRates, autoRates);
        amountBase = rec.amountOriginal * rate;
      }

      await sheets.append("Transacciones", [
        crypto.randomUUID(),
        rec.type,
        rec.amountOriginal,
        rec.currencyOriginal,
        Math.round(amountBase * 100) / 100,
        currencyBase,
        rec.categoryId,
        rec.sourceId,
        rec.nextGeneration,
        rec.note || `Recurrente: ${rec.id}`,
        rec.id,
        now,
        now,
      ]);

      const nextGenStr = calcNextGeneration(rec.nextGeneration, rec.dayOfMonth);
      await sheets.update(`Recurrentes!L${rec.rowNumber}:M${rec.rowNumber}`, [[today, nextGenStr]]);

      result.generated++;
    } catch (error) {
      console.error(`Error generating recurrent ${rec.id}:`, error);
      result.errors++;
    }
  }

  return result;
}