import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

const LOCALES = ["en", "hi", "kn", "ml"] as const;
type AppLocale = (typeof LOCALES)[number];

function isLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const safeLocale: AppLocale = locale && isLocale(locale) ? locale : "en";

  const messages = (await import(`../messages/${safeLocale}.json`))
    .default as AbstractIntlMessages;

  return { locale: safeLocale, messages };
});