"use client";

import { DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";

export { parseMoneyInput } from "@/components/ui/money-input";

export function MoneyField({
  id,
  label,
  value,
  onChange,
  placeholder = "0,00",
  required,
  hint,
  warning,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: React.ReactNode;
  warning?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <MoneyInput
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={id}
          className="pl-9"
          required={required}
        />
      </div>
      {warning && <p className="text-xs text-amber-600 pl-9">{warning}</p>}
      {hint && <p className="text-xs text-muted-foreground pl-9">{hint}</p>}
    </div>
  );
}
