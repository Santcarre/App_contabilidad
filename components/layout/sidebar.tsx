"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CreditCard,
  Tags,
  Wallet,
  PiggyBank,
  Target,
  Repeat,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transacciones", href: "/dashboard/transacciones", icon: CreditCard },
  { name: "Categorías", href: "/dashboard/categorias", icon: Tags },
  { name: "Medio de Pago", href: "/dashboard/fuentes", icon: Wallet },
  { name: "Billeteras", href: "/dashboard/billeteras", icon: PiggyBank },
  { name: "Presupuestos", href: "/dashboard/presupuestos", icon: Target },
  { name: "Recurrentes", href: "/dashboard/recurrentes", icon: Repeat },
  { name: "Reportes", href: "/dashboard/reportes", icon: BarChart3 },
  { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

function NavItems({
  collapsed,
  onNavigate,
  ariaLabel,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  ariaLabel: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-2" aria-label={ariaLabel}>
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const brand = (
    <Link href="/dashboard" onClick={onClose} className="font-semibold text-lg">
      Contabilidad
    </Link>
  );

  return (
    <>
      {/* Desktop (lg+): sidebar fija, colapsable */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-200 hidden lg:flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b flex-shrink-0">
          {!collapsed && brand}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <NavItems collapsed={collapsed} ariaLabel="Navegación principal" />

        <div className="p-2 border-t flex-shrink-0">
          {!collapsed && (
            <p className="text-xs text-muted-foreground text-center">v1.0.0</p>
          )}
        </div>
      </aside>

      {/* Móvil (< lg): drawer deslizante con overlay */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-72 p-0" hideCloseButton>
          <SheetHeader className="flex h-16 flex-row items-center justify-between px-4 border-b flex-shrink-0">
            <SheetTitle className="text-lg">{brand}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>
          <NavItems collapsed={false} onNavigate={onClose} ariaLabel="Navegación móvil" />
          <Separator className="flex-shrink-0" />
          <div className="p-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground text-center">v1.0.0</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
