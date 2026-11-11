import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "./admin-session";

/**
 * Called inside every admin page render and Server Action, not only in the proxy.
 * Without a valid session it sends the visitor to the sign-in page.
 */
export async function requireAdmin() {
  if (!verifySession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
}
