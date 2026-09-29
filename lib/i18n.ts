export const locales = ["en", "es", "zh"] as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es" || value === "zh";
}

export function localizeHref(lang: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${lang}`;
  return `/${lang}${normalized}`;
}

export function swapLocale(pathname: string, lang: Locale) {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = lang;
    return parts.join("/") || `/${lang}`;
  }
  return localizeHref(lang, pathname);
}
