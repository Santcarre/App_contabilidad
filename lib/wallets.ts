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
  /** Saldo con el que la billetera arrancó el día `today` (creación + movimientos de días anteriores). */
  startOfDay: number;
  /** Suma de ingresos del día `today`. */
  dayIncome: number;
  /** Suma de gastos del día `today`. */
  dayExpense: number;
  /** Saldo actual = startOfDay + dayIncome - dayExpense. */
  balance: number;
  /** Movimientos del mes en curso hasta `today` ordenados por fecha desc. */
  transactions: WalletTransaction[];
}

/**
 * Saldo diario por billetera: el inicio del día acumula todos los movimientos
 * anteriores a `today`, la variación de hoy solo los del día actual, y el saldo
 * actual es la suma de ambos. Todo convertido a la moneda base con las tasas de
 * la fecha de cada transacción. Solo fuentes activas; las transacciones con
 * fecha futura (> today) no cuentan hasta que llegue su día.
 */
export function computeWallets(
  sources: WalletSource[],
  transactions: WalletTransaction[],
  currencyBase: string,
  rateRows: RateRow[],
  today: string,
  maxTransactions = 300
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

    const converted = (bySource.get(src.id) ?? [])
      .filter((tx) => tx.date <= today)
      .map((tx) => ({
        ...tx,
        amountBase: convertAmountToBase(tx.amountOriginal, tx.currencyOriginal, currencyBase, tx.date, rateRows),
      }));

    let previous = 0;
    let dayIncome = 0;
    let dayExpense = 0;
    for (const tx of converted) {
      const signed = tx.type === "ingreso" ? tx.amountBase : -tx.amountBase;
      if (tx.date < today) previous += signed;
      else {
        if (tx.type === "ingreso") dayIncome += tx.amountBase;
        else dayExpense += tx.amountBase;
      }
    }

    const startOfDay = src.initialBalance + previous;
    const monthStart = today.slice(0, 7) + "-01";
    const monthTxs = converted
      .filter((tx) => tx.date >= monthStart)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, maxTransactions);

    wallets.push({
      id: src.id,
      name: src.name,
      type: src.type,
      icon: src.icon,
      color: src.color,
      startOfDay: round2(startOfDay),
      dayIncome: round2(dayIncome),
      dayExpense: round2(dayExpense),
      balance: round2(startOfDay + dayIncome - dayExpense),
      transactions: monthTxs,
    });
  }

  return wallets;
}