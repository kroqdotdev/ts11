import { getClub } from "@/server/dbu/client";
import { clubIdSchema, dbuProblem, limitDbu } from "@/server/dbu/route";
import { json, problem } from "@/server/http";

/** One DBU club: its name, colours and the teams it has in competitions now. */
export async function GET(request: Request, ctx: RouteContext<"/api/dbu/clubs/[id]">) {
  const limited = limitDbu(request, "club");
  if (limited) return limited;
  const id = clubIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return problem(400, "bad-club", "That isn't a DBU club.");
  try {
    return json(await getClub(id.data));
  } catch (e) {
    return dbuProblem(e);
  }
}
