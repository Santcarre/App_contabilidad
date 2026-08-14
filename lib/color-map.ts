export const COLOR_VALUES: Record<string, string> = {
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "orange-500": "#f97316",
  "amber-500": "#f59e0b",
  "yellow-500": "#eab308",
  "lime-500": "#84cc16",
  "green-500": "#22c55e",
  "emerald-500": "#10b981",
  "teal-500": "#14b8a6",
  "cyan-500": "#06b6d4",
  "sky-500": "#0ea5e9",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "indigo-500": "#6366f1",
  "violet-500": "#8b5cf6",
  "purple-500": "#a855f7",
  "fuchsia-500": "#d946ef",
  "pink-500": "#ec4899",
  "rose-500": "#f43f5e",
  "gray-500": "#6b7280",
};

export const DEFAULT_COLORS = [
  "red-500",
  "orange-500",
  "amber-500",
  "yellow-500",
  "lime-500",
  "green-500",
  "emerald-500",
  "teal-500",
  "cyan-500",
  "sky-500",
  "blue-500",
  "indigo-500",
  "violet-500",
  "purple-500",
  "fuchsia-500",
  "pink-500",
  "rose-500",
];

export function getColorValue(color: string): string {
  const mapped = COLOR_VALUES[color];
  if (mapped) return mapped;
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return "#64748b";
}
