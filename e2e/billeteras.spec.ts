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
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Movimientos — Efectivo")).toBeVisible();
    await expect(dialog.getByText(/Resumen del día/)).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Hoy/ })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Esta semana/ })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Este mes/ })).toHaveCount(0);
    await expect(dialog.getByText("Supermercado")).toBeVisible();
    await expect(dialog.getByText("Domicilio")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Transacciones" })).toBeVisible();

    await page.getByRole("button", { name: /Cerrar/ }).click();
    await expect(dialog).toBeHidden();
  });
});