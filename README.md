# Recomp

Recomp is a self-hosted body recomposition tracker with optional AI assistance.
It combines photo-assisted meal capture, common and custom foods, daily macro
budgets, meal reminders, simple gym routines, sports, weight trends, coaching
insights, a React Native mobile client, and a private agent interface.

The current web build stores its working data in the user's browser. It does not
upload meal photos or health data to an AI provider by default.

## Projects

- `src/` - Next.js web app and authenticated API
- `mobile/` - Expo / React Native mobile app
- `mcp/` - local, read-only MCP adapter for trusted agents
- `docs/ai-modes.md` - cost, privacy, and subscription-powered AI architecture

## Current web features

- Browser-local Food-101 photo classification with explicit user confirmation
- Common foods, custom ingredients, portions, macros, and daily meal totals
- Scheduled meal gaps and optional browser notifications
- Four concise gym routines with purpose, exercise cues, weight, and reps
- Running, walking, cycling, badminton, football, swimming, tennis, hiking,
  and mobility logs
- Editable recomposition targets and weight entries
- Day, week, month, and year progress metrics with contextual suggestions
- An interactive 3D muscle model driven by completed working sets

Photo classification identifies a likely dish; it cannot reliably infer hidden
ingredients or portion size. Recomp always asks the user to confirm the food and
amount before logging it.

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

For a temporary public test deployment, set `RECOMP_PUBLIC_ACCESS=true`. This
bypasses browser sign-in only; the agent API still requires `RECOMP_API_KEY`.

The web app defaults to `http://localhost:3000`. Mobile, agent, and AI setup are
documented in [`mobile/README.md`](mobile/README.md),
[`docs/agent-api.md`](docs/agent-api.md), and
[`docs/ai-modes.md`](docs/ai-modes.md).

## Security model

- The web UI uses a signed, HttpOnly admin session.
- The API uses a separate bearer key and is read-only.
- The MCP adapter runs locally over stdio and does not expose an MCP port.
- Browser-local meal photos are resized before storage and never sent to the
  Recomp server.
- Agent writes remain disabled until persistent storage, confirmations, and an
  audit log are implemented.

For an internet deployment, use HTTPS and an identity-aware access layer in
front of the app. Treat nutrition, body measurements, and workout history as
sensitive personal data.

## License

MIT. See [`LICENSE`](LICENSE).

The optimized anatomical model in `public/models/muscular.glb` is licensed
separately under CC BY-SA 4.0. See
[`public/models/README.md`](public/models/README.md) for attribution.
