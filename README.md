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

Set independent values for `RECOMP_PASSWORD`, `RECOMP_SESSION_SECRET`, and
`RECOMP_API_KEY` in `.env.local`. Generate secrets with `openssl rand -hex 32`.
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
