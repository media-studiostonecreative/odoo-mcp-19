import "server-only";

/**
 * Converts a sale.order amount into company currency (CAD for this
 * company). Verified empirically against a real order/invoice pair:
 * a USD order with amount_total=1072.00 and currency_rate=0.7247427163357009
 * matched its posted CAD invoice's amount_total_signed of 1479.15 —
 * i.e. currency_rate converts FROM company currency TO the order's
 * currency, so the inverse recovers the company-currency amount.
 */
export function toCompanyCurrency(amount: number, currencyRate: number | null | undefined): number {
  if (!currencyRate || currencyRate <= 0) return amount;
  return amount / currencyRate;
}
