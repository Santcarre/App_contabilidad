import { describe, expect, it } from "vitest";
import {
  convert,
  convertAmountToBase,
  formatCurrency,
  formatMoneyDisplay,
  getCopRates,
  getCurrencyInfo,
  getLatestRate,
  getRate,
  getTodayRate,
  parseMoneyInput,
  parseStoredRate,
  rateForTarget,
  type ExchangeRate,
  type RateRow,
} from "@/lib/currency";

function rate(partial: Partial<ExchangeRate>): ExchangeRate {
  return { baseCurrency: "COP", targetCurrency: "USD", rate: 1, source: "auto", date: "2026-01-10", fetchedAt: "", ...partial };
}

function rateRow(partial: Partial<RateRow>): RateRow {
  return { baseCurrency: "COP", targetCurrency: "USD", rate: 1, source: "auto", date: "2026-01-10", fetchedAt: "", ...partial };
}

describe("convert", () => {
  it("devuelve el mismo monto si from === to", () => {
    expect(convert(100, "COP", "COP", 4000)).toBe(100);
  });

  it("convierte monto por la tasa", () => {
    expect(convert(100, "USD", "COP", 4000)).toBe(400000);
  });

  it("redondea a 2 decimales", () => {
    expect(convert(33.33, "USD", "COP", 4000.5)).toBe(133336.66);
  });

  it("maneja monto 0", () => {
    expect(convert(0, "USD", "COP", 4000)).toBe(0);
  });
});

describe("getRate: prioridad manual > auto día > último conocido > error claro", () => {
  const base = "COP";
  const manual: ExchangeRate[] = [
    rate({ targetCurrency: "USD", rate: 3900, source: "manual", date: "2026-01-10" }),
  ];
  const auto: ExchangeRate[] = [
    rate({ targetCurrency: "USD", rate: 4100, source: "auto", date: "2026-01-10" }),
    rate({ targetCurrency: "USD", rate: 4050, source: "auto", date: "2026-01-09" }),
    rate({ targetCurrency: "USD", rate: 4000, source: "auto", date: "2026-01-01" }),
  ];

  it("prioriza la tasa manual del día", () => {
    expect(getRate(base, "USD", "2026-01-10", manual, auto)).toBe(3900);
  });

  it("usa la automática del día si no hay manual", () => {
    expect(getRate(base, "USD", "2026-01-10", [], auto)).toBe(4100);
  });

  it("usa la última automática conocida si no hay del día", () => {
    expect(getRate(base, "USD", "2026-01-11", [], auto)).toBe(4100);
    expect(getRate(base, "USD", "2026-01-09", [], auto)).toBe(4050);
  });

  it("lanza error claro si no hay ninguna tasa (antes caía a 1.0 corrupto)", () => {
    expect(() => getRate(base, "EUR", "2026-01-10", [], [])).toThrow(/No hay tasa de cambio para EUR/);
  });
});

describe("getCopRates: tasa COP por unidad, para TODAS las monedas", () => {
  it("convierte tasas base EUR a COP por unidad (1 USD = 4.200 COP)", () => {
    const rates = getCopRates({ COP: 4600, USD: 1.0952, EUR: 1, MXN: 19.5 });
    expect(rates.USD).toBeCloseTo(4600 / 1.0952, 4);
    expect(rates.EUR).toBeCloseTo(4600, 4);
    expect(rates.COP).toBe(1);
  });

  it("incluye monedas no USD/EUR (MXN, GBP, JPY...)", () => {
    const rates = getCopRates({ COP: 4600, USD: 1.1, MXN: 19.5, GBP: 0.85 });
    expect(rates.MXN).toBeCloseTo(4600 / 19.5, 4);
    expect(rates.GBP).toBeCloseTo(4600 / 0.85, 4);
  });

  it("lanza si Frankfurter no trae la tasa de COP (nunca NaN)", () => {
    expect(() => getCopRates({ USD: 1.1, EUR: 1 })).toThrow();
  });

  it("ignora monedas con tasa no finita", () => {
    const rates = getCopRates({ COP: 4600, USD: NaN, EUR: 1 });
    expect(rates.USD).toBeUndefined();
    expect(rates.EUR).toBe(4600);
  });
});

describe("getLatestRate / getTodayRate", () => {
  const rates = [
    rate({ targetCurrency: "USD", rate: 4000, source: "auto", date: "2026-01-01" }),
    rate({ targetCurrency: "USD", rate: 4050, source: "auto", date: "2026-01-09" }),
    rate({ targetCurrency: "USD", rate: 4100, source: "auto", date: "2026-01-10" }),
    rate({ targetCurrency: "USD", rate: 3999, source: "manual", date: "2026-01-10" }),
  ];

  it("getLatestRate prioriza manual del día", () => {
    expect(getLatestRate(rates, "USD", "2026-01-10")).toBe(3999);
  });

  it("getLatestRate usa la más reciente <= fecha sin manual", () => {
    expect(getLatestRate(rates.filter((r) => r.source !== "manual"), "USD", "2026-01-11")).toBe(4100);
  });

  it("getLatestRate devuelve undefined si no hay tasa", () => {
    expect(getLatestRate(rates, "EUR", "2026-01-10")).toBeUndefined();
  });

  it("getTodayRate devuelve la fila manual del día", () => {
    const r = getTodayRate(rates, "USD", "2026-01-10");
    expect(r?.source).toBe("manual");
    expect(r?.rate).toBe(3999);
  });
});

describe("formatCurrency (DoD: COP $1.000, USD $1,000.00, EUR 1.000,00 €)", () => {
  it("formatea COP en es-CO", () => {
    expect(formatCurrency(1000, "COP")).toMatch(/1\.000/);
    expect(formatCurrency(1000, "COP")).toMatch(/\$/);
  });

  it("formatea USD con dos decimales", () => {
    expect(formatCurrency(1000, "USD")).toMatch(/1,000\.00/);
  });

  it("formatea EUR con formato alemán", () => {
    expect(formatCurrency(1000, "EUR")).toMatch(/1\.000,00/);
    expect(formatCurrency(1000, "EUR")).toContain("€");
  });

  it("muestra decimales solo cuando existen en COP", () => {
    expect(formatCurrency(1000, "COP")).not.toMatch(/,00/);
    expect(formatCurrency(1000.5, "COP")).toMatch(/1\.000,5/);
  });

  it("usa el locale es-CO si se pasa explícito", () => {
    expect(formatCurrency(1000, "USD", "es-CO")).not.toBe(formatCurrency(1000, "USD"));
  });

  it("no falla con moneda desconocida", () => {
    expect(() => formatCurrency(5, "XYZ")).not.toThrow();
  });
});

describe("formatMoneyDisplay / parseMoneyInput (es-CO)", () => {
  it("formatea miles", () => {
    expect(formatMoneyDisplay("50000")).toBe("50.000");
  });

  it("formatea decimales con coma", () => {
    expect(formatMoneyDisplay("50000,5")).toBe("50.000,5");
    expect(formatMoneyDisplay("50000,50")).toBe("50.000,50");
  });

  it("parsea formato es-CO", () => {
    expect(parseMoneyInput("50.000,50")).toBe(50000.5);
  });

  it("parsea sin formato", () => {
    expect(parseMoneyInput("1234")).toBe(1234);
  });

  it("devuelve 0 para valores inválidos", () => {
    expect(parseMoneyInput("")).toBe(0);
    expect(parseMoneyInput("abc")).toBe(0);
  });
});

describe("parseStoredRate (tasas con coma decimal de Google Sheets)", () => {
  it("parsea decimales con coma", () => {
    expect(parseStoredRate("3628,87413")).toBeCloseTo(3628.87413, 5);
  });

  it("parsea puntos de miles", () => {
    expect(parseStoredRate("3.137,586")).toBeCloseTo(3137.586, 3);
  });

  it("acepta números nativos", () => {
    expect(parseStoredRate(3137.586)).toBe(3137.586);
  });

  it("devuelve NaN para vacío/undefined/null", () => {
    expect(Number.isNaN(parseStoredRate(""))).toBe(true);
    expect(Number.isNaN(parseStoredRate(undefined))).toBe(true);
    expect(Number.isNaN(parseStoredRate(null))).toBe(true);
  });
});

describe("rateForTarget / convertAmountToBase (cambio de moneda base en tiempo real)", () => {
  const rows: RateRow[] = [
    rateRow({ targetCurrency: "USD", rate: 4200, source: "auto", date: "2026-01-05" }),
    rateRow({ targetCurrency: "USD", rate: 4400, source: "auto", date: "2026-01-10" }),
    rateRow({ targetCurrency: "EUR", rate: 4600, source: "auto", date: "2026-01-10" }),
    rateRow({ targetCurrency: "MXN", rate: 230, source: "auto", date: "2026-01-10" }),
  ];

  it("rateForTarget usa la fila del día", () => {
    expect(rateForTarget(rows, "USD", "2026-01-10")).toBe(4400);
  });

  it("rateForTarget usa la más reciente <= fecha", () => {
    expect(rateForTarget(rows, "USD", "2026-01-09")).toBe(4200);
  });

  it("rateForTarget devuelve undefined sin tasas", () => {
    expect(rateForTarget(rows, "ARS", "2026-01-10")).toBeUndefined();
  });

  it("rateForTarget cae a la tasa más reciente de cualquier fecha", () => {
    const futureOnly = [
      rateRow({ targetCurrency: "USD", rate: 4400, source: "auto", date: "2026-02-10" }),
      rateRow({ targetCurrency: "USD", rate: 4300, source: "auto", date: "2026-03-10" }),
    ];
    expect(rateForTarget(futureOnly, "USD", "2026-01-01")).toBe(4300);
  });

  it("no convierte si from === to", () => {
    expect(convertAmountToBase(1000, "COP", "COP", "2026-01-10", rows)).toBe(1000);
  });

  it("COP -> USD divide por la tasa del día", () => {
    expect(convertAmountToBase(440000, "COP", "USD", "2026-01-10", rows)).toBe(100);
  });

  it("USD -> COP multiplica por la tasa del día", () => {
    expect(convertAmountToBase(100, "USD", "COP", "2026-01-10", rows)).toBe(440000);
  });

  it("USD -> EUR usa ambas tasas (COP como puente)", () => {
    // 100 USD * 4400 / 4600 = 95.6521...
    expect(convertAmountToBase(100, "USD", "EUR", "2026-01-10", rows)).toBeCloseTo(95.65, 2);
  });

  it("COP -> USD con fecha sin tasa usa la más reciente (cualquier fecha)", () => {
    const futureOnly = [
      rateRow({ targetCurrency: "USD", rate: 4400, source: "auto", date: "2026-02-10" }),
    ];
    expect(convertAmountToBase(440000, "COP", "USD", "2026-01-01", futureOnly)).toBe(100);
  });

  it("devuelve el monto si falta la tasa de la moneda origen", () => {
    expect(convertAmountToBase(1000, "ARS", "USD", "2026-01-10", rows)).toBe(1000);
  });

  it("no convierte montos no finitos o <= 0", () => {
    expect(convertAmountToBase(NaN, "COP", "USD", "2026-01-10", rows)).toBeNaN();
    expect(convertAmountToBase(0, "COP", "USD", "2026-01-10", rows)).toBe(0);
  });
});

describe("getCurrencyInfo", () => {
  it("devuelve info de moneda soportada", () => {
    expect(getCurrencyInfo("COP").name).toBe("Peso Colombiano");
    expect(getCurrencyInfo("EUR").symbol).toBe("€");
  });

  it("devuelve fallback para moneda desconocida", () => {
    const info = getCurrencyInfo("ZZZ");
    expect(info.code).toBe("ZZZ");
    expect(info.locale).toBe("es-CO");
  });
});
