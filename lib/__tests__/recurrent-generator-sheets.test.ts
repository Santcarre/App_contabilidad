import { describe, expect, it, vi } from "vitest";
import { generateRecurrentTransactions } from "@/lib/recurrent-generator";

const ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "gasto",
  amountOriginal: "100000",
  currencyOriginal: "COP",
  categoryId: "00000000-0000-4000-8000-000000000002",
  sourceId: "00000000-0000-4000-8000-000000000003",
  frequency: "mensual",
  dayOfMonth: "1",
  startDate: "2026-01-01",
  endDate: "",
  active: "TRUE",
  nextGeneration: "2000-01-01",
  lastGenerated: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function makeSheets(rows: any[][] = [[], [...Object.values(ROW)]]) {
  const appended: any[][] = [];
  const updates: Array<{ range: string; values: any[][] }> = [];
  return {
    sheets: {
      getRows: vi.fn(async (range: string) => {
        if (range === "Recurrentes!A:N") return rows;
        if (range === "Configuracion!A:C") {
          return [["key", "value"], ["currencyBase", "COP"]];
        }
        if (range === "TasasCambio!A:F") return [["baseCurrency", "targetCurrency"]];
        return [];
      }),
      append: vi.fn(async (sheet: string, values: any[]) => {
        appended.push(values);
        return "ok";
      }),
      update: vi.fn(async (range: string, values: any[][]) => {
        updates.push({ range, values });
      }),
    },
    appended,
    updates,
  };
}

describe("generateRecurrentTransactions (mock Sheets)", () => {
  it("genera la transacción de una recurrencia vencida", async () => {
    const { sheets, appended, updates } = makeSheets();
    const result = await generateRecurrentTransactions(sheets, "spreadsheet-id");

    expect(result).toEqual({ generated: 1, errors: 0, skipped: 0 });
    expect(appended).toHaveLength(1);
    const tx = appended[0];
    expect(tx[1]).toBe("gasto");
    expect(tx[2]).toBe(100000);
    expect(tx[9]).toBe(`Recurrente: ${ROW.id}`);
    expect(tx[10]).toBe(ROW.id);
    expect(updates[0].range).toMatch(/^Recurrentes!L\d+:M\d+$/);
  });

  it("usa la nota de descripción si está definida (col O)", async () => {
    const { sheets, appended } = makeSheets([[undefined], [...Object.values(ROW), "Arriendo enero"]]);
    await generateRecurrentTransactions(sheets, "spreadsheet-id");
    expect(appended[0][9]).toBe("Arriendo enero");
  });

  it("omite recurrencias inactivas, sin fecha o con endDate vencida", async () => {
    const inactiva = { ...Object.values(ROW) };
    inactiva[10] = "FALSE";
    const sinFecha = { ...Object.values(ROW) };
    sinFecha[11] = "";
    const vencida = { ...Object.values(ROW) };
    vencida[9] = "1999-12-31";
    const { sheets, appended } = makeSheets([[], inactiva, sinFecha, vencida]);
    const result = await generateRecurrentTransactions(sheets, "spreadsheet-id");
    expect(result.generated).toBe(0);
    expect(appended).toHaveLength(0);
  });

  it("convierte la moneda usando la tasa disponible", async () => {
    const rec = [...Object.values(ROW)];
    rec[3] = "USD"; // currencyOriginal
    const { sheets, appended } = makeSheets([[], rec]);
    sheets.getRows.mockImplementation(async (range: string) => {
      if (range === "Recurrentes!A:N") return [[], rec];
      if (range === "Configuracion!A:C") return [["key", "value"], ["currencyBase", "USD"]];
      if (range === "TasasCambio!A:F") {
        return [["baseCurrency", "targetCurrency"], ["USD", "COP", "4000", "auto", "2026-01-10", ""]];
      }
      return [];
    });
    const result = await generateRecurrentTransactions(sheets, "spreadsheet-id");
    expect(result.generated).toBe(1);
    const tx = appended[0];
    expect(tx[3]).toBe("USD");
    expect(tx[4]).toBe(100000); // 100000 USD * 1.0 (base USD)
    expect(tx[5]).toBe("USD");
  });
});
