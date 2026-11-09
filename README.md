<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png">
  <img src="docs/images/logo-light.png" alt="ovoo" width="112">
</picture>

# ovoo

[![CI](https://github.com/ingvarch/ovoo/actions/workflows/test.yml/badge.svg)](https://github.com/ingvarch/ovoo/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/release/ingvarch/ovoo)](https://github.com/ingvarch/ovoo/releases/latest)
[![license](https://img.shields.io/github/license/ingvarch/ovoo)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](tsconfig.json)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-f38020?logo=cloudflare&logoColor=white)](wrangler.toml)
[![Docker](https://img.shields.io/badge/Docker-2496ed?logo=docker&logoColor=white)](Dockerfile)

</div>

ovoo is a web UI for HashiCorp Nomad, for people who run a Nomad cluster and
want to see and change it from a browser, on a desktop or a phone. It shows
the cluster's health and lets you manage jobs, allocations, nodes, storage and
access, with logs and a terminal in the page. It runs on Cloudflare Workers or
in Docker, and the Nomad ACL token stays in an `httpOnly` cookie.
[Igor Churmeev](https://github.com/ingvarch) makes it; it was called Nomad
Compass before.

![ovoo dashboard](docs/images/dashboard.png)

## Features

- A dashboard with cluster health, resource usage, stability alerts and recent
  activity.
- Jobs: create, edit, clone and revert them in a form with a plan diff, promote
  canaries, scale task groups, run periodic jobs and dispatch parameterized
  ones.
- Task logs, a terminal in a running task, and the files of an allocation,
  also a finished or failed one.
- Allocations, nodes, node pools, servers and the topology, with restart,
  signal, drain and eligibility controls.
- ACL policies, roles and tokens, namespaces, Nomad variables and CSI volumes.
- An installable app for phones, with light and dark themes.

## Usage

Point the published Docker image at your Nomad API:

```sh
docker run -p 3000:3000 \
  -e NOMAD_ADDR=http://your-nomad:4646 \
  -e TICKET_SECRET=$(openssl rand -hex 32) \
  ghcr.io/ingvarch/ovoo:latest
```

Open [http://localhost:3000](http://localhost:3000) and paste your ACL token.
Cloudflare Workers and Docker Compose are in
[docs/deployment.md](docs/deployment.md).

## Quick start

You need [Bun](https://bun.sh/) 1.2+ and a Nomad cluster with an ACL token,
see [docs/development.md](docs/development.md). Set `NOMAD_ADDR` to your Nomad
API:

```sh
git clone https://github.com/ingvarch/ovoo.git && cd ovoo
bun install
echo "NOMAD_ADDR=http://localhost:4646" > .dev.vars
echo "TICKET_SECRET=$(openssl rand -hex 32)" >> .dev.vars
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) and paste your ACL token.

## Documentation

- [Usage](docs/usage.md): signing in, dashboard, jobs, periodic and
  parameterized jobs, logs, remote exec, allocations and their files,
  topology, nodes, node pools, storage, servers, activity, namespaces,
  variables, ACL, mobile app, themes.
- [Deployment](docs/deployment.md): settings, secrets, Cloudflare Workers,
  Docker and Compose, release images, running behind a reverse proxy.
- [Development](docs/development.md): prerequisites, local secrets, dev modes,
  checks, project structure, tech stack.
- [Security](docs/security.md): cookies, CSRF, path allowlist, rate limits,
  response headers, signed WebSocket tickets.
- [Traefik guides](docs/traefik/README.md): Traefik as ingress for Nomad jobs,
  Let's Encrypt through the Cloudflare DNS challenge, the ingress options of
  the job form.

## License

MIT, see [LICENSE](LICENSE).

Nomad is a trademark of HashiCorp. ovoo is an independent project and is not
affiliated with or endorsed by HashiCorp.

## Contributing

How to build ovoo, run the checks and send a change is in
[CONTRIBUTING.md](CONTRIBUTING.md). Security problems are reported privately,
see [SECURITY.md](SECURITY.md).

## About the name

An ovoo is a Mongolian cairn: a heap of stones on a hilltop or a mountain
pass. On the open steppe you see one from far away, and it tells you where
you are and which way the road goes.

A cluster is that steppe. This is the landmark you check first.
