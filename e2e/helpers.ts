import { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { E2E_SECRET } from "../playwright.config";

export const TEST_USER = {
  name: "Daniel Test",
  email: "dany@test.com",
  spreadsheetId: "fake-spreadsheet-id",
};

export async function loginAs(page: Page, email = TEST_USER.email) {
  // next-auth v5: salt = nombre de la cookie de sesión
  const token = await encode({
    token: {
      name: TEST_USER.name,
      email,
      picture: "",
      sub: email,
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
      accessTokenExpires: Date.now() + 60 * 60 * 1000,
      spreadsheetId: TEST_USER.spreadsheetId,
    },
    secret: E2E_SECRET,
    salt: "authjs.session-token",
    maxAge: 30 * 24 * 60 * 60,
  });
  await page.context().addCookies([
    { name: "authjs.session-token", value: token, url: "http://localhost:3000" },
  ]);
}

const CATEGORIAS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Mercado", type: "gasto", icon: "cart", color: "emerald-500", order: 0, active: true },
  { id: "11111111-1111-4111-8111-111111111112", name: "Salario", type: "ingreso", icon: "briefcase", color: "blue-500", order: 0, active: true },
];

const FUENTES = [
  { id: "22222222-2222-4222-8222-222222222221", name: "Efectivo", type: "efectivo", icon: "wallet", color: "amber-500", initialBalance: 100000, active: true },
  { id: "22222222-2222-4222-8222-222222222222", name: "Bancolombia", type: "banco", icon: "building-2", color: "blue-500", initialBalance: 0, active: true },
];

const REPORTE = {
  currencyBase: "COP",
  summary: { income: 2500000, expense: 1200000, balance: 1300000, prevIncome: 2000000, prevExpense: 1100000, prevBalance: 900000 },
  trend: [
    { month: "2026-07", income: 2000000, expense: 1100000, balance: 900000 },
    { month: "2026-08", income: 2500000, expense: 1200000, balance: 1300000 },
  ],
  categoryBreakdown: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Mercado", color: "emerald-500", total: 800000, count: 4, percentage: 67 },
  ],
  sourceBreakdown: [
    { id: "22222222-2222-4222-8222-222222222221", name: "Efectivo", color: "amber-500", total: 1200000, count: 6, percentage: 100 },
  ],
  dailyBalance: [
    { date: "2026-08-01", balance: 500000 },
    { date: "2026-08-02", balance: 1300000 },
  ],
};

export function mockApi(page: Page) {
  return page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    const json = (data: any) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });

    // Sesión y signout: pasan al servidor real (la cookie forjada se decodifica ahí)
    if (path === "/api/auth/session" || path === "/api/auth/signout" || path === "/api/auth/providers") {
      return route.continue();
    }
    // Switch de usuario: next-auth hace fetch con redirect:false y espera { url }.
    // OJO: data.url debe ser ABSOLUTA (new URL(data.url) en next-auth lanza con relativas).
    if (path.startsWith("/api/auth/callback/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "http://localhost:3000/dashboard" }) });
    }
    // OJO: debe ir ANTES del catch-all /api/auth/ de abajo
    if (path === "/api/auth/users") {
      return json({ users: [
        { email: TEST_USER.email, name: TEST_USER.name, active: true },
        { email: "otro@test.com", name: "Otra Cuenta", active: false },
      ]});
    }
    if (path.startsWith("/api/auth/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });

    if (path === "/api/configuracion") {
      if (method === "PUT") return json({ success: true });
      return json({ theme: "system", currencyBase: "COP", language: "es", dateFormat: "DD/MM/YYYY", budgetStrictMode: false, currencies: ["USD", "EUR"] });
    }
    if (path === "/api/categorias") {
      if (method === "POST") return json({ success: true, id: "new-cat" });
      return json({ categories: CATEGORIAS });
    }
    if (path === "/api/fuentes") {
      if (method === "POST") return json({ success: true, id: "new-src" });
      return json({ sources: FUENTES });
    }
    if (path === "/api/transacciones") {
      if (method === "POST") return json({ success: true, id: "tx-new", budgetAlert: null });
      if (method === "PUT") return json({ success: true });
      if (method === "DELETE") return json({ success: true });
      return json({
        transactions: [
          { id: "t1", type: "gasto", amountOriginal: 50000, currencyOriginal: "COP", amountBase: 50000, currencyBase: "COP", categoryId: CATEGORIAS[0].id, sourceId: FUENTES[0].id, date: "2026-08-10", note: "Supermercado", recurringId: "", categoryName: "Mercado", sourceName: "Efectivo" },
          { id: "t2", type: "ingreso", amountOriginal: 2500000, currencyOriginal: "COP", amountBase: 2500000, currencyBase: "COP", categoryId: CATEGORIAS[1].id, sourceId: FUENTES[1].id, date: "2026-08-01", note: "Nómina", recurringId: "", categoryName: "Salario", sourceName: "Bancolombia" },
        ],
        total: 2,
        limit: 25,
        offset: 0,
      });
    }
    if (path === "/api/reportes") return json(REPORTE);
    if (path === "/api/billeteras") {
      return json({
        currencyBase: "COP",
        wallets: [
          {
            id: FUENTES[0].id, name: "Efectivo", type: "efectivo", icon: "wallet", color: "amber-500",
            initialBalance: 100000, income: 2500000, expense: 1200000, balance: 1400000,
            transactions: [
              { id: "t1", type: "gasto", amountOriginal: 50000, currencyOriginal: "COP", amountBase: 50000, date: "2026-08-10", sourceId: FUENTES[0].id, categoryName: "Mercado", note: "Supermercado" },
              { id: "t2", type: "ingreso", amountOriginal: 2500000, currencyOriginal: "COP", amountBase: 2500000, date: "2026-08-01", sourceId: FUENTES[0].id, categoryName: "Salario", note: "Nómina" },
            ],
          },
          {
            id: FUENTES[1].id, name: "Bancolombia", type: "banco", icon: "building-2", color: "blue-500",
            initialBalance: 0, income: 0, expense: 0, balance: 0, transactions: [],
          },
        ],
      });
    }
    if (path === "/api/recurrentes") return json({ recurrents: [] });
    if (path === "/api/presupuestos") return json({ budgets: [] });
    if (path === "/api/exchange-rates") return json({ rates: [], baseCurrency: "COP", currencies: ["COP", "USD", "EUR"] });

    // Ruta no cubierta: 404 en vez de {} silencioso — un typo en un endpoint
    // futuro debe fallar el test, no dar un falso positivo.
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "mock sin definir" }) });
  });
}
