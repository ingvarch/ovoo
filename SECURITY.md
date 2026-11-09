# Security Policy

## Supported versions

Only the latest release is supported. Check that the problem is still there in it before you
report. A fix reaches users in the next release: a new Docker image, and a new tag to deploy on
Cloudflare Workers.

## Report a vulnerability

Report it privately through
[GitHub private vulnerability reporting](https://github.com/ingvarch/ovoo/security/advisories/new).
Only the maintainer can see the report. Do not open a public issue, pull request or discussion about
it.

Include:

- what an attacker can do and what they need for it;
- the steps that show the problem: for example, the request you sent with `curl`, or the page and
  the actions you took;
- the route, page or component involved, and whether ovoo ran in Docker or on Workers.

The maintainer replies in the advisory, agrees on a fix and a disclosure date with you, and credits
you in the advisory unless you ask not to be named. The advisory is published with the release
that fixes it.

How ovoo protects the token and the requests to Nomad is in [docs/security.md](docs/security.md).
