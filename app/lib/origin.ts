import { headers } from "next/headers";
import { normalizeOrigin, originFromHeaders } from "./urls";

/**
 * Absolute origin for a round trip that leaves the app and comes back — the
 * OAuth callback, the address in a confirmation email, the password reset link.
 *
 * **The request's own origin wins, and that is the whole point.** Every one of
 * these journeys leaves a cookie behind on the origin it started from and needs
 * to find it again on the way back. Sign-in on `builders.swegrowth.id` writes the
 * PKCE code verifier there; if the callback is sent to a second name for the
 * same site, `exchangeCodeForSession` looks for that verifier on an origin that
 * never had it, and the login dies with nothing to show for itself. A site with
 * more than one name — a custom domain and the deploy URL behind it — cannot
 * have one of them pinned into every link.
 *
 * The one exception is where a sign-in *starts*. `/auth/google` moves somebody
 * to `pinnedOrigin()` before it writes the verifier — nothing is written yet at
 * that point, so choosing the host there is free, and it makes every later step
 * agree. Everything after it, this function included, follows the browser.
 *
 * `NEXT_PUBLIC_SITE_URL` stays as the fallback for when there is no request to
 * ask. Canonical and Open Graph URLs do not come through here; those are
 * `siteUrl` in `app/content.ts`, which should stay pinned.
 *
 * The forwarded host comes from outside, but it cannot send anybody anywhere
 * new: Supabase refuses a `redirectTo` that is not on its allow list, so that
 * list is the guard, not this header. Every origin people actually use has to
 * be on it — see the README.
 *
 * Note that this is the host the *browser* asked for, which is not the same as
 * `request.url` or `request.nextUrl.origin`: those are the address the server
 * was invoked with, and behind Netlify that can be the deploy's own
 * `<deploy-id>--<site>.netlify.app` permalink even when nobody typed it.
 */
export async function siteOrigin(): Promise<string> {
  const asked = originFromHeaders(await headers());
  if (asked) return asked;

  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000";
}
