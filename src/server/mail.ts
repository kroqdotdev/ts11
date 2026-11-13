import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";
import { env } from "./env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Kind of mail, used for the dev outbox file name and SES tags. */
  kind: "verify" | "reset" | "delete";
}

let ses: AwsClient | null = null;

/**
 * Sends a transactional email through Amazon SES (API v2). Without SES
 * credentials (development, tests) the mail is written to the dev outbox
 * instead, so the links in it can still be followed.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!env.ses) {
    const dir = join(env.devDir, "outbox");
    await mkdir(dir, { recursive: true });
    const file = join(
      dir,
      `${Date.now()}-${mail.kind}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.json`,
    );
    await writeFile(file, JSON.stringify(mail, null, 2));
    if (!process.env.VITEST) console.info(`[mail] ${mail.kind} for ${mail.to} written to ${file}`);
    return;
  }

  ses ??= new AwsClient({
    accessKeyId: env.ses.accessKeyId,
    secretAccessKey: env.ses.secretAccessKey,
    region: env.ses.region,
    service: "ses",
  });
  const res = await ses.fetch(
    `https://email.${env.ses.region}.amazonaws.com/v2/email/outbound-emails`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        FromEmailAddress: env.mailFrom,
        Destination: { ToAddresses: [mail.to] },
        ConfigurationSetName: env.ses.configurationSet,
        EmailTags: [{ Name: "kind", Value: mail.kind }],
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: mail.text, Charset: "UTF-8" },
              Html: { Data: mail.html, Charset: "UTF-8" },
            },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SES refused the email (${res.status}): ${body.slice(0, 300)}`);
  }
}
