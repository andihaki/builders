import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { REACTIONS, summarizeReactions, toggleReaction } from "../app/lib/reactions.ts";

const pr = "https://github.com/org/tool/pull/7";
const other = "https://github.com/org/tool/pull/8";

test("reactions are counted per pull request, in the fixed order, with the viewer's own marked", () => {
  const summary = summarizeReactions(
    [
      { pull_request_url: pr, user_id: "b", emoji: "fire", name: "Budi" },
      { pull_request_url: pr, user_id: "a", emoji: "tada", name: "Ana" },
      { pull_request_url: pr, user_id: "b", emoji: "tada", name: "Budi" },
      { pull_request_url: other, user_id: "a", emoji: "heart", name: "Ana" },
      { pull_request_url: pr, user_id: "c", emoji: "thumbsdown", name: "Cici" },
    ],
    "b",
  );
  assert.deepEqual(summary[pr], [
    { key: "tada", count: 2, names: ["Ana", "Budi"], mine: true },
    { key: "fire", count: 1, names: ["Budi"], mine: true },
  ]);
  assert.deepEqual(summary[other], [{ key: "heart", count: 1, names: ["Ana"], mine: false }]);
});

test("pressing adds the viewer's reaction, and pressing again takes it back", () => {
  const start = [{ key: "fire", count: 1, names: ["Budi"], mine: false }];
  const added = toggleReaction(start, "tada", "Ana");
  assert.deepEqual(added.map((count) => [count.key, count.count, count.mine]), [["tada", 1, true], ["fire", 1, false]]);

  const joined = toggleReaction(added, "fire", "Ana");
  assert.deepEqual(joined.find((count) => count.key === "fire"), { key: "fire", count: 2, names: ["Budi", "Ana"], mine: true });

  const back = toggleReaction(toggleReaction(joined, "fire", "Ana"), "tada", "Ana");
  assert.deepEqual(back, start);
});

test("the emoji set matches the database's CHECK", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261025000000_activity_reactions.sql", import.meta.url), "utf8");
  const allowed = migration.match(/emoji in \(([^)]+)\)/)[1].match(/'([a-z]+)'/g).map((value) => value.slice(1, -1));
  assert.deepEqual(allowed, REACTIONS.map((reaction) => reaction.key));
});

test("a reaction can be left on a pull request or a commit summary, and nothing else", async () => {
  const { isReactionTarget } = await import("../app/lib/reactions.ts");
  assert.ok(isReactionTarget("https://github.com/org/tool/pull/7"));
  assert.ok(isReactionTarget("commits:00000000-0000-4000-8000-000000000001"));
  assert.ok(!isReactionTarget("commits:not-a-uuid"));
  assert.ok(!isReactionTarget("https://evil.example/pull/1"));
});
