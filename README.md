# Recomp

Recomp is a self-hosted, AI-assisted body recomposition tracker. It combines
meal and macro tracking, weight trends, workouts, coaching insights, a React
Native mobile client, and a private agent interface.

Recomp is currently designed as a single-admin personal tool. It is not a
multi-user hosted service and does not send health data to an AI provider by
default.

## Projects

- `src/` - Next.js web app and authenticated API
- `mobile/` - Expo / React Native mobile app
- `mcp/` - local, read-only MCP adapter for trusted agents

## Local setup

```sh
./setup.sh
npm run dev
```

Copy `.env.example` to `.env.local`. For Google sign-in, configure
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`, then register
`https://your-domain.example/api/auth/callback/google` as an authorized redirect
URI in Google Cloud. Any Google account with a verified email can sign in.

`RECOMP_PASSWORD` and `RECOMP_SESSION_SECRET` enable the optional password
fallback. Keep `RECOMP_API_KEY` independent; it protects agent API access.
Generate secrets with `openssl rand -hex 32`.
Never commit `.env.local`.

The web app defaults to `http://localhost:3000`. Mobile and agent setup are
documented in [`mobile/README.md`](mobile/README.md) and
[`docs/agent-api.md`](docs/agent-api.md).

## Security model

- The web UI uses a signed, HttpOnly admin session.
- The API uses a separate bearer key and is read-only.
- The MCP adapter runs locally over stdio and does not expose an MCP port.
- Agent writes remain disabled until persistent storage, confirmations, and an
  audit log are implemented.

For an internet deployment, use HTTPS and an identity-aware access layer in
front of the app. Treat nutrition, body measurements, and workout history as
sensitive personal data.

## License

MIT. See [`LICENSE`](LICENSE).
