import { db } from "@/lib/db";
import { currentStaff } from "@/lib/staff";

/** Lets an admin open a file attached to an email, to check it. Never public. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin") return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const file = /^[a-z0-9]{10,40}$/i.test(id)
    ? await db().emailAttachment.findUnique({ where: { id }, select: { data: true, contentType: true, filename: true } })
    : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
