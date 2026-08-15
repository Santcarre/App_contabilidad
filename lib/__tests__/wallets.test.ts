import { describe, expect, it } from "vitest";
import { computeWallets, type WalletSource, type WalletTransaction } from "@/lib/wallets";
import type { RateRow } from "@/lib/currency";

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
    date: "2026-08-10",
    sourceId: "s1",
    ...partial,
  };
}

function rateRow(partial: Partial<RateRow> = {}): RateRow {
  return { baseCurrency: "COP", targetCurrency: "USD", rate: 4000, source: "auto", date: "2026-08-10", fetchedAt: "", ...partial };
}

describe("computeWallets", () => {
  it("saldo = saldo inicial + ingresos - gastos (misma moneda)", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 500000 })],
      [
        tx({ id: "a", type: "gasto", amountOriginal: 100000, date: "2026-08-01" }),
        tx({ id: "b", type: "gasto", amountOriginal: 50000, date: "2026-08-02" }),
        tx({ id: "c", type: "ingreso", amountOriginal: 200000, date: "2026-08-03" }),
      ],
      "COP",
      []
    );
    expect(wallets[0].balance).toBe(550000);
    expect(wallets[0].income).toBe(200000);
    expect(wallets[0].expense).toBe(150000);
    expect(wallets[0].initialBalance).toBe(500000);
  });

  it("convierte gastos en otra moneda a la base con las tasas de su fecha", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 1000000 })],
      [tx({ id: "a", type: "gasto", amountOriginal: 100, currencyOriginal: "USD", date: "2026-08-10" })],
      "COP",
      [rateRow({ targetCurrency: "USD", rate: 4000, date: "2026-08-10" })]
    );
    expect(wallets[0].expense).toBe(400000);
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
      []
    );
    expect(wallets).toHaveLength(1);
    expect(wallets[0].id).toBe("s1");
  });

  it("fuente sin transacciones conserva solo el saldo inicial", () => {
    const wallets = computeWallets([source({ initialBalance: 250000 })], [], "COP", []);
    expect(wallets[0].balance).toBe(250000);
    expect(wallets[0].income).toBe(0);
    expect(wallets[0].expense).toBe(0);
    expect(wallets[0].transactions).toEqual([]);
  });

  it("incluye como máximo los últimos movimientos ordenados por fecha desc", () => {
    const txs = Array.from({ length: 12 }, (_, i) =>
      tx({ id: `t${i}`, date: `2026-08-${String(i + 1).padStart(2, "0")}` })
    );
    const wallets = computeWallets([source()], txs, "COP", [], 10);
    expect(wallets[0].transactions).toHaveLength(10);
    expect(wallets[0].transactions[0].date).toBe("2026-08-12");
    expect(wallets[0].transactions[9].date).toBe("2026-08-03");
  });

  it("sin tasas para la conversión mantiene el monto original (fallback)", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 0 })],
      [tx({ id: "a", type: "gasto", amountOriginal: 50, currencyOriginal: "USD", date: "2026-08-01" })],
      "COP",
      []
    );
    expect(wallets[0].expense).toBe(50);
  });

  it("redondea los saldos a 2 decimales", () => {
    const wallets = computeWallets(
      [source({ initialBalance: 0 })],
      [
        tx({ id: "a", type: "gasto", amountOriginal: 33.33, date: "2026-08-01" }),
        tx({ id: "b", type: "gasto", amountOriginal: 33.33, date: "2026-08-02" }),
      ],
      "COP",
      []
    );
    expect(wallets[0].expense).toBe(66.66);
  });
});