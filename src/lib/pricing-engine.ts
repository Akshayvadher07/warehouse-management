import { differenceInDays, startOfDay } from 'date-fns';

export function calculateInvoiceTotal(
  startDate: string | Date,
  endDate: string | Date,
  spaceRequested: number,
  ratePerSqFt: number
) {
  // 1. Normalize Dates and Calculate Duration (Minimum 1 day billed)
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  const durationDays = Math.max(1, differenceInDays(end, start));

  // 2. Base Subtotal ($Area * Rate * Days)
  const subtotal = spaceRequested * ratePerSqFt * durationDays;

  // 3. Tax Calculation (18% GST/VAT multiplier)
  const TAX_MULT = 0.18;
  const taxAmount = subtotal * TAX_MULT;

  // 4. Final Totals (Strict rounding to 2 decimal places for currency safety)
  const roundCurrency = (num: number) => Math.round(num * 100) / 100;

  return {
    durationDays,
    rateApplied: ratePerSqFt,
    subtotal: roundCurrency(subtotal),
    taxAmount: roundCurrency(taxAmount),
    totalAmount: roundCurrency(subtotal + taxAmount),
  };
}
