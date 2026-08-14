import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["gasto", "ingreso"]),
  amountOriginal: z.number().positive().max(999_999_999).multipleOf(0.01),
  currencyOriginal: z.enum(["COP", "USD", "EUR"]),
  categoryId: z.string().uuid(),
  sourceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
  recurringId: z.string().uuid().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["gasto", "ingreso"]),
  icon: z.string().min(1),
  color: z.string().regex(/^[a-z]+-\d{3}$/),
  order: z.number().int().min(0).optional(),
});

export const sourceSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["efectivo", "digital", "banco", "tarjeta"]),
  icon: z.string().min(1),
  color: z.string().regex(/^[a-z]+-\d{3}$/),
  initialBalance: z.number().multipleOf(0.01).optional(),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid(),
  limitAmount: z.number().positive().multipleOf(0.01),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  alert80: z.boolean().default(true),
  alert100: z.boolean().default(true),
});

export const recurringSchema = z.object({
  type: z.enum(["gasto", "ingreso"]),
  amountOriginal: z.number().positive().max(999_999_999).multipleOf(0.01),
  currencyOriginal: z.enum(["COP", "USD", "EUR"]),
  categoryId: z.string().uuid(),
  sourceId: z.string().uuid(),
  frequency: z.enum(["mensual"]),
  dayOfMonth: z.number().int().min(1).max(28),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  active: z.boolean().default(true),
  note: z.string().max(200).optional().nullable(),
});

export const configSchema = z.object({
  currencyBase: z.enum(["COP", "USD", "EUR"]).default("COP"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["es", "en"]).default("es"),
  dateFormat: z.string().default("DD/MM/YYYY"),
  budgetStrictMode: z.boolean().default(false),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SourceInput = z.infer<typeof sourceSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type RecurringInput = z.infer<typeof recurringSchema>;
export type ConfigInput = z.infer<typeof configSchema>;