"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrencyInfo } from "@/lib/currency";

export function flagEmoji(code: string): string {
  const alpha = code.slice(0, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(alpha)) return "";
  return String.fromCodePoint(...[...alpha].map((c) => 127397 + c.charCodeAt(0)));
}

export default function CurrencySelect({
  value,
  onChange,
  options,
  id,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  options: string[];
  id?: string;
  className?: string;
}) {
  const info = getCurrencyInfo(value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>{flagEmoji(value)}</span>
            <span className="font-medium">{info.code}</span>
            <span className="text-muted-foreground">{info.symbol}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((code) => {
          const c = getCurrencyInfo(code);
          return (
            <SelectItem key={code} value={code}>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>{flagEmoji(code)}</span>
                <span className="font-medium">{c.code}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
