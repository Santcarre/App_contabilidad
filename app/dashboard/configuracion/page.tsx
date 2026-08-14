"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Save } from "lucide-react";
import { SUPPORTED_CURRENCIES, getCurrencyInfo, getTodayRate } from "@/lib/currency";
import { useTheme } from "@/components/theme-provider";
import {
  useConfig,
  useUpdateConfig,
  useRates,
  useUpdateRatesNow,
  useOverrideRate,
} from "@/hooks/use-config";

export default function ConfiguracionPage() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const { data: ratesData, isLoading: loadingRates } = useRates();
  const updateRatesNow = useUpdateRatesNow();
  const overrideRate = useOverrideRate();
  const { setTheme: applyTheme } = useTheme();

  const [currencyBase, setCurrencyBase] = useState("COP");
  const [theme, setTheme] = useState("system");
  const [budgetStrictMode, setBudgetStrictMode] = useState(false);
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(["USD", "EUR"]);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setTheme(config.theme);
      applyTheme(config.theme as "light" | "dark" | "system");
      setCurrencyBase(config.currencyBase);
      setBudgetStrictMode(config.budgetStrictMode);
      setActiveCurrencies(config.currencies);
    }
  }, [config, applyTheme]);

  useEffect(() => {
    if (!ratesData || !updateRatesNow.isIdle) return;
    const today = new Date().toISOString().split("T")[0];
    const missing = ratesData.currencies.some(
      (c) => !ratesData.rates.some((r) => r.targetCurrency === c && r.date === today)
    );
    if (missing) updateRatesNow.mutate();
  }, [ratesData, updateRatesNow]);

  useEffect(() => {
    if (ratesData) {
      const today = new Date().toISOString().split("T")[0];
      const inputs: Record<string, string> = {};
      for (const code of ratesData.currencies) {
        const rate = getTodayRate(ratesData.rates, code, today);
        if (rate) inputs[code] = String(rate.rate);
      }
      setRateInputs((prev) => ({ ...prev, ...inputs }));
    }
  }, [ratesData]);

  const today = new Date().toISOString().split("T")[0];

  const handleToggleCurrency = (code: string, enabled: boolean) => {
    const next = enabled
      ? [...new Set([...activeCurrencies, code])]
      : activeCurrencies.filter((c) => c !== code);
    setActiveCurrencies(next);
    updateConfig.mutate({ currencies: next });
  };

  const handleRateInput = (code: string, value: string) => {
    setRateInputs((prev) => ({ ...prev, [code]: value }));
  };

  const handleSaveRate = (code: string) => {
    const rate = parseFloat(rateInputs[code] ?? "");
    if (!rate || rate <= 0) return;
    overrideRate.mutate({ targetCurrency: code, rate });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="monedas">Monedas</TabsTrigger>
          <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tema</Label>
                  <p className="text-sm text-muted-foreground">Elige el modo de color de la aplicación</p>
                </div>
                <Select value={theme} onValueChange={(value) => { setTheme(value); applyTheme(value as "light" | "dark" | "system"); updateConfig.mutate({ theme: value }); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moneda base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Moneda principal</Label>
                  <p className="text-sm text-muted-foreground">Todos los reportes y balances se mostrarán en esta moneda</p>
                </div>
                <Select value={currencyBase} onValueChange={(value) => { setCurrencyBase(value); updateConfig.mutate({ currencyBase: value }); }}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monedas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monedas activas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Las tasas de estas monedas se actualizan automáticamente cada día y se usan al registrar transacciones.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {SUPPORTED_CURRENCIES.filter((c) => c.code !== currencyBase).map((c) => (
                  <div key={c.code} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold w-8">{c.symbol}</span>
                      <div>
                        <p className="text-sm font-medium">{c.code}</p>
                        <p className="text-xs text-muted-foreground">{c.name}</p>
                      </div>
                    </div>
                    <Switch
                      checked={activeCurrencies.includes(c.code)}
                      onCheckedChange={(enabled) => handleToggleCurrency(c.code, enabled)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasas de Cambio</CardTitle>
              <Button variant="outline" size="sm" onClick={() => updateRatesNow.mutate()} disabled={updateRatesNow.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${updateRatesNow.isPending ? "animate-spin" : ""}`} />
                Actualizar ahora
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Las tasas se actualizan automáticamente cada día a las 6 AM UTC desde Frankfurter.dev.
                  Puedes sobrescribir manualmente cualquier tasa (prioridad sobre la automática).
                </p>
                {loadingRates ? (
                  <p className="py-8 text-center text-muted-foreground">Cargando tasas...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Moneda</TableHead>
                        <TableHead>1 {currencyBase} =</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeCurrencies.filter((c) => c !== currencyBase).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay monedas activas. Activa algunas en "Monedas activas".
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeCurrencies.filter((c) => c !== currencyBase).map((code) => {
                          const info = getCurrencyInfo(code);
                          const rate = ratesData
                            ? getTodayRate(ratesData.rates, code, today)
                            : undefined;
                          return (
                            <TableRow key={code}>
                              <TableCell className="font-medium">{info.code} <span className="text-muted-foreground">{info.symbol}</span></TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.000001"
                                  min="0"
                                  value={rateInputs[code] ?? ""}
                                  onChange={(e) => handleRateInput(code, e.target.value)}
                                  className="w-[160px] font-mono"
                                />
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rate?.source === "manual" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                                  {rate?.source === "manual" ? "Manual" : rate ? "Automática" : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{rate?.date ?? "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSaveRate(code)}
                                  disabled={overrideRate.isPending}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  Guardar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presupuestos">
          <Card>
            <CardHeader>
              <CardTitle>Comportamiento de Presupuestos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Modo estricto</Label>
                  <p className="text-sm text-muted-foreground">
                    Si está activado, al superar el 100% del presupuesto se bloqueará el gasto (error).
                    Si está desactivado, solo mostrará una advertencia.
                  </p>
                </div>
                <Switch
                  checked={budgetStrictMode}
                  onCheckedChange={(value) => { setBudgetStrictMode(value); updateConfig.mutate({ budgetStrictMode: value }); }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
