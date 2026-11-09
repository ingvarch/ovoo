# AGENTS.md

ovoo is a web UI for HashiCorp Nomad: a React SPA (`src/client`) and a Hono API (`src/api`) that
proxies the Nomad API and relays remote exec over a WebSocket. The same code runs on Cloudflare
Workers (`src/entry.cloudflare.ts`) and in Docker on Bun (`src/entry.bun.ts`), and every server
change works on both. The test comes first, and the Nomad ACL token stays in its `httpOnly` cookie.

- [CONTRIBUTING.md](CONTRIBUTING.md): read before writing code or committing. It has the test-first
  rule, the two targets, the token rule, commit and PR title format.
- [.github/pull_request_template.md](.github/pull_request_template.md): read before adding a Nomad
  API path, a state-changing route or a setting, and before opening a PR. It has the checklist:
  `VALID_NOMAD_PATHS`, `csrfMiddleware`, the three places a setting goes, light and dark theme.
- [docs/development.md](docs/development.md): read before running ovoo locally. It has
  prerequisites, `.dev.vars`, the two dev modes, the checks, the project structure.
- [docs/deployment.md](docs/deployment.md): read before changing a setting, `wrangler.toml`, the
  `Dockerfile` or the release workflows. It has the settings table, secrets, Workers and Docker
  deploys, reverse proxy needs.
- [docs/security.md](docs/security.md): read before changing auth, cookies, CSRF, the Nomad proxy,
  rate limits, response headers or remote exec. It has how each of them works.
- [docs/usage.md](docs/usage.md): read before changing what a page does. It has every page, its
  actions, the Nomad capabilities they need and Nomad's limits.
- [docs/traefik/](docs/traefik/README.md): read before changing the ingress options of the job
  form. It has the Traefik setup those Traefik tags expect.

## Commands

CI (`.github/workflows/test.yml`) runs these, in this order:

```sh
bun install --frozen-lockfile
bun run lint && bun run typecheck && bun test && bun run build:all
```

The Bun dev mode needs its settings in the environment and does not start without `TICKET_SECRET`:

```sh
NOMAD_ADDR=http://localhost:4646 TICKET_SECRET=$(openssl rand -hex 32) bun run dev:bun
```

## Rules

- The UI is English only. Write new strings in English inline, like the existing components; do
  not add an i18n dictionary, a translate hook or a language switch.
- A change a user can see updates `docs/usage.md` in the same commit, and the README feature list
  when it adds a feature of its own.
