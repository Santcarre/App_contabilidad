import { format } from "date-fns";
import type { Locale } from "date-fns";
import { es } from "date-fns/locale";

const LOCALES: Record<string, Locale> = { "es-CO": es, es: es };

export const SUPPORTED_CURRENCIES = [
  { code: "COP", symbol: "$", name: "Peso Colombiano", locale: "es-CO" },
  { code: "USD", symbol: "$", name: "Dólar Americano", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano", locale: "es-MX" },
  { code: "ARS", symbol: "$", name: "Peso Argentino", locale: "es-AR" },
  { code: "CLP", symbol: "$", name: "Peso Chileno", locale: "es-CL" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño", locale: "pt-BR" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano", locale: "es-PE" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Yen Japonés", locale: "ja-JP" },
];

export function getCurrencyInfo(code: string): { code: string; symbol: string; name: string; locale: string } {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? {
    code,
    symbol: code.slice(0, 1),
    name: code,
    locale: "es-CO",
  };
}

export const DEFAULT_CURRENCIES = ["USD", "EUR"];

/**
 * open.er-api.com (gratis, sin key, ~160 monedas) — Frankfurter/ECB NO
 * publica COP, por eso el auto-refresh anterior escribía NaN siempre.
 * Respuesta base USD: { result: "success", rates: { COP, EUR, USD, ... } }.
 */
const ER_API = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let rateCache: { rates: Record<string, number>; timestamp: number } | null = null;

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: "auto" | "manual";
  date: string;
  fetchedAt: string;
}

export interface RateRow {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: "auto" | "manual";
  date: string;
  fetchedAt?: string;
}

/**
 * Tasa de COP por 1 unidad de `target` para una fecha: manual del día >
 * auto del día > auto más reciente (≤ fecha). Las filas almacenadas son
 * siempre "COP por unidad de target", aunque la columna base diga otra cosa.
 */
export function rateForTarget(rows: RateRow[], target: string, date: string): number | undefined {
  const dayManual = rows.find((r) => r.targetCurrency === target && r.date === date && r.source === "manual");
  if (dayManual) return dayManual.rate;
  const dayAuto = rows.find((r) => r.targetCurrency === target && r.date === date && r.source === "auto");
  if (dayAuto) return dayAuto.rate;
  const recent = rows
    .filter((r) => r.targetCurrency === target && r.source === "auto" && r.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return recent?.rate;
}

/**
 * Convierte un monto almacenado en `fromBase` (su moneda base al guardarse)
 * a la moneda base actual `toBase`, usando las tasas de la fecha del monto.
 * Si faltan tasas, devuelve el monto sin convertir (comportamiento previo).
 */
export function convertAmountToBase(
  amount: number,
  fromBase: string,
  toBase: string,
  date: string,
  rateRows: RateRow[]
): number {
  if (fromBase === toBase || !Number.isFinite(amount) || amount <= 0) return amount;
  const copPerFrom = rateForTarget(rateRows, fromBase, date);
  const copPerTo = rateForTarget(rateRows, toBase, date);
  if (fromBase === "COP") {
    if (!copPerTo) return amount;
    return Math.round((amount / copPerTo) * 100) / 100;
  }
  if (toBase === "COP") {
    if (!copPerFrom) return amount;
    return Math.round(amount * copPerFrom * 100) / 100;
  }
  if (!copPerFrom || !copPerTo) return amount;
  return Math.round(((amount * copPerFrom) / copPerTo) * 100) / 100;
}

export async function fetchLatestRates(): Promise<Record<string, number>> {
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL) {
    return rateCache.rates;
  }
  const res = await fetch(ER_API);
  if (!res.ok) throw new Error(`open.er-api ${res.status}`);
  const data = await res.json();
  if (data?.result !== "success" || !data.rates) {
    throw new Error("open.er-api: respuesta inválida");
  }
  rateCache = { rates: data.rates, timestamp: Date.now() };
  return data.rates;
}

/**
 * Convierte tasas base USD (open.er-api) a "COP por unidad" para TODAS las
 * monedas devueltas: p.ej. { USD: 4200, EUR: 4600, MXN: 230, ... }.
 * Antes devolvía "unidades por 1 COP" (invertido) y solo USD/EUR.
 * Lanza si la respuesta no trae la tasa de COP (no se deben escribir NaN).
 */
export function getCopRates(rates: Record<string, number>): Record<string, number> {
  const copPerUsd = rates.COP;
  if (!Number.isFinite(copPerUsd) || copPerUsd <= 0) {
    throw new Error("La API de tasas no devolvió la tasa de COP");
  }
  const copRates: Record<string, number> = {};
  for (const [code, perUsd] of Object.entries(rates)) {
    if (!Number.isFinite(perUsd) || perUsd <= 0) continue;
    copRates[code] = copPerUsd / perUsd;
  }
  copRates.COP = 1;
  return copRates;
}

export function convert(amount: number, from: string, to: string, rate: number): number {
  if (from === to) return amount;
  return Math.round(amount * rate * 100) / 100;
}

export function formatCurrency(amount: number, currency: string, locale?: string): string {
  const info = getCurrencyInfo(currency);
  const loc = locale ?? info.locale;
  const alwaysCents = ["USD", "GBP", "EUR", "BRL"].includes(info.code);
  const hasDecimals = amount % 1 !== 0;
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: alwaysCents ? 2 : hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${info.code} ${amount.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

export function formatMoneyDisplay(raw: string): string {
  if (!raw) return "";
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const [intPart, decPart] = normalized.split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decPart === undefined) return intFormatted;
  return `${intFormatted},${decPart.slice(0, 2)}`;
}

export function parseMoneyInput(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

export function getRate(
  base: string,
  target: string,
  date: string,
  manualRates: ExchangeRate[],
  autoRates: ExchangeRate[]
): number {
  const manual = manualRates.find((r) => r.targetCurrency === target && r.date === date && r.source === "manual");
  if (manual) return manual.rate;

  const autoToday = autoRates.find((r) => r.targetCurrency === target && r.date === date && r.source === "auto");
  if (autoToday) return autoToday.rate;

  const autoRecent = autoRates
    .filter((r) => r.targetCurrency === target && r.source === "auto" && r.date <= date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (autoRecent) return autoRecent.rate;

  // Antes caía a 1.0 en silencio → amountBase corrupto que no se registraba
  // en el balance. Ahora falla con un mensaje claro (el toast lo muestra).
  throw new Error(
    `No hay tasa de cambio para ${target} el día ${date}. Actualiza las tasas en Configuración.`
  );
}

export function getLatestRate(
  rates: Array<{ targetCurrency: string; rate: number; source: string; date: string }>,
  target: string,
  date: string
): number | undefined {
  const manual = rates.find((r) => r.targetCurrency === target && r.date === date && r.source === "manual");
  if (manual) return manual.rate;
  const autoToday = rates.find((r) => r.targetCurrency === target && r.date === date && r.source === "auto");
  if (autoToday) return autoToday.rate;
  const recent = rates
    .filter((r) => r.targetCurrency === target && r.date <= date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return recent?.rate;
}

export function getTodayRate<T extends { targetCurrency: string; rate: number; source: string; date: string }>(
  rates: T[],
  target: string,
  date: string
): T | undefined {
  const manualToday = rates.find((r) => r.targetCurrency === target && r.date === date && r.source === "manual");
  if (manualToday) return manualToday;
  const autoToday = rates.find((r) => r.targetCurrency === target && r.date === date && r.source === "auto");
  if (autoToday) return autoToday;
  return rates
    .filter((r) => r.targetCurrency === target && r.date <= date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function formatDate(dateStr: string, locale = "es-CO"): string {
  try {
    return format(parseISO(dateStr), "PP", { locale: LOCALES[locale] ?? es });
  } catch {
    return dateStr;
  }
}

function parseISO(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}