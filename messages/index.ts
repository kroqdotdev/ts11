/**
 * All interface text, one JSON file per area and language. English is the reference:
 * Danish must have exactly the same keys (checked by the type below and by
 * tests/unit/messages.test.ts). Text printed on the graphics is not here; it follows
 * the club's graphics language, see src/lib/graphicText.ts.
 */
import daAccount from "./da/account.json";
import daCommon from "./da/common.json";
import daEmails from "./da/emails.json";
import daLanding from "./da/landing.json";
import daMeta from "./da/meta.json";
import daPrivacy from "./da/privacy.json";
import daSetup from "./da/setup.json";
import daStudio from "./da/studio.json";
import daSync from "./da/sync.json";
import daUi from "./da/ui.json";
import enAccount from "./en/account.json";
import enCommon from "./en/common.json";
import enEmails from "./en/emails.json";
import enLanding from "./en/landing.json";
import enMeta from "./en/meta.json";
import enPrivacy from "./en/privacy.json";
import enSetup from "./en/setup.json";
import enStudio from "./en/studio.json";
import enSync from "./en/sync.json";
import enUi from "./en/ui.json";

const en = {
  common: enCommon,
  meta: enMeta,
  landing: enLanding,
  privacy: enPrivacy,
  account: enAccount,
  sync: enSync,
  emails: enEmails,
  setup: enSetup,
  studio: enStudio,
  ui: enUi,
};

/** Same shape as English, key for key. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

const da: Shape<typeof en> = {
  common: daCommon,
  meta: daMeta,
  landing: daLanding,
  privacy: daPrivacy,
  account: daAccount,
  sync: daSync,
  emails: daEmails,
  setup: daSetup,
  studio: daStudio,
  ui: daUi,
};

export type Messages = typeof en;
export const messages = { en, da } as const;
