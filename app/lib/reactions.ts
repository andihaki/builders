/**
 * The emoji somebody can leave on a pull request on /activity.
 *
 * A fixed set, on purpose: nothing to moderate, and the row stays the same
 * width whoever reacts. Keep the keys in step with `activity_reactions_emoji`
 * in supabase/migrations/20261025000000_activity_reactions.sql.
 */
export const REACTIONS = [
  { key: "tada", emoji: "🎉", label: "Hore", labelEn: "Celebrate" },
  { key: "clap", emoji: "👏", label: "Keren", labelEn: "Applause" },
  { key: "fire", emoji: "🔥", label: "Mantap", labelEn: "Fire" },
  { key: "heart", emoji: "❤️", label: "Suka", labelEn: "Love" },
  { key: "rocket", emoji: "🚀", label: "Gas", labelEn: "Ship it" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];

export function isReactionKey(value: string): value is ReactionKey {
  return REACTIONS.some((reaction) => reaction.key === value);
}

/**
 * What can be reacted to: a pull request's URL, a member's commit summary, or
 * a day of a product on the builders feed, keyed by its first event. Keep in
 * step with `activity_reactions_url` in
 * supabase/migrations/20261101000000_product_feed_reactions.sql.
 */
const SUMMARY_KEY = /^commits:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EVENT_KEY = /^event:[0-9]{1,18}$/;

export function isReactionTarget(value: string): boolean {
  return (value.startsWith("https://github.com/") && value.length <= 500) || SUMMARY_KEY.test(value) || EVENT_KEY.test(value);
}

/** The reaction key for a product's day on the builders feed. */
export function eventReactionKey(eventId: number): string {
  return `event:${eventId}`;
}

export function reactionEmoji(key: string): string {
  return REACTIONS.find((reaction) => reaction.key === key)?.emoji ?? "";
}

/** One emoji on one pull request: how many, who, and whether the viewer is among them. */
export type ReactionCount = { key: ReactionKey; count: number; names: string[]; mine: boolean };

export type ReactionRow = { pull_request_url: string; user_id: string; emoji: string; name: string };

/**
 * Every pull request's reactions, in the fixed order above, leaving out the
 * emoji nobody has used. `viewerId` marks the viewer's own, so the bar can
 * show them pressed.
 */
export function summarizeReactions(rows: ReactionRow[], viewerId: string | null): Record<string, ReactionCount[]> {
  const byUrl = new Map<string, Map<ReactionKey, ReactionCount>>();
  for (const row of rows) {
    if (!isReactionKey(row.emoji)) continue;
    let counts = byUrl.get(row.pull_request_url);
    if (!counts) byUrl.set(row.pull_request_url, (counts = new Map()));
    const count = counts.get(row.emoji) ?? { key: row.emoji, count: 0, names: [], mine: false };
    count.count += 1;
    if (row.name) count.names.push(row.name);
    if (viewerId && row.user_id === viewerId) count.mine = true;
    counts.set(row.emoji, count);
  }

  const result: Record<string, ReactionCount[]> = {};
  for (const [url, counts] of byUrl) {
    result[url] = REACTIONS.flatMap(({ key }) => (counts.has(key) ? [counts.get(key)!] : []));
  }
  return result;
}

/** The bar after the viewer presses one emoji: theirs added, or taken back. */
export function toggleReaction(counts: ReactionCount[], key: ReactionKey, name: string): ReactionCount[] {
  const existing = counts.find((count) => count.key === key);
  if (existing?.mine) {
    const left = existing.count - 1;
    const names = existing.names.filter((each, index) => index !== existing.names.lastIndexOf(name));
    return left > 0
      ? counts.map((count) => (count.key === key ? { ...count, count: left, names, mine: false } : count))
      : counts.filter((count) => count.key !== key);
  }
  const added: ReactionCount = existing
    ? { ...existing, count: existing.count + 1, names: [...existing.names, name], mine: true }
    : { key, count: 1, names: [name], mine: true };
  const next = existing ? counts.map((count) => (count.key === key ? added : count)) : [...counts, added];
  return REACTIONS.flatMap(({ key: each }) => next.filter((count) => count.key === each));
}
