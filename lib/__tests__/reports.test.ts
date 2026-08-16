import { describe, expect, it } from "vitest";
import {
  periodRange,
  previousPeriodDate,
  shiftDate,
  summarizeRange,
  summarizeWithPrevPeriod,
  type ReportTransaction,
} from "@/lib/reports";

function tx(partial: Partial<ReportTransaction> = {}): ReportTransaction {
  return {
    id: "t1",
    type: "gasto",
    amountBase: 1000,
    amountOriginal: 1000,
    currencyOriginal: "COP",
    date: "2026-08-15",
    categoryId: "c1",
    categoryName: "Mercado",
    categoryColor: "emerald-500",
    sourceId: "s1",
    sourceName: "Efectivo",
    ...partial,
  };
}

describe("periodRange", () => {
  it("día: rango del propio día", () => {
    expect(periodRange("day", "2026-08-15")).toEqual({ start: "2026-08-15", end: "2026-08-15" });
  });

  it("semana: lunes a domingo (sábado 2026-08-15 → semana del 10 al 16)", () => {
    expect(periodRange("week", "2026-08-15")).toEqual({ start: "2026-08-10", end: "2026-08-16" });
  });

  it("semana: lunes es inicio de su propia semana", () => {
    expect(periodRange("week", "2026-08-10").start).toBe("2026-08-10");
  });

  it("mes: primer y último día del mes", () => {
    expect(periodRange("month", "2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
});

describe("shiftDate y previousPeriodDate", () => {
  it("shiftDate cruza el año", () => {
    expect(shiftDate("2026-01-02", -3)).toBe("2025-12-30");
  });

  it("período anterior: día = ayer, semana = hace 7 días, mes = mismo día del mes anterior", () => {
    expect(previousPeriodDate("day", "2026-08-15")).toBe("2026-08-14");
    expect(previousPeriodDate("week", "2026-08-15")).toBe("2026-08-08");
    expect(previousPeriodDate("month", "2026-08-15")).toBe("2026-07-01");
  });
});

describe("summarizeRange", () => {
  it("incluye los límites del rango y excluye lo de fuera", () => {
    const result = summarizeRange(
      [
        tx({ id: "a", amountBase: 100, type: "ingreso", date: "2026-08-10" }),
        tx({ id: "b", amountBase: 50, type: "gasto", date: "2026-08-16" }),
        tx({ id: "c", amountBase: 25, type: "gasto", date: "2026-08-09" }),
        tx({ id: "d", amountBase: 75, type: "ingreso", date: "2026-08-17" }),
      ],
      "2026-08-10",
      "2026-08-16"
    );
    expect(result).toEqual({ income: 100, expense: 50, balance: 50 });
  });
});

describe("summarizeWithPrevPeriod", () => {
  it("día: compara con ayer", () => {
    const summary = summarizeWithPrevPeriod(
      [
        tx({ type: "ingreso", amountBase: 200, date: "2026-08-15" }),
        tx({ type: "gasto", amountBase: 50, date: "2026-08-15" }),
        tx({ type: "ingreso", amountBase: 100, date: "2026-08-14" }),
      ],
      "day",
      "2026-08-15"
    );
    expect(summary.income).toBe(200);
    expect(summary.expense).toBe(50);
    expect(summary.balance).toBe(150);
    expect(summary.prevIncome).toBe(100);
  });

  it("semana: compara con la semana anterior completa", () => {
    const summary = summarizeWithPrevPeriod(
      [
        tx({ type: "gasto", amountBase: 60, date: "2026-08-13" }),
        tx({ type: "gasto", amountBase: 40, date: "2026-08-08" }),
        tx({ type: "gasto", amountBase: 20, date: "2026-08-05" }),
      ],
      "week",
      "2026-08-15"
    );
    expect(summary.expense).toBe(60);
    expect(summary.prevExpense).toBe(60);
  });

  it("mes: compara con el mes anterior", () => {
    const summary = summarizeWithPrevPeriod(
      [
        tx({ type: "ingreso", amountBase: 500, date: "2026-08-15" }),
        tx({ type: "ingreso", amountBase: 300, date: "2026-07-20" }),
      ],
      "month",
      "2026-08-15"
    );
    expect(summary.income).toBe(500);
    expect(summary.prevIncome).toBe(300);
  });
});