import { describe, expect, it } from "vitest";
import { SheetsClient } from "@/lib/google-sheets";

function makeClient(returnedRanges: Array<{ range: string; values: any[][] }>) {
  const sheets = {
    spreadsheets: {
      values: {
        batchGet: async () => ({ data: { valueRanges: returnedRanges } }),
        get: async () => ({ data: { values: [] } }),
        append: async () => ({ data: { updates: { updatedRange: "ok" } } }),
        update: async () => ({}),
        batchUpdate: async () => ({}),
      },
    },
  };
  // Inyectamos el cliente falso para el test
  const client = new SheetsClient("fake-token", "fake-id");
  (client as any).sheets = sheets;
  return client;
}

describe("SheetsClient.batchGet", () => {
  it("mapea rangos normalizados por Google a las claves pedidas", async () => {
    const client = makeClient([
      { range: "Transacciones!A1:M1000", values: [["id", "type"], ["t1", "gasto"]] },
      { range: "Categorias!A1:H1000", values: [["id", "name"]] },
      { range: "'Mi Hoja'!A1:B2", values: [["a", "b"]] },
    ]);
    const res = await client.batchGet(["Transacciones!A:M", "Categorias!A:H", "Mi Hoja!A:B"]);
    expect(res["Transacciones!A:M"]).toEqual([["id", "type"], ["t1", "gasto"]]);
    expect(res["Categorias!A:H"]).toEqual([["id", "name"]]);
    expect(res["Mi Hoja!A:B"]).toEqual([["a", "b"]]);
  });

  it("devuelve undefined para hojas sin datos (los callers usan ?? [])", async () => {
    const client = makeClient([]);
    const res = await client.batchGet(["Configuracion!A:C"]);
    expect(res["Configuracion!A:C"]).toBeUndefined();
  });
});
