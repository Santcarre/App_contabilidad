import { test, expect } from "@playwright/test";
import { loginAs, mockApi } from "./helpers";

test.describe("flujo principal (login → dashboard → transacción → reportes → logout)", () => {
  test("sin sesión redirige a /auth/login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText("Inicia sesión con tu cuenta de Google")).toBeVisible();
  });

  test("dashboard carga con datos reales (mockeados)", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard");
    await expect(page.getByText("Ingresos del mes")).toBeVisible();
    await expect(page.getByText(/1\.300\.000/).first()).toBeVisible();
  });

  test("crear transacción: formulario válido → toast + redirección", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/transacciones/nueva");
    await expect(page.getByRole("heading", { name: /nuevo gasto/i })).toBeVisible();

    await page.getByLabel("Monto").fill("75.000");
    await page.getByText("Seleccionar categoría", { exact: true }).click();
    await page.getByText("Mercado", { exact: true }).click();
    await page.getByText("Seleccionar medio de pago", { exact: true }).click();
    await page.getByText("Efectivo", { exact: true }).click();

    await page.getByRole("button", { name: "Guardar transacción" }).click();
    await expect(page.getByText("Transacción creada")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/transacciones$/);
  });

  test("lista de transacciones muestra filas y filtros", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/transacciones");
    await expect(page.getByText("Supermercado")).toBeVisible();
    await expect(page.getByText("Nómina")).toBeVisible();
    await expect(page.getByText("2 transacciones")).toBeVisible();
  });

  test("reportes: tabs, resumen y desglose", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/reportes");
    await expect(page.getByText(/1\.300\.000/).first()).toBeVisible();
    await page.getByRole("tab", { name: "Categorías" }).click();
    await expect(page.getByText("Desglose por Categoría")).toBeVisible();
    await page.getByRole("tab", { name: "Medio de Pago" }).click();
    await expect(page.getByText("Desglose por Medio de Pago (gastos)")).toBeVisible();
    await page.getByRole("tab", { name: "Tendencia" }).click();
    await expect(page.getByText("Balance diario acumulado del mes")).toBeVisible();
  });

  test("switch de usuario y logout", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/transacciones");

    // Abrir el menú del avatar y cambiar a otra cuenta
    await page.locator("header").getByRole("button").last().click();
    await page.getByText("Otra Cuenta").click();
    // switchUser hace window.location.href = "/dashboard" (reload completo:
    // el toast se pierde en el reload, se valida el resultado por la URL)
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Cerrar sesión real
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("menuitem", { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
