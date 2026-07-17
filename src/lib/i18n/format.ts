import type { Locale } from "@/lib/i18n/config";

export function formatLocaleNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(getLocaleTag(locale)).format(value);
}

export function formatImageDimensions(
  width: number,
  height: number,
  locale: Locale,
) {
  return `${formatLocaleNumber(width, locale)} × ${formatLocaleNumber(height, locale)}`;
}

export function formatFileSize(bytes: number, locale: Locale) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let amount = Math.max(0, bytes);
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return new Intl.NumberFormat(getLocaleTag(locale), {
    maximumFractionDigits: amount < 10 && unitIndex > 0 ? 1 : 0,
    style: "unit",
    unit: units[unitIndex],
    unitDisplay: "short",
  }).format(amount);
}

function getLocaleTag(locale: Locale) {
  return locale === "fa" ? "fa-IR" : "en-US";
}
