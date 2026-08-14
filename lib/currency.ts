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

const FRANKFURTER_BASE = "https://api.frankfurter.dev/v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let rateCache: { rates: Record<string, number>; timestamp: number } | null = null;

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: "USD" | "EUR";
  rate: number;
  source: "auto" | "manual";
  date: string;
  fetchedAt: string;
}

export async function fetchLatestRates(base = "EUR"): Promise<Record<string, number>> {
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL) {
    return rateCache.rates;
  }
  const res = await fetch(`${FRANKFURTER_BASE}/latest?base=${base}`);
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = await res.json();
  rateCache = { rates: data.rates, timestamp: Date.now() };
  return data.rates;
}

export async function fetchHistoricalRate(date: string, base = "EUR"): Promise<Record<string, number>> {
  const res = await fetch(`${FRANKFURTER_BASE}/${date}?base=${base}`);
  if (!res.ok) throw new Error(`Frankfurter historical ${res.status}`);
  const data = await res.json();
  return data.rates;
}

export function getCopRates(eurRates: Record<string, number>): { USD: number; EUR: number } {
  const eurToCop = 1 / eurRates.COP;
  return {
    EUR: eurToCop,
    USD: eurRates.USD * eurToCop,
  };
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

  console.warn(`No rate found for ${base}/${target} on ${date}, using 1.0`);
  return 1.0;
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