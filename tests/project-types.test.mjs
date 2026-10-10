import assert from "node:assert/strict";
import test from "node:test";

import {
  PROJECT_TYPES,
  isProjectType,
  projectTypeContribution,
  projectTypeLabel,
  projectTypeMeta,
  projectTypeTone,
} from "../app/lib/project-types.ts";
import { seedProjects } from "../app/lib/seed.ts";

test("every type in the catalogue carries copy for all three places it shows", () => {
  for (const type of PROJECT_TYPES) {
    const meta = projectTypeMeta[type];
    assert.ok(meta, `${type} tidak punya meta`);
    assert.ok(meta.label, `${type} tidak punya label`);
    assert.ok(meta.blurb, `${type} tidak punya blurb`);
    assert.ok(meta.contribution, `${type} tidak menjelaskan artinya bagi yang ikut`);
    assert.ok(meta.tone, `${type} tidak punya kelas warna`);
  }
});

test("only catalogue values are types; empty is not one of them", () => {
  for (const type of PROJECT_TYPES) assert.equal(isProjectType(type), true, type);
  for (const stray of ["", "PET", "startup", "idea", "live", "komunitas"]) {
    assert.equal(isProjectType(stray), false, `${stray} tidak boleh lolos`);
  }
});

/*
 * A project that never said which kind it is has to read as silence
 * everywhere, not as a fifth type. Every helper answering with an empty string
 * is what lets the badge, the tone class, and the project page's note all
 * disappear together rather than each needing its own guard.
 */
test("a project that has not said its type renders nothing anywhere", () => {
  for (const helper of [projectTypeLabel, projectTypeTone, projectTypeContribution]) {
    assert.equal(helper(""), "");
    assert.equal(helper("bukan-jenis"), "");
  }
});

test("a known type answers with its own copy", () => {
  assert.equal(projectTypeLabel("pet", "id"), projectTypeMeta.pet.label);
  assert.equal(projectTypeLabel("pet"), "Pet project");
  assert.equal(projectTypeTone("commercial"), projectTypeMeta.commercial.tone);
  assert.equal(projectTypeContribution("community", "id"), projectTypeMeta.community.contribution);
});

/*
 * The seed is what the site serves with no database attached, and what
 * `supabase/seed.sql` is generated from. A stray value there would sail past
 * the app and be refused by projects_type_valid at the insert.
 */
test("every seeded project claims a type the catalogue knows", () => {
  for (const project of seedProjects) {
    assert.equal(isProjectType(project.projectType), true, `${project.slug}: ${project.projectType}`);
  }
});

test("the seed shows off every type, so the filter is never empty in the demo", () => {
  const seeded = new Set(seedProjects.map((project) => project.projectType));
  for (const type of PROJECT_TYPES) {
    assert.ok(seeded.has(type), `tidak ada project seed berjenis ${type}`);
  }
});

/*
 * The type is not a restatement of the level. If the two ever line up
 * one-to-one the filter has stopped earning its place, so the seed is expected
 * to carry at least one type that shows up at more than one level.
 */
test("type and stage stay independent of one another", () => {
  const stagesByType = new Map();
  for (const project of seedProjects) {
    const stages = stagesByType.get(project.projectType) ?? new Set();
    stages.add(project.stage);
    stagesByType.set(project.projectType, stages);
  }

  const spread = [...stagesByType.values()].some((stages) => stages.size > 1);
  assert.ok(spread, "tiap jenis cuma muncul di satu level — jenisnya cuma level dengan nama lain");
});
