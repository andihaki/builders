# Maintainer guide

This checklist covers repository settings that cannot be enforced by committed
files. Review it before making the repository public and again whenever the
maintainer team changes.

## Before changing visibility

- Confirm that every code, image, font, name, and piece of seed content may be
  published under the stated terms. The MIT license applies to the repository;
  it does not grant rights to third-party trademarks or content.
- Scan the complete Git history, not only the current tree, for credentials and
  private data. Revoke first and rewrite history second if a real secret is
  found. Assume every previous commit becomes public.
- Review repository collaborators, deploy keys, webhooks, installed GitHub Apps,
  Actions secrets, Netlify access, and Supabase access. Remove anything unused.
- Make sure production data and database dumps are not tracked. Supabase
  `service_role`, Netlify, email-provider, and database credentials must stay in
  their respective secret stores.
- Set the GitHub description, `https://builders.swegrowth.id` website, social preview,
  and topics such as `nextjs`, `supabase`, `typescript`, `netlify`, and
  `open-source`.

## Access and permissions

The repository currently belongs to a personal GitHub account. Personal
repositories have only two practical levels: owner and collaborator, and a
collaborator can push. Do not grant collaborator access merely so someone can
contribute; public contributors can fork the repository and open pull requests.

- Keep the owner account protected with a passkey or two-factor authentication
  and recovery codes.
- Grant collaborator access only to trusted maintainers who need write access.
- Review access quarterly and remove stale collaborators, deploy keys, apps, and
  tokens.
- If multiple maintainers need different responsibilities, transfer the project
  to a GitHub organization. Use `Read` for observers, `Triage` for issue
  maintainers, `Write` for regular code maintainers, `Maintain` sparingly, and
  reserve `Admin` for as few people as possible. Set the organization's base
  permission to `None` or `Read` and grant access through teams.

## Protect `main`

Create an active branch ruleset for the default branch `main`:

- require a pull request before merging;
- require the `Lint, build, and test` status check from `.github/workflows/ci.yml`;
- require all review conversations to be resolved;
- block force pushes and branch deletion; and
- do not give collaborators blanket bypass permission.

For a solo maintainer, start with zero required approvals: GitHub does not allow
an author to approve their own pull request. Once there is a second active
maintainer, require one approval, dismiss stale approvals after new commits, and
require Code Owner review. Keep an owner-only emergency bypass, and use it only
when the reason is documented in the pull request.

Prefer squash merging and automatically delete merged head branches. Auto-merge
is safe to enable once required checks are active. Choose one history policy and
disable merge methods the project will not use.

## GitHub Actions

Under **Settings → Actions → General**:

- keep the default `GITHUB_TOKEN` permission read-only;
- leave “Allow GitHub Actions to create and approve pull requests” disabled;
- require approval for workflows from all external contributors;
- allow only actions needed by the committed workflows; and
- use GitHub-hosted runners for untrusted pull requests, never a machine on the
  production network.

The CI workflow declares `contents: read` explicitly and does not consume
secrets. Keep it that way for the `pull_request` event. Never check out or run
untrusted pull-request code in a privileged `pull_request_target` workflow.

## Security features

Under **Settings → Advanced Security** (names can vary by GitHub plan):

- enable the dependency graph, Dependabot alerts, and Dependabot security
  updates;
- keep `.github/dependabot.yml` enabled for weekly version updates;
- enable private vulnerability reporting and subscribe to security-alert
  notifications;
- enable secret scanning and push protection (available free for public
  repositories); and
- enable CodeQL default setup for JavaScript/TypeScript if it is available on
  the repository's plan.

Triage alerts rather than dismissing them without a recorded reason. Security
reports should follow `SECURITY.md` and fixes should be coordinated through a
private repository security advisory.

## Community and maintenance

- Enable Issues and Discussions. Use Issues for actionable work and Discussions
  for support, ideas, and open-ended questions. Disable the wiki unless somebody
  will maintain it.
- Add labels such as `bug`, `enhancement`, `documentation`, `security`,
  `good first issue`, `help wanted`, and `dependencies`.
- Pin an issue or discussion that describes the current roadmap and project
  status.
- Apply releases and tags from reviewed commits on `main`, and publish release
  notes when users need to know about migrations or breaking changes.
- Revisit `CONTRIBUTING.md`, supported versions in `SECURITY.md`, the license,
  and this checklist as the project grows.

## References

- [GitHub: permissions for a personal-account repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)
- [GitHub: repository roles for an organization](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
- [GitHub: available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub: Actions settings and permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [GitHub: private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- [GitHub: securing a repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)
