/**
 * Turns `app/lib/seed.ts` into `supabase/seed.sql`.
 *
 *   npm run db:seed
 *
 * The generated file is a single DO block keyed on an email address: it finds
 * the account that should own the projects and inserts them under that person.
 * That keeps the repository free of fake auth users and of anybody's password —
 * you sign up through the site first, then run the file once.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { seedProjects } from "../app/lib/seed.ts";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed.sql");

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const array = (values) => `array[${values.map(quote).join(", ")}]::text[]`;

const body = seedProjects
  .map((project) => {
    const seats = project.seats
      .map(
        (seat) => `
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, ${quote(seat.role)}, ${quote(seat.brief)},
           ${quote(seat.commitment)}, ${quote(seat.access)}
    where new_project is not null;`,
      )
      .join("");

    // `seed-zikrul` is the placeholder for whoever runs this file, so a task
    // assigned to them resolves to the same account that owns the projects.
    const tasks = project.tasks
      .map(
        (task) => `
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, ${quote(task.title)}, ${quote(task.detail)}, ${quote(task.status)},
           ${task.assigneeId ? "owner" : "null"}, owner
    where new_project is not null;`,
      )
      .join("");

    // The journey entries are the project's own words, so they carry their own
    // dates rather than all landing on the day the file was run.
    const updates = project.updates
      .map(
        (update) => `
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, ${quote(update.title)}, ${quote(update.body)}, ${quote(update.createdAt)}
    where new_project is not null;`,
      )
      .join("");

    return `
  -- ${project.title}
  insert into public.projects
    (slug, title, tagline, owner_id, stage, project_type, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, logo_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    (${quote(project.slug)}, ${quote(project.title)}, ${quote(project.tagline)}, owner,
     ${quote(project.stage)}, ${quote(project.projectType)}, ${quote(project.problem)}, ${quote(project.solution)},
     ${quote(project.audience)}, ${quote(project.now)},
     ${project.nowUpdatedAt ? quote(project.nowUpdatedAt) : "null"},
     ${quote(project.docUrl)}, ${quote(project.liveUrl)}, ${quote(project.logoUrl)},
     ${quote(project.repoUrl)}, ${array(project.tags)}, ${quote(project.glyph)},
     ${quote(project.createdAt)}, ${quote(project.nowUpdatedAt || project.createdAt)})
  on conflict (slug) do nothing
  returning id into new_project;
${seats}${tasks}${updates}`;
  })
  .join("\n");

const sql = `-- Seed data for Builders.
--
-- Generated from app/lib/seed.ts — run \`npm run db:seed\` after editing that
-- file rather than editing this one.
--
-- Before running: sign up through the site with the email below, so the account
-- exists. Then run this whole file once, in the Supabase SQL editor or with
-- psql. Re-running it is safe; projects that already exist are left alone.

do $$
declare
  -- Who should own these projects. Change this to your own address.
  owner_email text := 'replace-with-your-email@example.com';
  owner       uuid;
  new_project bigint;
begin
  select id into owner from auth.users where lower(email) = lower(owner_email);

  if owner is null then
    raise exception
      'No account exists for email %. Sign up through the site first, then run this file.',
      owner_email;
  end if;
${body}
end
$$;
`;

await writeFile(OUT, sql, "utf8");
console.log(`wrote ${OUT} (${seedProjects.length} projects)`);
