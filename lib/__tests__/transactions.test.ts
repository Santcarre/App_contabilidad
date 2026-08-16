import { describe, expect, it } from "vitest";
import { sortTransactionsDesc } from "@/lib/transactions";

function tx(partial: { id?: string; date?: string; createdAt?: string } = {}) {
  return {
    id: partial.id ?? "t",
    date: partial.date ?? "2026-08-15",
    createdAt: partial.createdAt ?? "",
  };
}

describe("sortTransactionsDesc", () => {
  it("ordena por fecha desc", () => {
    const sorted = sortTransactionsDesc([
      tx({ id: "vieja", date: "2026-08-01" }),
      tx({ id: "nueva", date: "2026-08-15" }),
      tx({ id: "media", date: "2026-08-10" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["nueva", "media", "vieja"]);
  });

  it("con la misma fecha desempata por createdAt desc", () => {
    const sorted = sortTransactionsDesc([
      tx({ id: "primera", date: "2026-08-15", createdAt: "2026-08-15T21:39:18.660Z" }),
      tx({ id: "ultima", date: "2026-08-15", createdAt: "2026-08-15T23:07:41.927Z" }),
      tx({ id: "media", date: "2026-08-15", createdAt: "2026-08-15T22:58:36.747Z" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["ultima", "media", "primera"]);
  });

  it("no muta el array original", () => {
    const original = [
      tx({ id: "a", date: "2026-08-10" }),
      tx({ id: "b", date: "2026-08-15" }),
    ];
    const sorted = sortTransactionsDesc(original);
    expect(original.map((t) => t.id)).toEqual(["a", "b"]);
    expect(sorted.map((t) => t.id)).toEqual(["b", "a"]);
  });
});