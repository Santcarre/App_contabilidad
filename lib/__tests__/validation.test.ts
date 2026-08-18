import { describe, expect, it } from "vitest";
import {
  transactionSchema,
  categorySchema,
  sourceSchema,
  budgetSchema,
  recurringSchema,
  configSchema,
} from "@/lib/validation";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

describe("transactionSchema", () => {
  it("acepta una transacción válida", () => {
    const res = transactionSchema.safeParse({
      type: "gasto",
      amountOriginal: 50000.5,
      currencyOriginal: "COP",
      categoryId: uuid,
      sourceId: uuid,
      date: "2026-08-13",
    });
    expect(res.success).toBe(true);
  });

  it("rechaza monto 0 o negativo", () => {
    expect(transactionSchema.safeParse({
      type: "gasto", amountOriginal: 0, currencyOriginal: "COP",
      categoryId: uuid, sourceId: uuid, date: "2026-08-13",
    }).success).toBe(false);
    expect(transactionSchema.safeParse({
      type: "gasto", amountOriginal: -5, currencyOriginal: "COP",
      categoryId: uuid, sourceId: uuid, date: "2026-08-13",
    }).success).toBe(false);
  });

  it("rechaza moneda no soportada y fecha mal formada", () => {
    expect(transactionSchema.safeParse({
      type: "gasto", amountOriginal: 100, currencyOriginal: "MXN",
      categoryId: uuid, sourceId: uuid, date: "2026-08-13",
    }).success).toBe(false);
    expect(transactionSchema.safeParse({
      type: "gasto", amountOriginal: 100, currencyOriginal: "COP",
      categoryId: uuid, sourceId: uuid, date: "13/08/2026",
    }).success).toBe(false);
  });

  it("rechaza ids que no son UUID", () => {
    expect(transactionSchema.safeParse({
      type: "gasto", amountOriginal: 100, currencyOriginal: "COP",
      categoryId: "no-uuid", sourceId: uuid, date: "2026-08-13",
    }).success).toBe(false);
  });
});

describe("categorySchema / sourceSchema", () => {
  it("valida colores en formato tailwind (nombre-número)", () => {
    expect(categorySchema.safeParse({ name: "Mercado", type: "gasto", icon: "cart", color: "emerald-500" }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "Mercado", type: "gasto", icon: "cart", color: "#ff0000" }).success).toBe(false);
    expect(sourceSchema.safeParse({ name: "Bancolombia", type: "banco", icon: "building", color: "blue-500" }).success).toBe(true);
  });
});

describe("budgetSchema", () => {
  it("valida periodo y fecha, y límite positivo", () => {
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 500000, periodo: "mes", fecha: "2026-08-15" }).success).toBe(true);
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 500000, periodo: "dia", fecha: "2026-08-15" }).success).toBe(true);
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 500000, periodo: "semana", fecha: "2026-08-15" }).success).toBe(true);
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 0, periodo: "mes", fecha: "2026-08-15" }).success).toBe(false);
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 500000, periodo: "mes", fecha: "15-08-2026" }).success).toBe(false);
    expect(budgetSchema.safeParse({ categoryId: uuid, limitAmount: 500000, periodo: "año", fecha: "2026-08-15" }).success).toBe(false);
  });
});

describe("recurringSchema", () => {
  it("acepta nota de descripción opcional", () => {
    const withNote = recurringSchema.safeParse({
      type: "gasto", amountOriginal: 500000, currencyOriginal: "COP",
      categoryId: uuid, sourceId: uuid, frequency: "mensual", dayOfMonth: 1,
      startDate: "2026-08-01", note: "Arriendo",
    });
    expect(withNote.success).toBe(true);
    if (withNote.success) expect(withNote.data.note).toBe("Arriendo");
  });

  it("rechaza día fuera de rango", () => {
    expect(recurringSchema.safeParse({
      type: "gasto", amountOriginal: 100, currencyOriginal: "COP",
      categoryId: uuid, sourceId: uuid, frequency: "mensual", dayOfMonth: 31,
      startDate: "2026-08-01",
    }).success).toBe(false);
  });

  it("aplica defaults (active, alert80, alert100)", () => {
    const res = configSchema.safeParse({ currencyBase: "COP" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.theme).toBe("system");
      expect(res.data.budgetStrictMode).toBe(false);
      expect(res.data.dateFormat).toBe("DD/MM/YYYY");
    }
    const budget = budgetSchema.safeParse({ categoryId: uuid, limitAmount: 100, periodo: "dia", fecha: "2026-08-15" });
    expect(budget.success).toBe(true);
    if (budget.success) {
      expect(budget.data.alert80).toBe(true);
      expect(budget.data.alert100).toBe(true);
    }
  });
});
