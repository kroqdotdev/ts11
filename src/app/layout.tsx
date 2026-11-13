import type { Metadata, Viewport } from "next";
import { LazySync } from "@/components/sync/LazySync";
import { AppToaster } from "@/components/ui/AppToaster";
import { fontVariables } from "@/lib/fonts";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME}: free match day graphics for your club`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Make starting XI, team news, matchday and full-time graphics for your club in minutes. Free, no sign-up needed, no watermark.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e8eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f151c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <AppToaster />
        <LazySync />
      </body>
    </html>
  );
}
