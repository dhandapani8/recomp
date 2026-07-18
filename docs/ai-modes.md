# AI modes and cost model

Recomp should remain useful without a paid AI request. The core product is
deterministic nutrition math, a curated food library, straightforward training
plans, reminders, and trend calculations.

## What runs free

The web app can run a Food-101 classifier locally with Transformers.js. The
model download is cached by the browser and meal photos stay on the device. This
is useful for suggesting a dish label, but it cannot see hidden oil, know an
exact portion, or calculate trustworthy macros from pixels alone. The user must
confirm ingredients and quantity.

Native clients can follow the same boundary:

- Apple platforms: use Core ML, Vision, and optional Foundation Models features
  when the device supports them.
- Android: use ML Kit, MediaPipe, or a bundled TensorFlow Lite model.
- Desktop/self-hosted: optionally connect a local model such as Ollama.

Food composition should come from a structured database such as Open Food Facts
or USDA FoodData Central, not from a language model's memory.

## Why a consumer subscription cannot power the Recomp UI

A ChatGPT or Claude consumer subscription is not an API allowance. Recomp cannot
log in as the user, scrape a chat session, proxy subscription credentials, or
silently send photos through that subscription. Those approaches are brittle,
unsafe, and outside the supported product boundary.

There are three honest AI modes:

1. **On-device**: free to the project, private, and available directly in Recomp.
2. **Bring your own API key**: convenient in Recomp, but the user pays the API
   provider. Keys must be stored in native secure storage or on the user's own
   server, never in shared browser storage.
3. **Subscription-powered MCP app**: the user connects Recomp to ChatGPT,
   Claude, or another MCP host. The host analyzes the photo under its own plan
   and calls narrowly scoped Recomp tools.

The third option is the closest match to "use my existing subscription", but
the interaction happens inside the assistant. A good MCP App can render an
interactive Recomp confirmation card in the conversation, so the user does not
need to jump between two products just to approve a meal.

## Recommended product architecture

Keep the main Recomp experience free and app-native:

1. Camera suggests a dish locally.
2. User confirms ingredients and portions in one compact meal composer.
3. Recomp performs deterministic macro math and updates the daily budget.
4. Difficult meals can optionally be shared to a connected assistant or a
   local model for a better estimate.

Add a provider-neutral `MealAnalysisAdapter` boundary with implementations for
browser-local, Apple on-device, Android on-device, local-model, and user-owned
API providers. The tracker should consume one normalized result rather than
knowing which provider produced it.

For subscription-powered assistants, expose a remote MCP server only after
server-side user data exists. Use OAuth with PKCE and per-user consent, not a
shared bearer key. Suggested tools:

- `get_today_summary` - read current meals, macro budget, and training
- `propose_meal` - stage a photo-derived meal without saving it
- `confirm_meal` - save a staged meal after explicit user approval
- `log_activity` - save a sport or movement entry
- `get_training_plan` - read goals, recent sessions, and available routines

Every write should be schema-validated, idempotent, scoped to one user, recorded
in an audit log, and either confirmed by the user or visibly undoable. Images
should use short-lived signed upload URLs and be deleted according to a clear
retention policy.

## Current limitation

The repository's existing MCP adapter is deliberately read-only and returns a
seeded server snapshot. Browser-local `recomp-v2` data is not yet synchronized
to it. Multi-user accounts, a database, OAuth for remote MCP, and confirmed
write tools are the next backend milestone; they should not be simulated with a
shared API key.
