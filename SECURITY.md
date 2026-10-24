# Security Policy

## Supported versions

Builders is currently developed from `main` and has not started a stable
release series. Security fixes are made on `main`; older commits and deployments
are not supported.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public issue, discussion,
pull request, or social post.

Use GitHub's [private vulnerability reporting form](https://github.com/swegrowthid/builders/security/advisories/new).
Include, when possible:

- the affected route, component, policy, or migration;
- steps to reproduce and a minimal proof of concept;
- the likely impact and who can be affected;
- any suggested mitigation; and
- whether you have disclosed the issue anywhere else.

The maintainer aims to acknowledge a complete report within seven days, provide
an initial assessment within fourteen days, and coordinate disclosure after a
fix is available. These are targets rather than guaranteed response times.

If the private form is unavailable, contact [@zikrulihsan](https://github.com/zikrulihsan)
through a private method listed on their profile without sharing exploit details
publicly.

## Security-sensitive areas

The Supabase policies in `supabase/migrations/`, security-definer functions,
authentication callbacks, and server actions are especially sensitive. Never
put a Supabase `service_role` key or other secret in this repository. The
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public and must be constrained
by row-level security.
