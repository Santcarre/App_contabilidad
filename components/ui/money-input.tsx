"use client";

import { Input } from "@/components/ui/input";
import { formatMoneyDisplay, parseMoneyInput } from "@/lib/currency";

export { formatMoneyDisplay, parseMoneyInput } from "@/lib/currency";

export function MoneyInput({
  value,
  onChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (raw: string) => void;
}) {
  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatMoneyDisplay(value)}
      onChange={(e) => {
        let raw = "";
        let commaSeen = false;
        for (const ch of e.target.value) {
          if (/\d/.test(ch)) raw += ch;
          else if (ch === "," && !commaSeen) {
            raw += ",";
            commaSeen = true;
          }
        }
        onChange(raw);
      }}
    />
  );
}
