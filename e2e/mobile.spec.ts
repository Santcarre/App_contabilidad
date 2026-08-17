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
  test("transacciones: tocar cualquier zona de la tarjeta abre el detalle", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/transacciones");
    const card = mobileList(page).getByText("Supermercado").locator("..").locator("..");
    await card.locator(".font-mono").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Supermercado" })).toBeVisible();
    await page.getByRole("button", { name: /Cerrar/ }).click();
    await expect(dialog).toBeHidden();
  });

test("reportes: los porcentajes del pie caben dentro del gráfico en móvil", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/reportes");
    await page.getByRole("tab", { name: "Categorías" }).tap();
    await page.waitForTimeout(500);
    const check = async () => {
      return page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll("svg"));
        const chart = svgs.map((s) => ({ el: s, r: s.getBoundingClientRect() })).filter((x) => x.r.width > 100).sort((a, b) => b.r.width - a.r.width)[0];
        if (!chart) return { error: "no chart svg" };
        const svgRect = chart.r;
        const labels = Array.from(chart.el.querySelectorAll("text")).filter((t) => t.textContent && t.textContent.trim());
        if (labels.length === 0) return { error: "sin labels" };
        const overflows = labels.filter((t) => {
          const r = t.getBoundingClientRect();
          return r.left < svgRect.left || r.right > svgRect.right || r.top < svgRect.top || r.bottom > svgRect.bottom;
        }).map((t) => t.textContent);
        return { nLabels: labels.length, overflows, svgW: Math.round(svgRect.width) };
      });
    };
    const res = await check();
    expect(res.error).toBeUndefined();
    expect(res.overflows).toEqual([]);
    expect(res.nLabels).toBeGreaterThan(0);
  });
