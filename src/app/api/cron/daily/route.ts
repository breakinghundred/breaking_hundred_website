import { env } from "@/lib/env";
import { runDailyJobs } from "@/lib/jobs";

export const maxDuration = 300;

/** Vercel Cron (vercel.json) calls this once a day with Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  const result = await runDailyJobs();
  return Response.json(result);
}
