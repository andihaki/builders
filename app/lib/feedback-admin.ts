import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Supabase } from "./supabase";

let feedbackAdmin: Supabase | null = null;

/** A server-only client for the RPC that rejects direct public feedback writes. */
export function getFeedbackAdminSupabase(): Supabase | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  feedbackAdmin ??= createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return feedbackAdmin;
}
