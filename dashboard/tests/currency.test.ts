import { describe, it, expect } from "vitest";
import { toCompanyCurrency } from "@/lib/odoo/currency";

describe("toCompanyCurrency", () => {
  it("divides amount by currencyRate to recover company-currency value", () => {
    // Empirically verified pair: a USD order with amount_total=1072.00 and
    // currency_rate=0.7247427163357009 matched its posted CAD invoice's
    // amount_total_signed of 1479.15.
    expect(toCompanyCurrency(1072.0, 0.7247427163357009)).toBeCloseTo(1479.15, 1);
  });

  it("returns the raw amount when currencyRate is null", () => {
    expect(toCompanyCurrency(500, null)).toBe(500);
  });

  it("returns the raw amount when currencyRate is undefined", () => {
    expect(toCompanyCurrency(500, undefined)).toBe(500);
  });

  it("returns the raw amount when currencyRate is 0 or negative", () => {
    expect(toCompanyCurrency(500, 0)).toBe(500);
    expect(toCompanyCurrency(500, -1)).toBe(500);
  });
});
