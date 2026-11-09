# Development

How to run ovoo on your machine, check a change and find your way around the
code. Running it for other people is in [Deployment](deployment.md).

## Prerequisites

- [Bun](https://bun.sh/) 1.2+. `bun install` also brings Wrangler.
- A Nomad cluster with ACLs and a token to sign in with.
- `openssl` to generate the ticket secret.

## Local secrets

The server needs `NOMAD_ADDR` and `TICKET_SECRET`; the settings table is in
[Deployment](deployment.md#configuration). `TICKET_SECRET` is required in
development too: without it the Bun server does not start and remote exec
fails on Wrangler.

For `bun run dev`, Wrangler reads them from `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# set NOMAD_ADDR to your Nomad API, and TICKET_SECRET to the output of:
openssl rand -hex 32
```

For `bun run dev:bun`, pass them in the environment, as shown below.

## Run

Two modes match the two deployment targets. Both serve the app at
[http://localhost:5173](http://localhost:5173), where you paste your ACL
token.

Cloudflare Workers mode runs Vite and Wrangler, which emulates Workers
locally:

```bash
bun run dev
```

Bun mode runs Vite and the Bun server, the one the Docker image uses:

```bash
NOMAD_ADDR=http://localhost:4646 TICKET_SECRET=$(openssl rand -hex 32) bun run dev:bun
```

The Vite dev proxy sends API calls to port 3000 in Bun mode, so keep `PORT`
at its default there.

One part at a time:

```bash
bun run dev:vite     # Vite only, no backend
bun run dev:worker   # Wrangler only
bun run dev:api      # Bun API only
```

## Checks

CI runs these four on every pull request and on every push to `main`. Run
them before you commit:

```bash
bun run lint         # ESLint
bun run typecheck    # tsc --noEmit
bun test             # tests
bun run build:all    # frontend and Bun server
```

`bun run build` builds only the frontend, `bun run build:bun` only the Bun
server.

## Project structure

```
src/
├── api/                 # Hono API layer
│   ├── app.ts           # App factory
│   ├── routes/          # Auth routes and the Nomad API proxy
│   ├── handlers/        # Remote exec WebSocket relay
│   ├── middleware/      # Auth, CSRF, rate limits, security headers
│   └── utils/           # Cookies, crypto, responses
├── client/              # React SPA
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities and API client
│   ├── context/         # React contexts
│   └── types/           # Nomad API types
├── lib/                 # Bun server setup
├── shared/              # Types shared by API and client
├── test/                # Test preload (happy-dom) and helpers
├── entry.cloudflare.ts  # Cloudflare Workers entry
├── entry.bun.ts         # Bun production entry
└── entry.bun.dev.ts     # Bun dev entry (API only)
```

## Tech stack

- **Runtime**: [Bun](https://bun.sh/), also the package manager and the
  server bundler.
- **API**: [Hono](https://hono.dev/).
- **Frontend**: React 19, React Router 7 and Tailwind CSS v4, built with Vite.
- **Deploy**: Cloudflare Workers, or Docker with Bun.
