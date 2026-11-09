## What changes

<!-- What this does for someone using ovoo, and why. -->

## Issues

<!-- Closes #N -->

## Checklist

- [ ] A test describes the new behavior and failed before the change
- [ ] The [checks](https://github.com/ingvarch/ovoo/blob/main/docs/development.md#checks) pass with no warnings
- [ ] `docs/` updated if users or operators see a difference
- [ ] The title is a conventional commit: `feat(ui): ...`, `fix(api): ...`, `fix(exec): ...`

### If the change touches the server (`src/api`, `src/lib`, `src/entry.*`)

- [ ] Works on both targets: Workers (`bun run dev`) and Docker (`bun run dev:bun`)
- [ ] The Nomad token stays in the httpOnly cookie and never reaches a URL, a log line, a response body or browser storage
- [ ] A new Nomad API path is added to `VALID_NOMAD_PATHS` in `src/api/routes/nomad.ts`
- [ ] A new state-changing route is behind `csrfMiddleware`

### If the change touches the UI

- [ ] Checked in the light and the dark theme
- [ ] Screenshots are attached

### If the change adds configuration

- [ ] The variable is in the table in `docs/deployment.md`, `.dev.vars.example` and `docker-compose.yml`
- [ ] A secret is set with `wrangler secret put` in the Workers deploy steps
