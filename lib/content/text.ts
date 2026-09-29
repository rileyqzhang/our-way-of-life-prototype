import type { Locale } from "@/lib/i18n";
import type { LocalizedText } from "@/lib/timeline/types";

export function pick(value: LocalizedText | undefined, lang: Locale) {
  if (!value) return "";
  return value[lang] || value.en || value.es || value.zh || "";
}
