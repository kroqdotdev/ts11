"use client";

import { useStudio } from "@/lib/store";
import type { Design, Team } from "@/lib/types";
import type { SyncProblem } from "./state";

/**
 * An image couldn't be uploaded for a reason the person has to act on. `problem` is
 * what the studio shows, in the page's language; the message stays the server's.
 */
export class UploadBlocked extends Error {
  constructor(
    message: string,
    readonly problem: SyncProblem,
  ) {
    super(message);
  }
}

/** The server's refusal codes, as the reasons the sync chip can explain. */
function problemOf(err: { code?: string; max?: number }): SyncProblem | null {
  switch (err.code) {
    case "quota":
      return { reason: "quota" };
    case "too-large":
      return { reason: "imageTooLarge", max: err.max };
    case "too-big-dimensions":
      return { reason: "imageTooBig", max: err.max };
    case "not-an-image":
      return { reason: "notAnImage" };
  }
  return null;
}

const INLINE = /^data:image\//;

function inlineUrls(teams: Team[], design: Design): string[] {
  const found = new Set<string>();
  const add = (v: string | null | undefined) => {
    if (v && INLINE.test(v)) found.add(v);
  };
  for (const t of teams) {
    add(t.crest);
    add(t.match.opponentCrest);
    for (const f of t.fixtures) add(f.opponentCrest);
  }
  add(design.background.image);
  add(design.featureImage);
  add(design.sponsorImage);
  return [...found];
}

function replaceEverywhere(from: string, to: string) {
  const s = useStudio.getState();
  const swap = (v: string | null) => (v === from ? to : v);
  useStudio.setState({
    teams: s.teams.map((t) =>
      t.crest === from ||
      t.match.opponentCrest === from ||
      t.fixtures.some((f) => f.opponentCrest === from)
        ? {
            ...t,
            crest: swap(t.crest),
            match: { ...t.match, opponentCrest: swap(t.match.opponentCrest) },
            fixtures: t.fixtures.map((f) =>
              f.opponentCrest === from ? { ...f, opponentCrest: to } : f,
            ),
          }
        : t,
    ),
    design: {
      ...s.design,
      background: { ...s.design.background, image: swap(s.design.background.image) },
      featureImage: swap(s.design.featureImage),
      sponsorImage: swap(s.design.sponsorImage),
    },
  });
}

async function toBlob(dataUrl: string): Promise<Blob> {
  return await (await fetch(dataUrl)).blob();
}

/** Uploads one image to the account and returns its link. */
export async function uploadImage(
  file: Blob,
): Promise<{ url: string; used: number; limit: number }> {
  const res = await fetch("/api/images", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  const body = (await res.json().catch(() => ({}))) as {
    url?: string;
    used?: number;
    limit?: number;
    error?: string;
    message?: string;
    max?: number;
  };
  if (!res.ok || !body.url) {
    const err = new Error(body.message ?? `Upload failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
      max?: number;
    };
    err.status = res.status;
    err.code = body.error;
    err.max = body.max;
    throw err;
  }
  return { url: body.url, used: body.used ?? 0, limit: body.limit ?? 0 };
}

/**
 * Moves images that are still stored inline (added before signing in, or just
 * now) into the account's storage, and swaps the inline copy for its link.
 */
export async function uploadInlineImages(): Promise<void> {
  const s = useStudio.getState();
  for (const dataUrl of inlineUrls(s.teams, s.design)) {
    try {
      const { url } = await uploadImage(await toBlob(dataUrl));
      replaceEverywhere(dataUrl, url);
    } catch (e) {
      const err = e as Error & { status?: number; code?: string; max?: number };
      const problem = problemOf(err);
      if (problem) throw new UploadBlocked(err.message, problem);
      throw e;
    }
  }
}
