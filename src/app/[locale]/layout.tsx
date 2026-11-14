import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LazySync } from "@/components/sync/LazySync";
import { AppToaster } from "@/components/ui/AppToaster";
import { routing } from "@/i18n/routing";
import { alternates, sharing } from "@/i18n/metadata";
import { APP_NAME, APP_URL } from "@/lib/brand";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("home.title", { app: APP_NAME });
  const description = t("home.description");
  return {
    metadataBase: new URL(APP_URL),
    applicationName: APP_NAME,
    title: { default: title, template: `%s | ${APP_NAME}` },
    description,
    alternates: alternates("/", locale),
    ...sharing("/", locale, title, description, title),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e8eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f151c" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {children}
          <AppToaster />
          <LazySync />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
