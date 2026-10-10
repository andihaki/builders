import assert from "node:assert/strict";
import test from "node:test";

import { MAXIMUM, MINIMUM, projectBlurb, slugify, validateBrief } from "../app/lib/brief.ts";

function brief(overrides = {}) {
  return {
    title: "A valid project",
    tagline: "",
    highlight: "",
    problem: "",
    solution: "",
    audience: "",
    tags: "",
    docUrl: "",
    repoUrl: "",
    liveUrl: "",
    logoUrl: "",
    ...overrides,
  };
}

test("a project needs nothing but a name", () => {
  assert.deepEqual(validateBrief(brief()), {});
});

test("a project without a name is refused", () => {
  assert.match(validateBrief(brief({ title: "" })).title, /Enter the project name/);
  assert.match(validateBrief(brief({ title: "ab" })).title, /too short/);
  assert.equal(validateBrief(brief({ title: "x".repeat(MINIMUM.title) })).title, undefined);
});

test("written fields are held to the ceiling the database enforces", () => {
  for (const field of ["title", "tagline", "highlight", "problem", "solution", "audience"]) {
    const value = "x".repeat(MAXIMUM[field] + 1);
    assert.match(validateBrief(brief({ [field]: value }))[field], /too long/);
    assert.equal(validateBrief(brief({ [field]: value.slice(0, MAXIMUM[field]) }))[field], undefined);
  }
});

test("links are checked only when one was given", () => {
  for (const field of ["docUrl", "repoUrl", "liveUrl", "logoUrl"]) {
    assert.equal(validateBrief(brief({ [field]: "" }))[field], undefined);
    assert.match(validateBrief(brief({ [field]: "builders.swegrowth.id" }))[field], /http/);
    assert.equal(validateBrief(brief({ [field]: "https://builders.swegrowth.id" }))[field], undefined);
  }
});

test("topics stay optional, up to six", () => {
  assert.equal(validateBrief(brief({ tags: "" })).tags, undefined);
  assert.equal(validateBrief(brief({ tags: "a, b, c, d, e, f" })).tags, undefined);
  assert.match(validateBrief(brief({ tags: "a, b, c, d, e, f, g" })).tags, /no more than six/);
});

test("a card falls back through the summary, the highlight, then the domain", () => {
  const project = {
    tagline: "A clear summary",
    highlight: "Because it is genuinely useful",
    liveUrl: "https://www.builders.swegrowth.id/x",
    repoUrl: "",
  };
  assert.equal(projectBlurb(project), "A clear summary");
  assert.equal(projectBlurb({ ...project, tagline: "" }), "Because it is genuinely useful");
  assert.equal(projectBlurb({ ...project, tagline: "", highlight: "" }), "builders.swegrowth.id");
  assert.equal(
    projectBlurb({ tagline: "", highlight: "", liveUrl: "", repoUrl: "https://github.com/a/b" }),
    "github.com",
  );
});

test("a long highlight is clipped to a card-sized line", () => {
  const blurb = projectBlurb({
    tagline: "",
    highlight: "x".repeat(MAXIMUM.highlight),
    liveUrl: "",
    repoUrl: "",
  });
  assert.equal(blurb.length, 140);
  assert.ok(blurb.endsWith("…"));
});

test("project slugs always fit the database format", () => {
  assert.equal(slugify("A!"), "project");
  assert.equal(slugify("Project Pendidikan & Kesehatan"), "project-pendidikan-kesehatan");
  assert.equal(slugify("x".repeat(60)).length, 48);
});
