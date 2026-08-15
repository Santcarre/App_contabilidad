import { convertAmountToBase, type RateRow } from "./currency";
import { round2 } from "./reports";

export interface WalletSource {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  initialBalance: number;
  active: boolean;
}

export interface WalletTransaction {
  id: string;
  type: "gasto" | "ingreso";
  amountOriginal: number;
  currencyOriginal: string;
  amountBase: number;
  date: string;
  sourceId: string;
  categoryName?: string;
  note?: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  initialBalance: number;
  income: number;
  expense: number;
  balance: number;
  transactions: WalletTransaction[];
}

/**
 * Saldo por billetera: saldoInicial + Σ ingresos − Σ gastos, todo convertido
 * a la moneda base con las tasas de la fecha de cada transacción. Solo
 * fuentes activas; cada billetera incluye sus últimos `maxTransactions`
 * movimientos ordenados por fecha desc.
 */
export function computeWallets(
  sources: WalletSource[],
  transactions: WalletTransaction[],
  currencyBase: string,
  rateRows: RateRow[],
  maxTransactions = 10
): Wallet[] {
  const bySource = new Map<string, WalletTransaction[]>();
  for (const tx of transactions) {
    const list = bySource.get(tx.sourceId) ?? [];
    list.push(tx);
    bySource.set(tx.sourceId, list);
  }

  const wallets: Wallet[] = [];
  for (const src of sources) {
    if (!src.active) continue;

    const converted = (bySource.get(src.id) ?? []).map((tx) => ({
      ...tx,
      amountBase: convertAmountToBase(tx.amountOriginal, tx.currencyOriginal, currencyBase, tx.date, rateRows),
    }));

    let income = 0;
    let expense = 0;
    for (const tx of converted) {
      if (tx.type === "ingreso") income += tx.amountBase;
      else expense += tx.amountBase;
    }

    const recent = [...converted]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, maxTransactions);

    wallets.push({
      id: src.id,
      name: src.name,
      type: src.type,
      icon: src.icon,
      color: src.color,
      initialBalance: src.initialBalance,
      income: round2(income),
      expense: round2(expense),
      balance: round2(src.initialBalance + income - expense),
      transactions: recent,
    });
  }

  return wallets;
}