import "server-only";

/**
 * Server configuration, read once from the environment. Optional services fall
 * back to local stand-ins in development: mail goes to an outbox folder and
 * images to a folder on disk, so the whole account flow runs without AWS or S3.
 */
function read(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

const isProd = process.env.NODE_ENV === "production";

function required(name: string, devFallback: string): string {
  const v = read(name);
  if (v) return v;
  if (isProd && !process.env.TS11_BUILD) {
    throw new Error(`${name} must be set in production`);
  }
  return devFallback;
}

if (isProd && !process.env.TS11_BUILD) {
  // Production should send real mail; without SES, verification links only land in
  // the outbox folder on the server. Say so loudly instead of failing quietly.
  if (!read("SES_ACCESS_KEY_ID")) {
    console.warn("[teamsheet11] SES is not configured: emails are written to DEV_DATA_DIR/outbox");
  }
}

export const env = {
  isProd,
  /** Public origin, e.g. https://teamsheet11.com. */
  baseURL: required("BETTER_AUTH_URL", "http://localhost:3000"),
  secret: required("BETTER_AUTH_SECRET", "dev-only-secret-change-me-dev-only-secret"),
  databasePath: read("DATABASE_PATH") ?? "./data/teamsheet11.db",
  /** Where dev mail and dev images go when SES or S3 isn't configured. */
  devDir: read("DEV_DATA_DIR") ?? "./data/dev",

  google:
    read("GOOGLE_CLIENT_ID") && read("GOOGLE_CLIENT_SECRET")
      ? { clientId: read("GOOGLE_CLIENT_ID")!, clientSecret: read("GOOGLE_CLIENT_SECRET")! }
      : null,

  ses:
    read("SES_ACCESS_KEY_ID") && read("SES_SECRET_ACCESS_KEY")
      ? {
          accessKeyId: read("SES_ACCESS_KEY_ID")!,
          secretAccessKey: read("SES_SECRET_ACCESS_KEY")!,
          region: read("AWS_REGION") ?? "eu-central-1",
          configurationSet: read("SES_CONFIGURATION_SET"),
        }
      : null,
  mailFrom: read("MAIL_FROM") ?? "teamsheet11 <noreply@teamsheet11.com>",

  s3:
    read("S3_ENDPOINT") && read("S3_BUCKET") && read("S3_ACCESS_KEY_ID")
      ? {
          endpoint: read("S3_ENDPOINT")!.replace(/\/$/, ""),
          region: read("S3_REGION") ?? "fsn1",
          bucket: read("S3_BUCKET")!,
          accessKeyId: read("S3_ACCESS_KEY_ID")!,
          secretAccessKey: read("S3_SECRET_ACCESS_KEY") ?? "",
          /** Key prefix, so tests can share a bucket without touching real data. */
          prefix: read("S3_PREFIX") ?? "",
        }
      : null,

  limits: {
    /** One image, after the browser has resized it. */
    imageBytes: Number(read("LIMIT_IMAGE_BYTES") ?? 2 * 1024 * 1024),
    imageSide: Number(read("LIMIT_IMAGE_SIDE") ?? 2560),
    /** All images for one account. */
    accountBytes: Number(read("LIMIT_ACCOUNT_BYTES") ?? 250 * 1024 * 1024),
    /** One club as saved JSON (images are links, so this is generous). */
    clubBytes: Number(read("LIMIT_CLUB_BYTES") ?? 256 * 1024),
    clubsPerAccount: Number(read("LIMIT_CLUBS") ?? 50),
    uploadsPerHour: Number(read("LIMIT_UPLOADS_PER_HOUR") ?? 60),
  },
  /** Rate limits can be loosened for the automated test run only. */
  relaxedRateLimits: read("TS11_RELAXED_RATE_LIMITS") === "1" && !isProd,
};
