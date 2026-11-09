# Security

How ovoo keeps the Nomad token and the requests to Nomad safe. What each page
does is in [Usage](usage.md).

## Authentication

- You paste the Nomad ACL token into the login form once. The server checks
  it against Nomad and stores it in an `httpOnly` cookie. After that,
  JavaScript cannot read it.
- The cookie is `SameSite=Strict` and lives 7 days.
- The cookie is marked `Secure` when the request is HTTPS, or when a proxy in
  front sends `X-Forwarded-Proto: https`.

## Requests to Nomad

- **CSRF**: state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) to
  `/api/nomad/*` and the exec ticket request must send the `X-CSRF-Token`
  header that matches the `csrf-token` cookie.
- **Path allowlist**: the proxy forwards only known Nomad API paths
  (`VALID_NOMAD_PATHS` in `src/api/routes/nomad.ts`) and rejects path
  traversal, so it cannot be used to reach other hosts or endpoints.
- **Rate limits**: login allows 10 attempts per 15 minutes, logout 10 per
  minute, the Nomad API 100 requests per minute, per client IP and path. The
  counters live in memory, so on Workers each isolate counts on its own. The
  client IP comes from `CF-Connecting-IP`, `X-Real-IP` or `X-Forwarded-For`:
  run the Docker image behind a proxy that sets them.

## Response headers

Every response carries a Content Security Policy (`frame-ancestors 'none'`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: same-origin` and a restrictive `Permissions-Policy`. Over
HTTPS it also sends HSTS for two years with `preload`.

## Remote exec

A shell in the browser needs a WebSocket, and a browser cannot set headers on
one. Instead of putting the token in the URL, remote exec uses signed tickets:

1. The browser asks for a ticket with `POST /api/auth/ws-ticket` and the CSRF
   header.
2. The server signs a ticket with HMAC-SHA256. It is valid for 30 seconds and
   nothing is stored on the server.
3. The browser opens the WebSocket with only the ticket in the URL.
4. The server checks the signature, the expiry and the session cookie, then
   connects to Nomad with the token in the `X-Nomad-Token` header, on both
   targets.

A ticket can be reused within its 30 seconds, but only together with the
session cookie. The token itself never appears in a URL.

```
Browser                          Server                         Nomad
   │                                │                              │
   │─── POST /api/auth/ws-ticket ──>│                              │
   │    (+ CSRF header)             │                              │
   │<── { ticket: "signed..." } ────│                              │
   │                                │                              │
   │─── WebSocket + ticket ────────>│                              │
   │                                │── validate ticket            │
   │                                │── get token from cookie      │
   │                                │── connect with X-Nomad-Token>│
   │<═══════════ relay ════════════>│<═════════════════════════════│
```

## Reporting a vulnerability

See [SECURITY.md](../SECURITY.md).
