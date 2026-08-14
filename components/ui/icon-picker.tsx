"use client";

import {
  Banknote,
  Book,
  Briefcase,
  Building,
  Building2,
  Bus,
  Car,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  Film,
  Gamepad2,
  HardDrive,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  Music,
  Phone,
  PiggyBank,
  Pizza,
  Plane,
  ShoppingBag,
  Vault,
  Smartphone,
  TrendingUp,
  University,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_COLORS, getColorValue } from "@/lib/color-map";
import { cn } from "@/lib/utils";

export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  "gamepad-2": Gamepad2,
  "credit-card": CreditCard,
  "heart-pulse": HeartPulse,
  "more-horizontal": MoreHorizontal,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  laptop: Laptop,
  "shopping-bag": ShoppingBag,
  car: Car,
  home: Home,
  phone: Phone,
  music: Music,
  film: Film,
  book: Book,
  coffee: Coffee,
  pizza: Pizza,
  dumbbell: Dumbbell,
  plane: Plane,
  wallet: Wallet,
  smartphone: Smartphone,
  "building-2": Building2,
  banknote: Banknote,
  coins: Coins,
  "piggy-bank": PiggyBank,
  safe: Vault,
  landmark: Landmark,
  university: University,
  building: Building,
  "hard-drive": HardDrive,
};

export const CATEGORY_ICONS = [
  "utensils", "bus", "gamepad-2", "credit-card", "heart-pulse", "more-horizontal",
  "briefcase", "trending-up", "laptop", "shopping-bag", "car", "home",
  "phone", "music", "film", "book", "coffee", "pizza", "dumbbell", "plane",
];

export const SOURCE_ICONS = [
  "wallet", "smartphone", "building-2", "credit-card", "banknote", "coins",
  "piggy-bank", "safe", "landmark", "university", "building", "hard-drive",
];

export function CategoryIcon({
  name,
  color,
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  const IconComponent = ICON_MAP[name] ?? MoreHorizontal;
  return (
    <IconComponent
      className={cn("h-5 w-5", className)}
      style={color ? { color: getColorValue(color) } : undefined}
    />
  );
}

export function IconPicker({
  value,
  onChange,
  icons,
}: {
  value: string;
  onChange: (icon: string) => void;
  icons: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
      {icons.map((iconName) => {
        const IconComponent = ICON_MAP[iconName] ?? MoreHorizontal;
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={cn(
              "p-2 rounded",
              value === iconName ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <IconComponent className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
}: {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-8 h-8 rounded",
            value === color && "ring-2 ring-offset-2 ring-primary"
          )}
          style={{ backgroundColor: getColorValue(color) }}
        />
      ))}
    </div>
  );
}
