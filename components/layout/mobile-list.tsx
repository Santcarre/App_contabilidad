"use client";

import { cn } from "@/lib/utils";

/**
 * Lista de tarjetas apiladas que solo se muestra en móvil (< md).
 * La tabla equivalente se oculta con `hidden md:block`.
 */
export function MobileList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="md:hidden space-y-3" data-testid="mobile-list">
      {children}
    </ul>
  );
}

export function MobileCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <li
      className={cn(
        "bg-card border rounded-lg p-4 flex items-start justify-between gap-3",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </li>
  );
}

/**
 * Acciones (editar/eliminar) con touch targets de al menos 44px.
 */
export function MobileActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
