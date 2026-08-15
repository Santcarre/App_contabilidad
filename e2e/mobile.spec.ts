import { test, expect, devices } from "@playwright/test";
import { loginAs, mockApi } from "./helpers";

// Emulación de iPhone 13: viewport 390x844, touch, UA móvil.
// Force chromium: el device por defecto usa WebKit, que no instalamos.
test.use({ ...devices["iPhone 13"], browserName: "chromium" });

const mobileList = (page: import("@playwright/test").Page) =>
  page.getByTestId("mobile-list");

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, "la página desborda horizontalmente en móvil").toBeLessThanOrEqual(0);
}

test.describe("móvil (viewport iPhone)", () => {
  test("login carga sin overflow horizontal", async ({ page }) => {
    await mockApi(page);
    await page.goto("/auth/login");
    await expect(page.getByText("Inicia sesión con tu cuenta de Google")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("dashboard carga con datos y sin overflow", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard");
    await expect(page.getByText("Ingresos del mes")).toBeVisible();
    await expect(page.getByText(/1\.300\.000/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("hamburguesa abre el drawer y navega a transacciones", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard");

    const nav = page.getByRole("navigation", { name: "Navegación móvil" });
    await expect(nav).toBeHidden();

    await page.getByRole("button", { name: "Abrir menú" }).tap();
    await expect(nav).toBeVisible();
    await expect(page.getByRole("link", { name: "Transacciones" })).toBeVisible();

    await page.getByRole("link", { name: "Transacciones" }).tap();
    await expect(page).toHaveURL(/\/dashboard\/transacciones/);
    await expect(mobileList(page).getByText("Supermercado")).toBeVisible();
  });

  test("transacciones muestra cards en vez de tabla y sin overflow", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/transacciones");
    await expect(mobileList(page).getByText("Supermercado")).toBeVisible();
    await expect(mobileList(page).getByText("Nómina")).toBeVisible();
    // En móvil la tabla está oculta (las cards la reemplazan)
    await expect(page.locator("table")).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test("reportes: tabs envolventes y sin overflow", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/reportes");
    await expect(page.getByText(/1\.300\.000/).first()).toBeVisible();
    await page.getByRole("tab", { name: "Tendencia" }).tap();
    await expect(page.getByText("Balance diario acumulado del mes")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  for (const pagePath of [
    "/dashboard/categorias",
    "/dashboard/fuentes",
    "/dashboard/recurrentes",
    "/dashboard/presupuestos",
    "/dashboard/configuracion",
    "/dashboard/transacciones/nueva",
  ]) {
    test(`sin overflow horizontal: ${pagePath}`, async ({ page }) => {
      await loginAs(page);
      await mockApi(page);
      await page.goto(pagePath);
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
