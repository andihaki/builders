import { roleLabel } from "./roles";
import { isStage, stageMeta } from "./stages";
import { tx, type Locale } from "./locale";

/**
 * The trail a profile shows: what somebody has actually done, written by the
 * database as it happens rather than typed in afterwards.
 *
 * Keep this list in step with `events_kind_valid` and
 * `profiles_activity_hidden_valid` in supabase/migrations/0005_activity.sql —
 * the same duplication the project already accepts between STAGES and
 * `projects_stage_valid`.
 */
export const EVENT_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_applied",
  "seat_filled",
  "task_created",
  "task_taken",
  "task_done",
  "comment_posted",
  "boost_given",
  "update_posted",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Labels for the checkbox list where somebody chooses what stays public. */
export const eventKindMeta: Record<EventKind, { label: string }> = {
  project_created: { label: "Added a new idea" },
  project_stage_changed: { label: "Changed a project stage" },
  seat_opened: { label: "Opened a role" },
  seat_applied: { label: "Applied for a role" },
  seat_filled: { label: "Joined a project" },
  task_created: { label: "Added a task" },
  task_taken: { label: "Took a task" },
  task_done: { label: "Completed a task" },
  comment_posted: { label: "Joined a discussion" },
  boost_given: { label: "Supported a project" },
  update_posted: { label: "Posted an update" },
};

const EVENT_LABEL_ID: Record<EventKind, string> = {
  project_created: "Menambahkan ide baru",
  project_stage_changed: "Mengubah tahap proyek",
  seat_opened: "Membuka peran",
  seat_applied: "Mendaftar untuk sebuah peran",
  seat_filled: "Bergabung dengan proyek",
  task_created: "Menambahkan tugas",
  task_taken: "Mengambil tugas",
  task_done: "Menyelesaikan tugas",
  comment_posted: "Bergabung dalam diskusi",
  boost_given: "Mendukung proyek",
  update_posted: "Mengirim kabar terbaru",
};

export function eventKindLabel(kind: EventKind, locale: Locale): string {
  return tx(locale, EVENT_LABEL_ID[kind], eventKindMeta[kind].label);
}

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

/**
 * The kinds a profile leads with.
 *
 * A portfolio is a claim about work, so the default trail shows the entries
 * that carry weight — starting something, moving it, joining, finishing —
 * and keeps the running commentary (comments, boosts, applications, task
 * bookkeeping) behind "tampilkan semua". Nothing is hidden by this: it is a
 * reading order, not a visibility rule, which stays with `activity_hidden`.
 */
export const HIGHLIGHT_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_filled",
  "task_done",
  "update_posted",
] as const satisfies readonly EventKind[];

/**
 * The kinds the site-wide trail leads with.
 *
 * This one answers "is anybody actually working together here?", so it keeps
 * the entries where two people meet — a role opened, somebody joining, a task
 * picked up or finished, a build-log entry — and leaves out the quieter
 * bookkeeping (`task_created`, `seat_applied`, `boost_given`) that reads the
 * same whether or not a collaboration followed.
 */
export const COLLABORATION_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_filled",
  "task_taken",
  "task_done",
  "comment_posted",
  "update_posted",
] as const satisfies readonly EventKind[];

/**
 * The kinds a project's own history keeps.
 *
 * The project page already shows its tasks, its discussion and its support as
 * live state, right above the trail — replaying them underneath said the same
 * thing twice, and pushed the entries only the trail can carry off the bottom
 * of the section. What is left is how the project got here: it started, it
 * moved level, it asked for help, somebody joined.
 *
 * `seat_applied` is deliberately out. Who applied, and was still waiting, is
 * between them and the people running the project — the pending list above
 * already shows it to exactly those people, and this trail is public.
 */
export const PROJECT_MEMORY_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_filled",
] as const satisfies readonly EventKind[];

/*
 * `update_posted` is not in the list above on purpose: the project page renders
 * the update itself, with its own words, in the same journey. Repeating it as
 * "X mengabari perkembangan Y" would say the same thing twice, one line apart.
 */

export type ActivityLike = {
  kind: string;
  projectTitle: string;
  payload: Record<string, string>;
};

/**
 * A trail entry split around the project title, so the page can make the title
 * a link without this module knowing anything about markup.
 */
export function activityParts(event: ActivityLike, locale: Locale = "en"): { lead: string; trail: string } {
  const { payload } = event;
  const role = payload.role ? roleLabel(payload.role, "", locale) : "";
  const task = payload.task_title ?? "";
  const stage = payload.to && isStage(payload.to)
    ? tx(locale, stageMeta[payload.to].labelId, stageMeta[payload.to].label)
    : payload.to;

  switch (event.kind) {
    case "project_created":
      return { lead: tx(locale, "menambahkan ", "added "), trail: "." };
    case "project_stage_changed":
      return { lead: tx(locale, "memindahkan ", "moved "), trail: tx(locale, ` ke tahap ${stage}.`, ` to ${stage}.`) };
    case "seat_opened":
      return { lead: tx(locale, `membuka peran ${role} di `, `opened the ${role} role on `), trail: "." };
    case "seat_applied":
      return { lead: tx(locale, `mendaftar sebagai ${role} di `, `applied as ${role} on `), trail: "." };
    case "seat_filled":
      return { lead: tx(locale, "mulai mengerjakan ", "started working on "), trail: tx(locale, ` sebagai ${role}.`, ` as ${role}.`) };
    case "task_created":
      return { lead: tx(locale, `menambahkan tugas “${task}” ke `, `added the task “${task}” to `), trail: "." };
    case "task_taken":
      return { lead: tx(locale, `mengambil tugas “${task}” di `, `took the task “${task}” on `), trail: "." };
    case "task_done":
      return { lead: tx(locale, `menyelesaikan tugas “${task}” di `, `completed the task “${task}” on `), trail: "." };
    case "comment_posted":
      return { lead: tx(locale, "bergabung dalam diskusi di ", "joined the discussion on "), trail: "." };
    case "boost_given":
      return { lead: tx(locale, "mendukung ", "supported "), trail: "." };
    case "update_posted":
      return { lead: tx(locale, "mengirim kabar terbaru di ", "posted an update on "), trail: payload.update_title ? `: “${payload.update_title}”.` : "." };
    default:
      // A kind this build has not heard of still reads as something, the same
      // way roleLabel falls back rather than throwing.
      return { lead: tx(locale, "berkontribusi pada ", "contributed to "), trail: "." };
  }
}

export function activitySentence(event: ActivityLike, locale: Locale = "en"): string {
  const { lead, trail } = activityParts(event, locale);
  return `${lead}${event.projectTitle}${trail}`;
}

/**
 * The checkbox form submits what should stay visible; the column stores what
 * should not. Anything this build does not know about is left alone, so an
 * older page cannot quietly un-hide a kind it never rendered.
 */
export function hiddenFrom(shown: string[], current: string[] = []): string[] {
  const unknown = current.filter((kind) => !isEventKind(kind));
  const hidden = EVENT_KINDS.filter((kind) => !shown.includes(kind));
  return [...new Set([...hidden, ...unknown])];
}
