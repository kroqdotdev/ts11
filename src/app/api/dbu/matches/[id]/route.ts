import { getMatch } from "@/server/dbu/client";
import { dbuProblem, limitDbu, matchRefSchema } from "@/server/dbu/route";
import { json, problem } from "@/server/http";

/**
 * One match on DBU (`{match}_{pool}`): the score, goals and substitutions from the
 * live-score timeline, and both team sheets (holdkort) when DBU shows them.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/dbu/matches/[id]">) {
  const limited = limitDbu(request, "match");
  if (limited) return limited;
  const ref = matchRefSchema.safeParse((await ctx.params).id);
  if (!ref.success) return problem(400, "bad-match", "That isn't a DBU match.");
  try {
    return json(await getMatch(ref.data.matchId, ref.data.poolId));
  } catch (e) {
    return dbuProblem(e);
  }
}
