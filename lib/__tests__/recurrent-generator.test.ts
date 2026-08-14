import { describe, expect, it } from "vitest";
import { calcNextGeneration, formatLocalDate } from "@/lib/recurrent-generator";

describe("formatLocalDate", () => {
  it("formatea fecha local en YYYY-MM-DD sin desfase de zona horaria", () => {
    expect(formatLocalDate(new Date(2026, 7, 13))).toBe("2026-08-13");
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("calcNextGeneration", () => {
  it("avanza un mes manteniendo el día", () => {
    expect(calcNextGeneration("2026-08-13", 13)).toBe("2026-09-13");
  });

  it("avanza de diciembre a enero del año siguiente", () => {
    expect(calcNextGeneration("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("respeta el día del mes configurado", () => {
    expect(calcNextGeneration("2026-08-13", 5)).toBe("2026-09-05");
  });
});