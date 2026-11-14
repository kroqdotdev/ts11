import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { isLocale, routing } from "@/i18n/routing";
import { OG_IMAGE_SIZE } from "@/i18n/metadata";
import { APP_DOMAIN } from "@/lib/brand";
import { CardMark, jerseyFont, OG } from "@/lib/og/brand";

/*
 * The picture shown when a link to the site is shared (WhatsApp, Facebook, X, Slack…), one per
 * language: /og/en.png and /og/da.png. A plain route rather than `opengraph-image.tsx`, because
 * the file convention only reaches the page it sits beside and gives English a /en/ URL that
 * redirects.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ image: `${locale}.png` }));
}

export async function GET(_req: Request, { params }: RouteContext<"/og/[image]">) {
  const { image } = await params;
  const locale = image.replace(/\.png$/, "");
  if (!image.endsWith(".png") || !isLocale(locale)) return new Response(null, { status: 404 });
  const t = await getTranslations({ locale, namespace: "landing" });
  const { width, height } = OG_IMAGE_SIZE;
  const stripes = 12;

  return new ImageResponse(
    <div style={{ display: "flex", width, height, background: OG.grass }}>
      {/* Mown stripes, like the pitch on the landing page. */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height, display: "flex" }}>
        {Array.from({ length: stripes }, (_, i) => (
          <div
            key={i}
            style={{ width: width / stripes, height, background: i % 2 ? OG.mown : OG.grass }}
          />
        ))}
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width,
          height,
          padding: "72px 80px 64px",
          color: OG.chalk,
          fontFamily: "Jersey",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ fontSize: 150, lineHeight: 1 }}>teamsheet</div>
          <CardMark height={150} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, lineHeight: 1 }}>{t("hero.title")}</div>
          <div style={{ fontSize: 38, lineHeight: 1.25, maxWidth: 960, opacity: 0.92 }}>
            {t("footer.tagline")}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "6px 18px 10px",
            background: OG.card,
            color: OG.cardInk,
            border: `3px solid ${OG.cardInk}`,
            boxShadow: `6px 6px 0 ${OG.cardInk}`,
            fontSize: 34,
          }}
        >
          {APP_DOMAIN}
        </div>
      </div>
    </div>,
    { width, height, fonts: [jerseyFont] },
  );
}
