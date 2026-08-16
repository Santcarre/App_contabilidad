import { test, expect } from "@playwright/test";
import { loginAs, mockApi } from "./helpers";

test.describe("billeteras", () => {
  test("muestra saldo total, inicio del día y movimientos de hoy", async ({ page }) => {
    await loginAs(page);
    await mockApi(page);
    await page.goto("/dashboard/billeteras");

    await expect(page.getByRole("heading", { name: "Billeteras" })).toBeVisible();
    await expect(page.getByText("Saldo total")).toBeVisible();
    await expect(page.getByText(/1\.050\.000/).first()).toBeVisible();
    await expect(page.getByText("Efectivo", { exact: true })).toBeVisible();
    await expect(page.getByText("Bancolombia", { exact: true })).toBeVisible();
    await expect(page.getByText("Inicio del día").first()).toBeVisible();
    await expect(page.getByText("Hoy +").first()).toBeVisible();
    await expect(page.getByText("Hoy −").first()).toBeVisible();
    await expect(page.getByText("Gestionar medios de pago")).toBeVisible();

    await page.getByText("Efectivo", { exact: true }).click();
    await expect(page.getByText("Movimientos — Efectivo")).toBeVisible();
    await expect(page.getByText(/Movimientos de hoy/)).toBeVisible();
    await expect(page.getByText("Supermercado")).toBeVisible();
    await expect(page.getByText("Pago proyecto")).toBeVisible();

    await page.getByRole("button", { name: /Cerrar/ }).click();
    await expect(page.getByText("Movimientos — Efectivo")).toBeHidden();
  });
});