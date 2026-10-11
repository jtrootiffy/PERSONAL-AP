import { CURRENCIES } from "./constants";

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "";
  const found = CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found?.symbol ?? code.toUpperCase() + " ";
}

export function currencyLabel(code: string | null | undefined): string {
  if (!code) return "PHP";
  const found = CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found ? `${found.code} — ${found.label}` : code.toUpperCase();
}

/**
 * Format an amount in the given currency. Defaults to PHP, the initial
 * default currency for this app. Falls back gracefully for unknown codes.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  code = "PHP",
  opts: { compact?: boolean } = {},
): string {
  const n = Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const cur = (code || "PHP").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    }).format(safe);
  } catch {
    return `${currencySymbol(cur)}${safe.toFixed(2)}`;
  }
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US").format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${Math.round(Number.isFinite(n) ? n : 0)}%`;
}
