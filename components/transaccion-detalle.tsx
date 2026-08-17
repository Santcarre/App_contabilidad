import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownRight, Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/currency";
import { CategoryIcon } from "@/components/ui/icon-picker";
import type { Transaction } from "@/hooks/use-transactions";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export function TransactionDetailsDialog({
  tx,
  onClose,
}: {
  tx: Transaction | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={tx !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain">
        {tx && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className={`rounded-full p-1.5 ${
                    tx.type === "ingreso" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {tx.type === "ingreso" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                {tx.note || tx.categoryName || "Transacción"}
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">Monto</p>
              <p
                className={`font-mono text-2xl font-bold tabular-nums ${
                  tx.type === "ingreso" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.type === "ingreso" ? "+" : "−"}
                {formatCurrency(tx.amountOriginal, tx.currencyOriginal)}
                <span className="ml-1.5 align-middle rounded bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {tx.currencyOriginal}
                </span>
              </p>
              {tx.currencyOriginal !== tx.currencyBase && (
                <p className="mt-1 text-xs text-muted-foreground">
                  = {formatCurrency(tx.amountBase, tx.currencyBase)} en moneda base
                </p>
              )}
            </div>
            <div className="divide-y">
              <DetailRow label="Tipo">
                <span className={tx.type === "ingreso" ? "text-green-600" : "text-red-600"}>
                  {tx.type === "ingreso" ? "Ingreso" : "Gasto"}
                </span>
              </DetailRow>
              <DetailRow label="Categoría">
                <span className="flex items-center gap-1.5">
                  {tx.categoryIcon && (
                    <CategoryIcon name={tx.categoryIcon} color={tx.categoryColor} className="h-4 w-4" />
                  )}
                  {tx.categoryName || "Sin categoría"}
                </span>
              </DetailRow>
              <DetailRow label="Medio de pago">
                <span className="flex items-center gap-1.5">
                  {tx.sourceIcon && (
                    <CategoryIcon name={tx.sourceIcon} color={tx.sourceColor} className="h-4 w-4" />
                  )}
                  {tx.sourceName || "Sin fuente"}
                </span>
              </DetailRow>
              <DetailRow label="Fecha">{formatDate(tx.date)}</DetailRow>
              {tx.note && <DetailRow label="Nota">{tx.note}</DetailRow>}
              {tx.recurringId && (
                <DetailRow label="Tipo">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                    <Repeat className="mr-1 h-3 w-3" />
                    Recurrente
                  </span>
                </DetailRow>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}