import { cookies } from "next/headers";

/**
 * The visitor's own GitHub token, kept so the directory's Star button can star
 * a repository as them.
 *
 * Supabase hands the provider's token over once, at the OAuth callback, and
 * never stores it; this cookie is where it lives afterwards. httpOnly, so no
 * script on the page can read it, and only ever sent to this site. What it
 * can do is whatever the GitHub App behind the sign-in was granted — set that
 * app to Starring (read and write) and Email addresses (read) and nothing
 * else, so a leaked cookie can star repositories and no more.
 */
const TOKEN_COOKIE = "gh-token";

/**
 * Readable by the page, and holding nothing secret: it only tells the Star
 * buttons that asking which repositories are starred is worth a request.
 */
export const GITHUB_HINT_COOKIE = "gh-connected";

const MAX_AGE = 60 * 60 * 24 * 60;

export async function rememberGitHubToken(token: string): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(TOKEN_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: MAX_AGE });
  store.set(GITHUB_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function gitHubToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value || null;
}

/** For a token GitHub no longer accepts, and for signing out. */
export async function forgetGitHubToken(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(GITHUB_HINT_COOKIE);
}
