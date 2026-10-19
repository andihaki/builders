import assert from "node:assert/strict";
import test from "node:test";

import { getGitHubProjectDraft, parseGitHubRepositoryUrl } from "../app/lib/github.ts";

test("only accepts an ordinary GitHub repository URL", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/ahsan/project.git"), {
    owner: "ahsan",
    repo: "project",
    url: "https://github.com/ahsan/project",
  });
  assert.equal(parseGitHubRepositoryUrl("https://github.com/ahsan/project/issues"), null);
  assert.equal(parseGitHubRepositoryUrl("https://example.com/ahsan/project"), null);
  assert.equal(parseGitHubRepositoryUrl("http://github.com/ahsan/project"), null);
});

test("turns public repository metadata and named README sections into a reviewable draft", async () => {
  const requests = [];
  const request = async (url) => {
    requests.push(url);
    if (url.endsWith("/readme")) {
      const markdown = `# Kelas Terbuka\n\nBelajar bersama agar materi berkualitas mudah dipakai siapa saja.\n\n## Masalah\n\nMateri belajar yang baik sulit ditemukan oleh guru di daerah.\n\n## Solusi\n\nKami membuat perpustakaan materi yang bisa dipakai ulang dan diperbaiki bersama.\n\n## Untuk siapa\n\nGuru dan relawan pendidikan di Indonesia.\n\n## Status\n\nSedang menyiapkan koleksi pertama bersama lima sekolah.`;
      return new Response(JSON.stringify({ content: Buffer.from(markdown).toString("base64"), encoding: "base64" }), { status: 200 });
    }
    return new Response(JSON.stringify({ name: "kelas-terbuka", description: "Belajar bersama", homepage: "https://kelas.example", topics: ["Pendidikan", "Komunitas"] }), { status: 200 });
  };

  const draft = await getGitHubProjectDraft("https://github.com/ahsan/kelas-terbuka", request);

  assert.equal(requests.length, 2);
  assert.equal(draft.title, "Kelas Terbuka");
  assert.equal(draft.tagline, "Belajar bersama agar materi berkualitas mudah dipakai siapa saja.");
  assert.match(draft.problem, /sulit ditemukan/);
  assert.match(draft.solution, /perpustakaan materi/);
  assert.equal(draft.audience, "Guru dan relawan pendidikan di Indonesia.");
  assert.match(draft.now, /Sedang menyiapkan/);
  assert.deepEqual(draft.tags, ["pendidikan", "komunitas"]);
  assert.equal(draft.liveUrl, "https://kelas.example");
  assert.equal(draft.readmeFound, true);
});

