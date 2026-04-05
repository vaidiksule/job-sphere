export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number | null, currency = "USD") {
  if (amount == null) return "Not listed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(min: number | null, max: number | null, currency = "USD") {
  if (min == null && max == null) return "Compensation discussed later";
  if (min != null && max != null) return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
  if (min != null) return `${formatCurrency(min, currency)}+`;
  return `Up to ${formatCurrency(max, currency)}`;
}
