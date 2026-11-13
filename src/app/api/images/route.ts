import { countClubs, imagesInUse } from "@/server/clubs";
import { env } from "@/server/env";
import { json, problem, readBody, requireUser } from "@/server/http";
import { listImages, saveImage, usedBytes } from "@/server/images";
import { allow } from "@/server/rate-limit";

/** The account's images and how much of the storage allowance they use. */
export async function GET(request: Request) {
  const auth = await requireUser(request, { verified: true });
  if ("response" in auth) return auth.response;
  const id = auth.user.id;
  const inUse = imagesInUse(id);
  return json({
    // `inUse`: linked from a club or the design saved in the account.
    images: listImages(id).map((i) => ({ ...i, inUse: inUse.has(i.id) })),
    used: usedBytes(id),
    limit: env.limits.accountBytes,
    imageLimit: env.limits.imageBytes,
    clubs: countClubs(id),
    clubLimit: env.limits.clubsPerAccount,
  });
}

/** Uploads one image. The body is the raw image file. */
export async function POST(request: Request) {
  const auth = await requireUser(request, { verified: true });
  if ("response" in auth) return auth.response;
  const id = auth.user.id;

  if (!allow(`upload:${id}`, env.limits.uploadsPerHour, 60 * 60 * 1000)) {
    return problem(
      429,
      "rate-limited",
      "That's a lot of uploads in an hour. Try again a little later.",
    );
  }
  const body = await readBody(request, env.limits.imageBytes);
  if (!body) {
    return problem(
      413,
      "too-large",
      `Images can be up to ${Math.round(env.limits.imageBytes / 1024 / 1024)} MB.`,
    );
  }
  if (body.byteLength === 0) return problem(400, "empty", "That upload was empty.");

  const saved = await saveImage(id, body);
  if (!saved.ok) {
    const status =
      saved.error.code === "quota" ? 413 : saved.error.code === "not-an-image" ? 415 : 413;
    return problem(
      status,
      saved.error.code,
      saved.error.message,
      "used" in saved.error ? saved.error : undefined,
    );
  }
  return json(
    { ...saved.image, reused: saved.reused, used: usedBytes(id), limit: env.limits.accountBytes },
    201,
  );
}
