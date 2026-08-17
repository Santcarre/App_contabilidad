import { describe, expect, it } from "vitest";
import { computeWallets, type WalletSource, type WalletTransaction } from "@/lib/wallets";
import type { RateRow } from "@/lib/currency";

const TODAY = "2026-08-15";

function source(partial: Partial<WalletSource> = {}): WalletSource {
  return {
    id: "s1",
    name: "Efectivo",
    type: "efectivo",
    icon: "wallet",
    color: "amber-500",
    initialBalance: 0,
    active: true,
    ...partial,
  };
}

function tx(partial: Partial<WalletTransaction> = {}): WalletTransaction {
  return {
    id: "t1",
    type: "gasto",
    amountOriginal: 1000,
    currencyOriginal: "COP",
    amountBase: 1000,
    date: TODAY,
    sourceId: "s1",
    ...partial,
  };
}

function rateRow(partial: Partial<RateRow> = {}): RateRow {
  return { baseCurrency: "COP", targetCurrency: "USD", rate: 4000, source: "auto", date: TODAY, fetchedAt: "", ...partial };
}

describe("computeWallets", () => {
  it("inicio del día acumula días anteriores y la variación solo el día actual", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 500000 })],
      [
        tx({ id: "a", type: "gasto", amountOriginal: 100000, date: "2026-08-10" }),
        tx({ id: "b", type: "ingreso", amountOriginal: 200000, date: "2026-08-12" }),
        tx({ id: "c", type: "gasto", amountOriginal: 50000, date: TODAY }),
        tx({ id: "d", type: "ingreso", amountOriginal: 30000, date: TODAY }),
      ],
      "COP",
      [],
      TODAY
    );
    const w = wallets[0];
    expect(w.startOfDay).toBe(600000);
    expect(w.dayIncome).toBe(30000);
    expect(w.dayExpense).toBe(50000);
    expect(w.balance).toBe(580000);
  });

  it("transacciones con fecha futura no cuentan hasta que llegue su día", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 100000 })],
      [
        tx({ id: "f", type: "gasto", amountOriginal: 90000, date: "2026-09-01" }),
        tx({ id: "h", type: "ingreso", amountOriginal: 10000, date: TODAY }),
      ],
      "COP",
      [],
      TODAY
    );
    expect(wallets[0].startOfDay).toBe(100000);
    expect(wallets[0].balance).toBe(110000);
  });

  it("convierte gastos en otra moneda a la base con las tasas de su fecha", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 1000000 })],
      [tx({ id: "a", type: "gasto", amountOriginal: 100, currencyOriginal: "USD", date: "2026-08-10" })],
      "COP",
      [rateRow({ targetCurrency: "USD", rate: 4000, date: "2026-08-10" })],
      TODAY
    );
    expect(wallets[0].startOfDay).toBe(600000);
    expect(wallets[0].balance).toBe(600000);
  });

  it("excluye fuentes inactivas", () => {
    const wallets = computeWallets(
      [
        source({ id: "s1", active: true, initialBalance: 100 }),
        source({ id: "s2", active: false, initialBalance: 9999 }),
      ],
      [tx({ sourceId: "s2" })],
      "COP",
      [],
      TODAY
    );
    expect(wallets).toHaveLength(1);
    expect(wallets[0].id).toBe("s1");
  });

  it("fuente sin transacciones conserva el saldo inicial como inicio del día", () => {
    const wallets = computeWallets([source({ initialBalance: 250000 })], [], "COP", [], TODAY);
    expect(wallets[0].startOfDay).toBe(250000);
    expect(wallets[0].dayIncome).toBe(0);
    expect(wallets[0].dayExpense).toBe(0);
    expect(wallets[0].balance).toBe(250000);
    expect(wallets[0].transactions).toEqual([]);
  });

  it("incluye movimientos de la semana en curso (hasta hoy), limitados y ordenados", () => {
    const txs = [
      ...Array.from({ length: 12 }, (_, i) => tx({ id: `today-${i}`, date: TODAY })),
      tx({ id: "inicio-semana", date: "2026-08-10" }),
    ];
    const wallets = computeWallets([source()], txs, "COP", [], TODAY, 10);
    expect(wallets[0].transactions).toHaveLength(10);
    expect(wallets[0].transactions.every((t) => t.date === TODAY)).toBe(true);
  });

  it("excluye de los movimientos las transacciones anteriores a la semana y futuras", () => {
    const wallets = computeWallets(
      [source()],
      [
        tx({ id: "hoy", date: TODAY }),
        tx({ id: "inicio-semana", date: "2026-08-10" }),
        tx({ id: "semana-pasada", date: "2026-08-09" }),
        tx({ id: "futura", date: "2026-09-01" }),
      ],
      "COP",
      [],
      TODAY
    );
    expect(wallets[0].transactions.map((t) => t.id).sort()).toEqual(["hoy", "inicio-semana"]);
  });

  it("sin tasas para la conversión mantiene el monto original (fallback)", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 0 })],
      [tx({ id: "a", type: "gasto", amountOriginal: 50, currencyOriginal: "USD", date: "2026-08-01" })],
      "COP",
      [],
      TODAY
    );
    expect(wallets[0].startOfDay).toBe(-50);
  });

  it("redondea los saldos a 2 decimales", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 0 })],
      [
        tx({ id: "a", type: "gasto", amountOriginal: 33.33, date: "2026-08-01" }),
        tx({ id: "b", type: "gasto", amountOriginal: 33.33, date: "2026-08-02" }),
      ],
      "COP",
      [],
      TODAY
    );
    expect(wallets[0].startOfDay).toBe(-66.66);
  });
});