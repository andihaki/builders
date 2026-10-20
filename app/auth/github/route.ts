import type { NextRequest } from "next/server";
import { startOAuth } from "../../lib/oauth-start";

/**
 * Starts the GitHub sign-in — or, for somebody already signed in, links
 * GitHub to their account. Either way the callback keeps the token that lets
 * the directory's Star button star a repository for them.
 */
export function GET(request: NextRequest) {
  return startOAuth(request, "github");
}
