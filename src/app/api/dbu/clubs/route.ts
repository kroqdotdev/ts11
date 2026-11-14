import { z } from "zod";
import { searchClubs } from "@/server/dbu/client";
import { dbuProblem, limitDbu } from "@/server/dbu/route";
import { json, problem } from "@/server/http";

const querySchema = z.string().trim().min(2).max(60);

/** Clubs on DBU whose name matches `q`. */
export async function GET(request: Request) {
  const limited = limitDbu(request, "search");
  if (limited) return limited;
  const q = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!q.success) return problem(400, "bad-query", "Type at least two letters of the club's name.");
  try {
    return json({ clubs: await searchClubs(q.data) });
  } catch (e) {
    return dbuProblem(e);
  }
}
