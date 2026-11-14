import { getImport } from "@/server/dbu/client";
import { clubIdSchema, dbuProblem, limitDbu, teamsSchema } from "@/server/dbu/route";
import { json, problem } from "@/server/http";

/**
 * Fixtures and results for the chosen teams of a club (`?teams=team_pool,…`), with
 * the club's crest and colours and every opponent's crest and colours.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/dbu/clubs/[id]/fixtures">) {
  const limited = limitDbu(request, "fixtures");
  if (limited) return limited;
  const id = clubIdSchema.safeParse((await ctx.params).id);
  const teams = teamsSchema.safeParse(new URL(request.url).searchParams.get("teams") ?? "");
  if (!id.success) return problem(400, "bad-club", "That isn't a DBU club.");
  if (!teams.success) return problem(400, "bad-teams", "Pick between one and ten teams.");
  try {
    const result = await getImport(id.data, teams.data);
    if ("unknown" in result) {
      return problem(
        404,
        "unknown-team",
        "DBU doesn't list that team for this club any more. Pick the teams again.",
        { teams: result.unknown },
      );
    }
    return json(result);
  } catch (e) {
    return dbuProblem(e);
  }
}
