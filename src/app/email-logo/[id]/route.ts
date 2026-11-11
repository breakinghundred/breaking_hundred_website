import { db } from "@/lib/db";

/**
 * Public logo images for emails. Removed logos are still served, so emails
 * already in people's inboxes keep showing them.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const logo = /^[a-z0-9]{10,40}$/i.test(id)
    ? await db().emailLogo.findUnique({ where: { id }, select: { data: true, contentType: true } })
    : null;
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
