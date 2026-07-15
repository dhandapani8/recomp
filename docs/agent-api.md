# Recomp agent API

Recomp's agent API is private and read-only. It exists so a trusted agent can
inspect a health snapshot and help with a question; it does not let an agent
write meals, weights, targets, or training data.

## Browser access

Google OAuth can protect the web UI using `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`. Any Google account with a verified
email can sign in. To keep password access as a fallback, set both
`RECOMP_PASSWORD` and `RECOMP_SESSION_SECRET` to different random values. The
password is checked only during sign-in; its signed, HttpOnly, `SameSite=Lax`
session cookie expires after 12 hours. Recomp never accepts a password in a URL.

## Setup

1. Create a dedicated API key:

   ```sh
   openssl rand -hex 32
   ```

2. Put it in `.env.local` as `RECOMP_API_KEY`. Do not reuse
   `RECOMP_PASSWORD`, commit the value, place it in a URL, or give it to a
   browser-based extension.

3. Restart Recomp.

## Call the API

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $RECOMP_API_KEY" \
  http://localhost:3101/api/v1/snapshot
```

The response has `Cache-Control: no-store`, no CORS allowance, a constant-time
bearer-token comparison, and a local 60-request-per-minute limit per key. The
endpoint intentionally emits `dataStatus: "seeded"` until Recomp moves its
browser-local state to a server-side database.

## MCP adapter

The repository includes a local stdio MCP server with one read-only tool:
`recomp_snapshot`. It holds the API key and forwards only to the API above.
The MCP server should stay on your machine; do not expose an unauthenticated
MCP HTTP endpoint.

For Codex, add this to `~/.codex/config.toml` and restart Codex:

```toml
[mcp_servers.recomp]
command = "node"
args = ["/Users/dhandapanimurugan/Projects/recomp/mcp/server.mjs"]

[mcp_servers.recomp.env]
RECOMP_API_KEY = "your-dedicated-api-key"
RECOMP_API_URL = "http://127.0.0.1:3101"
```

For another MCP client, configure the same command and environment variables.
Once persistent storage is in place, add narrowly scoped write tools with
confirmation and an audit log, rather than granting a general write tool.

## Deployment boundary

For personal use, prefer `localhost` or a private mesh such as Tailscale. If
you deploy publicly, put the app behind an identity-aware proxy, use HTTPS,
store the key in the host's encrypted secrets, rotate it after any suspected
leak, and enforce rate limiting at the proxy/database layer. The in-process
limiter is a convenience for a single running instance, not a distributed
security control.
