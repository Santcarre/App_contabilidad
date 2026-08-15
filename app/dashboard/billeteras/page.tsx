"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/ui/icon-picker";
import { ArrowDownRight, ArrowUpRight, Landmark, Plus, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/currency";
import { useBilleteras } from "@/hooks/use-billeteras";
import type { Wallet } from "@/lib/wallets";

function SkeletonCard() {
  return <div className="h-44 animate-pulse rounded-xl bg-muted" />;
}

function WalletCard({ wallet, currency, onOpen }: { wallet: Wallet; currency: string; onOpen: () => void }) {
  const negative = wallet.balance < 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-muted p-2.5">
          <CategoryIcon name={wallet.icon} color={wallet.color} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{wallet.name}</p>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
            {wallet.type}
          </span>
        </div>
      </div>

      <p className="mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight">
        <span className={negative ? "text-red-600" : ""}>{formatCurrency(wallet.balance, currency)}</span>
      </p>
      <p className="text-xs text-muted-foreground">Saldo actual</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-muted-foreground">
            <Landmark className="h-3 w-3" />
            Inicial
          </p>
          <p className="mt-0.5 font-mono tabular-nums">{formatCurrency(wallet.initialBalance, currency)}</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Ingresos
          </p>
          <p className="mt-0.5 font-mono tabular-nums text-green-600">+{formatCurrency(wallet.income, currency)}</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Gastos
          </p>
          <p className="mt-0.5 font-mono tabular-nums text-red-600">−{formatCurrency(wallet.expense, currency)}</p>
        </div>
      </div>
    </button>
  );
}

function MovementsDialog({
  wallet,
  currency,
  onClose,
}: {
  wallet: Wallet | null;
  currency: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={wallet !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>Movimientos — {wallet?.name}</DialogTitle>
        </DialogHeader>
        {wallet && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">Saldo actual</p>
              <p className={`font-mono text-2xl font-bold tabular-nums ${wallet.balance < 0 ? "text-red-600" : ""}`}>
                {formatCurrency(wallet.balance, currency)}
              </p>
            </div>
            {wallet.transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos en esta billetera</p>
            ) : (
              <ul className="space-y-2">
                {wallet.transactions.map((tx) => {
                  const isIncome = tx.type === "ingreso";
                  return (
                    <li key={tx.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span
                        className={`rounded-full p-1.5 ${isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                      >
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tx.note || tx.categoryName || "Sin descripción"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <p className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : "−"}
                        {formatCurrency(tx.amountBase, currency)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BilleterasPage() {
  const { data, isLoading } = useBilleteras();
  const [selected, setSelected] = useState<Wallet | null>(null);

  const currency = data?.currencyBase ?? "COP";
  const wallets = data?.wallets ?? [];
  const total = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Billeteras</h1>
          <p className="text-muted-foreground">Saldos de tus medios de pago</p>
        </div>
        <Link href="/dashboard/fuentes">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Gestionar medios de pago
          </Button>
        </Link>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 text-primary-foreground shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm opacity-90">
              <WalletIcon className="h-4 w-4" />
              Saldo total
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
              {isLoading ? "—" : formatCurrency(total, currency)}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {wallets.length} billetera{wallets.length === 1 ? "" : "s"} · saldo inicial + ingresos − gastos
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="rounded-xl border py-16 text-center text-muted-foreground">
          <p>No hay medios de pago activos.</p>
          <Link href="/dashboard/fuentes" className="mt-2 inline-block text-primary underline underline-offset-4">
            Crea uno en Medios de Pago
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} currency={currency} onOpen={() => setSelected(wallet)} />
          ))}
        </div>
      )}

      <MovementsDialog wallet={selected} currency={currency} onClose={() => setSelected(null)} />
    </div>
  );
}