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

    await page.getByRole("tab", { name: "Día" }).click();
    await expect(page.getByText("Ingresos de hoy")).toBeVisible();
    await expect(page.getByText("Gastos de hoy")).toBeVisible();

    await page.getByRole("tab", { name: "Semana" }).click();
    await expect(page.getByText("Ingresos de la semana")).toBeVisible();
    await expect(page.getByText("Gastos de la semana")).toBeVisible();

    await page.getByRole("tab", { name: "Mes" }).click();
    await expect(page.getByText("Ingresos del mes")).toBeVisible();
  });

  test("dashboard muestra las últimas transacciones", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard");
    await expect(page.getByText("Últimas transacciones")).toBeVisible();
    await expect(page.getByText("Supermercado")).toBeVisible();
    await expect(page.getByText("Nómina")).toBeVisible();
    await expect(page.getByText("Ver todas")).toBeVisible();
    await expect(page.getByText("COP", { exact: true }).first()).toBeVisible();
  });

  test("detalle de transacción: click en la fila abre los detalles completos", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Ver detalles de Supermercado" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Supermercado").first()).toBeVisible();
    await expect(dialog.getByText("Gasto", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Mercado", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Efectivo", { exact: true })).toBeVisible();
    await expect(dialog.getByText("COP", { exact: true })).toBeVisible();
    await expect(dialog.getByText("50.000")).toBeVisible();

    await page.getByRole("button", { name: /Cerrar/ }).click();
    await expect(dialog).toBeHidden();
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
    // Scoped a la tabla: el card list móvil también contiene esos textos (oculto en desktop)
    const table = page.locator("table");
    await expect(table.getByText("Supermercado")).toBeVisible();
    await expect(table.getByText("Nómina")).toBeVisible();
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

    // Trigger del menú del avatar: el único botón con aria-haspopup="menu"
    // cuyo nombre es la inicial del usuario (el theme-toggle también es un
    // menú, pero su nombre está vacío — solo contiene un icono)
    const avatarTrigger = page
      .locator('header button[aria-haspopup="menu"]')
      .filter({ hasText: "D" });
    await avatarTrigger.click();
    await page.getByText("Otra Cuenta").click();
    // switchUser hace window.location.href = "/dashboard" (reload completo:
    // el toast se pierde en el reload, se valida el resultado por la URL)
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

    // Cerrar sesión real
    await avatarTrigger.click();
    await page.getByRole("menuitem", { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
