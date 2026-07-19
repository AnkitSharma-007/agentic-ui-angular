# Atlas — Agents that build their own UI

[![Live demo](https://img.shields.io/badge/Live%20demo-online-brightgreen.svg)](https://angular-agentic-ui.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with Angular](https://img.shields.io/badge/Built%20with-Angular-dd0031.svg)](https://angular.dev)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini-4285F4.svg)](https://ai.google.dev)

**[Try the live demo](https://angular-agentic-ui.vercel.app/)** — runs entirely in your browser; bring your own Gemini key.

Atlas is an **agentic UI built with Angular** and powered by **Gemini**. Instead of replying with plain text, each tool call renders a live, interactive Angular component while the answer is still streaming in. Two specialist agents pass work back and forth, and you can step in at any point to approve, reject, or choose between options.

Alongside the agent loop, Atlas ships a polished, real-world frontend: a live cost-and-tokens meter, a timeline view of every step, per-turn spending limits, a no-code tool builder, agent-authored tools, image and voice input, a replay library, and an encrypted store for your own API key. You can watch, budget, and replay every token, tool call, and handoff. **It runs entirely in the browser — there's no backend.**

The demo is a travel planner: two agents, **TripPlanner** and **ExperienceCurator**, plan a trip together, ask for your approval before anything important, and hand off to each other as the conversation shifts. Travel is just the example — the same building blocks work for any agent-driven app. Atlas exists to show a real agentic UI running in a production-style frontend, not a notebook or a thin chat wrapper.

---

## Table of contents

- [Feature highlights](#feature-highlights)
- [Architecture](#architecture)
  - [Layer map](#layer-map)
  - [The `AgentEvent` catalog](#the-agentevent-catalog)
  - [The tool contract: manifest + descriptor](#the-tool-contract-manifest--descriptor)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Security model](#security-model)
- [Performance](#performance)
- [Engineering decisions & trade-offs](#engineering-decisions--trade-offs)
- [Known limitations / what's mocked](#known-limitations--whats-mocked)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Feature highlights

### Core ideas

1. **Components as tools.** Each tool ships a [`ToolManifest`](./src/app/core/registry/tool-descriptor.ts) (loaded eagerly) and a [`ToolDescriptor`](./src/app/core/registry/tool-descriptor.ts) (loaded lazily). The descriptor points at an Angular component, and the agent loop renders it with `NgComponentOutlet` while the tool is still running. The same `<app-flight-options-card>` is the loading state, the result, and the error state — only its `status` input changes, not the component itself.
2. **A streaming agent runtime.** [`GeminiService.streamAgentTurn`](./src/app/core/services/gemini.service.ts) wraps the loop in an `Observable`, and [`runAgentTurn`](./src/app/core/services/agent-loop.ts) turns the raw Gemini stream into a clean sequence of typed [`AgentEvent`](./src/app/core/streaming/agent-event.ts)s (`turn_start`, `thought_delta`, `tool_call`, `interrupt_request`, `tool_result`, `round_complete`, …). The UI just subscribes — zoneless, with OnPush and Signals throughout.
3. **Dual-view state.** The [`AgentEventStore`](./src/app/core/streaming/agent-event.store.ts) keeps two views of the same conversation: a list of `AgentEvent`s for the UI, and the raw Gemini `Content[]` history (with `thoughtSignature` data kept intact) for the next request. Both are built from the same turn, so they never drift apart.
4. **Human in the loop.** Tools marked `interruptive: true` pause the loop and wait for your decision through the [`InterruptService`](./src/app/core/registry/interrupt.service.ts). `bookFlight` waits for Approve or Reject; `letUserChoose` lets you pick a row from a comparison table. Your choice is sent back to the model as the tool's result.
5. **Multi-agent handoff.** The [`AgentRegistry`](./src/app/core/agents/agent-registry.service.ts) tracks the active agent and every handoff in a turn. The shared `handoffTo` tool passes control between agents, and the [`<app-agent-graph>`](./src/app/shared/agent-graph/agent-graph.ts) shows it live. A handoff always gives the receiving agent a chance to respond, so it's never the silent last step of a turn.

### Monitoring & cost control

6. **Live observability drawer.** A side panel ([`ObservabilityDrawerComponent`](./src/app/shared/observability-drawer/observability-drawer.ts)) shows every round and tool call as a waterfall on one shared timeline, colour-coded by status, with tokens, latency, cost, and model on each row.
7. **Cost & context meter.** A small pill ([`CostMeterComponent`](./src/app/shared/cost-meter/cost-meter.ts)) shows live spend, token counts, context-window usage, and latency for the current turn. Expand it for a full breakdown by input, output, and thinking tokens, plus lifetime totals.
8. **Per-turn budget limits.** [`BudgetService`](./src/app/core/observability/budget.service.ts) lets you cap tokens, rounds, and dollars per turn (with quick presets). The loop checks the budget before and after each round and stops the turn with a `BUDGET_EXCEEDED:<kind>` reason if a limit is reached.

### Agents that extend themselves

9. **No-code tool builder.** A form at [`/tools`](./src/app/features/tools/tools.ts) lets you define a tool — name, description, typed parameters, and a JSON response template with `{{placeholders}}` — and Atlas registers it with the runtime without a reload. New tools are saved in IndexedDB and are available to the agent on the very next prompt.
10. **Agent-authored tools.** When tool synthesis is enabled, the agent can call `proposeTool` mid-turn to draft a brand-new tool. The proposal appears as an editable card for you to approve; once approved it registers immediately (saved, or session-only if storage isn't available) and is capped per turn so the agent can't keep adding tools endlessly.

### Input & replay

11. **Image and voice input.** The composer accepts images (drag, paste, or file picker), which are resized in the browser before being sent, plus voice dictation through the Web Speech API, with a clean fallback when it isn't supported.
12. **Replay library.** Any finished turn can be saved to IndexedDB. The [Library](./src/app/features/library/library.ts) lists your saved runs; clicking "Replay" reopens the home page with `?replay=<id>` and plays the saved events back through [`ReplayPlayer`](./src/app/core/replay/replay-player.ts) — same UI, same timing, no API call.

### Production essentials

13. **Bring your own key, two ways.** Keep your Gemini key for the session only (cleared when the tab closes), or save it encrypted in the browser with AES-GCM behind a passphrase-derived key. See [`api-key.service.ts`](./src/app/core/services/api-key.service.ts) and [`webcrypto.helpers.ts`](./src/app/core/crypto/webcrypto.helpers.ts).
14. **One error pipeline.** Every failure follows the same path: `raw error → normalizeError → AppError → logged (secrets redacted) → shown to the user` (as a toast, an app-shell banner, an inline message, or silently). See [`docs/error-handling.md`](./docs/error-handling.md).
15. **Built-in resilience.** Requests can be cancelled at any time, stalled streams time out and can be retried, setup steps use retry-with-backoff (never mid-stream), and the app checks connectivity before sending a request that would fail anyway.
16. **Lazy by default.** Routes load on demand. Tool implementations load only when used, so Zod and tool components stay out of the initial bundle. Leaflet loads only when the map scrolls into view, via `@defer (on viewport)`.
17. **Modern Angular.** Standalone, zoneless, Signals-first, OnPush everywhere, the new control flow (`@if`, `@for`, `@defer`), and Material theming with light, dark, and system modes.
18. **Safe Markdown by default.** Model output goes through `marked` (raw HTML is escaped, unsafe links are dropped) and then Angular's `DomSanitizer`. Atlas never calls `bypassSecurityTrustHtml`.

---

## Architecture

### Layer map

From `src/app/`:

```
core/                singleton services and types; never any UI
├── services/        ApiKeyService, GeminiService, ThemeService, ModelSelectionService
├── streaming/       AgentEvent, AgentEventStore, chunk→event operator, raw-history reducer
├── registry/        ToolRegistry, ToolDescriptor, InterruptService, parallel tool execution
├── agents/          AgentDefinition, AgentRegistry, built-in agent specs
├── observability/   TokenAccountantService, BudgetService, ObservabilityService, pricing
├── custom-tools/    CustomToolsService, IndexedDB-backed user- and agent-authored tools
├── replay/          ReplayService (persistence), ReplayPlayer (playback)
├── media/           image attachment downscaling, speech (voice) input
├── crypto/          WebCrypto AES-GCM + PBKDF2 helpers, session key store
├── storage/         Promise-shaped IndexedDB wrapper
├── errors/          AppError taxonomy, normalizeError, ErrorService, global handler
├── logging/         LoggerService, log sinks, redaction
├── connectivity/    online/offline signals
└── settings/        persisted feature flags (e.g. tool synthesis)

features/            one folder per route, all lazy-loaded
├── home/            chat + tool-render surface (composer, thinking, cards, replay)
├── onboarding/      API key entry, test, save (session or encrypted-local), unlock
├── library/         saved replays
├── tools/           custom tool builder
├── settings/        model selection, budgets, tool synthesis, theme, key management
├── guide/           interactive product tour
├── about/           project overview
├── security/        threat model + crypto choices
└── not-found/       404

shared/              reusable UI
├── header/          app bar with nav + observability + theme + settings
├── thought/         live thought-stream panel
├── markdown/        sanitised Markdown renderer
├── notifications/   toast host + service (dedupe, auto-dismiss, actions)
├── cost-meter/      live cost/token/context pill
├── observability-drawer/   waterfall + detail panel
├── agent-graph/     active-agent + handoff visualiser
├── error-dialog/, error-boundary/   surfaces for handled + chunk-load failures
├── ui/              shared primitives (metric, section-head, meter, page-header)
└── tools/           one folder per tool (manifest + descriptor + component + types)
```

### The `AgentEvent` catalog

The loop emits a typed stream of events. The UI simply reacts to each `type` ([`agent-event.ts`](./src/app/core/streaming/agent-event.ts)):

| Event                | Meaning                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `turn_start`         | A new turn began; state is initialised.                           |
| `thought_delta`      | Incremental "thinking" text.                                      |
| `thought_complete`   | The thought block ended.                                          |
| `text_delta`         | Incremental visible response text.                                |
| `tool_call`          | The model requested a function call (`callId`, `name`, `args`).   |
| `interrupt_request`  | An interruptive tool is waiting for your decision.                |
| `interrupt_resolved` | You decided (`approve` / `reject` / `select`).                    |
| `tool_result`        | A tool finished (a result, or `{ error }`).                       |
| `round_complete`     | One model round finished (finish reason, latency, token usage).   |
| `agent_handoff`      | The active agent switched mid-turn.                               |
| `turn_complete`      | The turn ended (`STOP`, `MAX_AGENT_ROUNDS`, `BUDGET_EXCEEDED:*`). |

### The tool contract: manifest + descriptor

Every tool has two parts: a small **manifest** loaded at startup (so the model knows the tool exists) and a **descriptor** loaded on first use (the Zod schema, the executor, and the component):

```ts
// Eager: name + Gemini function declaration + flags + a lazy loader.
export const bookFlightManifest: ToolManifest = {
  name: 'bookFlight',
  declaration: {
    /* Gemini FunctionDeclaration */
  },
  interruptive: true, // pauses the loop for human approval
  load: () => import('./booking-confirmation-card.descriptor').then((m) => m.descriptor),
};

// Lazy: schema + component + executor. Swap `execute` for a real backend
// and the component, declaration, and schema stay identical.
export const descriptor: ToolDescriptor = {
  argsSchema: z.object({
    /* … */
  }),
  component: BookingConfirmationCardComponent,
  execute: async (args, ctx) => {
    /* returns the tool result */
  },
};
```

The registry won't run a tool if its arguments fail the Zod schema — instead it returns a typed `tool_result` error the agent can recover from.

---

## Tech stack

| Concern           | Choice                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Angular** (standalone, zoneless, Signals, new control flow)                                                                                              |
| UI kit            | **Angular Material** (token-based theming, light / dark / system)                                                                                          |
| LLM               | **Gemini** via [`@google/genai`](https://www.npmjs.com/package/@google/genai) (streaming; model-tier picker in Settings)                                   |
| Reactive state    | **Signals** for component state, **RxJS** for streams                                                                                                      |
| Schema validation | **Zod** (lazy-loaded, kept out of the initial bundle)                                                                                                      |
| Map rendering     | **Leaflet** (lazy-loaded via `@defer (on viewport)`)                                                                                                       |
| Markdown          | **marked** with `DomSanitizer`                                                                                                                             |
| Persistence       | **IndexedDB** (replays, custom tools, session KEK); **localStorage** (budgets, encrypted key blob, preferences); **sessionStorage** (session key envelope) |
| Crypto            | **WebCrypto** (AES-GCM + PBKDF2-SHA256)                                                                                                                    |
| Unit tests        | **Vitest** via Angular's `@angular/build:unit-test` builder                                                                                                |
| E2E tests         | **Playwright** (headless Chromium)                                                                                                                         |
| Mock IDB in tests | **fake-indexeddb**                                                                                                                                         |
| Build             | **esbuild + Vite** (Angular's `@angular/build` toolchain)                                                                                                  |

The full dependency list lives in [`package.json`](./package.json).

---

## Getting started

Atlas runs entirely in the browser. You bring your own Gemini API key, and nothing is sent anywhere except Google's Gemini API.

### Prerequisites

| Tool               | Notes                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Node.js**        | A current LTS release. The supported range is declared in [`package.json`](./package.json) `engines`. |
| **npm**            | Ships with current LTS Node (see `packageManager` in `package.json`).                                 |
| **Modern browser** | Chrome / Edge / Safari / Firefox latest — needs `crypto.subtle` and modern IndexedDB.                 |
| **Gemini API key** | The free tier is enough. Grab one from <https://aistudio.google.com/app/apikey>.                      |

### Install

```bash
git clone https://github.com/AnkitSharma-007/angular-agentic-ui.git
cd angular-agentic-ui
npm install
```

### Start the dev server

```bash
npm start
# or: ng serve
```

Open **<http://localhost:4200>**.

The first time the app loads, it takes you to an onboarding screen:

1. Paste your Gemini API key.
2. _(Optional)_ Click **Test connection**. Atlas makes one quick call to Gemini and tells you whether it worked.
3. Choose where to store the key:
   - **For this session only** (default and safest — kept in `sessionStorage`, cleared when the tab closes).
   - **Remember on this device**: you set a passphrase, and the key is encrypted with AES-GCM (behind a passphrase-derived key) and saved in `localStorage`. Next visit, you re-enter the passphrase to unlock.
4. Click **Continue** to land on the chat screen.

### Build a production bundle

```bash
npm run build
# Output: dist/angular-agentic-ui/
```

Hosting is out of scope. Copy the `dist/` output to any static host (Vercel, Netlify, GitHub Pages, S3 + CloudFront) — there's no server-side state. The production build ships a strict Content-Security-Policy (see [Security model](#security-model)).

### A quick tour (covers every feature)

1. **Sample prompt: "Plan a weekend."** Click it → **Send**.
   - The **Thinking** panel fills in as the agent reasons.
   - **`searchFlights`** and **`searchHotels`** run in parallel; their cards show skeleton loaders, then finish independently.
   - The agent calls **`letUserChoose`** — pick any flight — then **`bookFlight`**, which pauses for **Approve / Reject**. Approve, and watch the card move from pending → running → confirmed.
   - Finally **`renderItinerary`** shows a Leaflet map (loaded as a separate chunk — check the network tab).
2. **Open the Observability drawer** (header monitoring icon) to see one row per round and per tool call. Click a row for details.
3. **Expand the Cost Meter** for a breakdown by input / output / thinking tokens, plus live context-window usage.
4. **Hand off to the second agent** with the **"Activities only"** prompt — the agent calls `handoffTo` and `findActivities` runs under ExperienceCurator.
5. **Save the run**, open the **Library**, and **Replay** it — same UI, same timing, no API call.
6. **Build a custom tool** at **Tools** → **Load example**, save the `searchWeather` tool, then go back to Chat and ask about the weather.
7. **Set a budget** in **Settings**, apply a preset, and send a bigger prompt to watch the budget stop the turn.

---

## Testing

Atlas is tested at two levels.

### Unit & integration (Vitest)

```bash
npm test
# with coverage:
npm run test:coverage
```

The suite focuses on the core runtime logic that matters most to keep stable, plus quick smoke tests for every tool component and feature page:

- **Agent loop & integration**: the full multi-round flow (thinking → tool call → settle → handoff → finish) against a mocked Gemini stream.
- **Streaming primitives**: the chunk→event operator, the event store, the raw-history reducer, and chunk summarisation.
- **Tool runtime**: the registry, parallel execution, and interrupts.
- **Persistence & security**: IndexedDB helpers, WebCrypto helpers, the API key service, and replay save/playback.
- **Observability**: token accounting, the budget limits, and the observability + drawer services.
- **Agents & custom tools**: the agent registry, custom-tool parsing, and declaration/descriptor generation.
- **UI surfaces**: smoke tests for every tool card, the cost meter, agent graph, markdown / thought renderers, header, notifications, and feature pages.

The core runtime — agent loop, streaming, tool registry, observability, persistence, crypto — is very well covered; the larger feature-page templates and the `GeminiService` adapter layer bring the overall number down.

### End-to-end (Playwright)

The e2e specs live in [`e2e/`](./e2e) and follow the manual test plan in [`TEST_CASES.md`](./TEST_CASES.md). They run headless Chromium against a local build. A few cases need a real Gemini key, passed to the test process as an environment variable and never committed.

```bash
# one-time: install browser binaries
npx playwright install

# serve the app on the port the tests expect, then run them
ng serve --port 4300
npx playwright test --config e2e/playwright.config.ts
```

---

## Security model

| Concern                        | How Atlas handles it                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key never sent to our servers  | There's no backend, proxy, or analytics server. Your key goes straight into `GoogleGenAI({ apiKey })` and is only ever sent to Google's Gemini API from your browser.                                                                                                                                                        |
| Default storage (session tier) | Your key is stored as ciphertext in `sessionStorage` (cleared when the tab closes), encrypted with a random per-session key whose raw bytes can never be read back (its handle lives in IndexedDB). The plaintext key is never stored, and XSS can't steal the encryption key. It survives a page reload within the session. |
| Persistent storage (opt-in)    | AES-GCM with a PBKDF2-SHA256-derived key. The salt and IV are random for each encryption, and the passphrase is never saved.                                                                                                                                                                                                 |
| Wrong passphrase               | The UI shows a generic "passphrase didn't unlock" message. A wrong passphrase looks the same as a tampered blob, so there's nothing to help an attacker guess.                                                                                                                                                               |
| Markdown XSS                   | Two layers of defence: `marked` escapes any raw HTML and drops unsafe links (`javascript:`, `data:`, …), and the result still passes through Angular's `DomSanitizer`. Atlas never calls `bypassSecurityTrustHtml`.                                                                                                          |
| Tool arguments                 | Every tool declares a Zod schema. The registry won't run a tool with invalid arguments — it returns a typed `tool_result` error the agent can recover from.                                                                                                                                                                  |
| Agent-authored tool templates  | Response templates are parsed so that `__proto__`, `constructor`, and `prototype` keys are dropped, which prevents prototype pollution.                                                                                                                                                                                      |
| Diagnostics                    | There's no remote logging. Before anything is written, the logger redacts API keys, passphrases, encrypted values, and base64 media.                                                                                                                                                                                         |
| Replay data                    | Saved only in your browser's IndexedDB and never uploaded. The Library has per-row delete and a "Delete all" button.                                                                                                                                                                                                         |
| Content-Security-Policy        | The production build ships a strict CSP: `script-src 'self'` (no inline scripts or `eval`) and a tight `connect-src` that only allows the Gemini API. The main risk is XSS stealing your key, and this CSP is the main protection against it.                                                                                |

The in-app **Security** page walks through the same threat model with the real values visible, and the error/redaction pipeline is documented in [`docs/error-handling.md`](./docs/error-handling.md).

---

## Performance

- **Lazy routes.** Each feature page loads on demand, so the first page only ships what the chat screen needs.
- **Lazy tool implementations.** Tool manifests are tiny and load at startup (so the model knows a tool exists); the descriptor — schema, executor, and component — loads on first use. Zod and the tool components stay out of the initial bundle.
- **Deferred heavy chunks.** Leaflet loads only when the map scrolls into view (`@defer (on viewport)`), and the cost meter and observability drawer load when the browser is idle (`@defer (on idle)`).
- **Zoneless + OnPush + Signals.** No Zone.js change-detection overhead — the streaming UI only updates the signals that change, and fast-changing streams (like markdown re-rendering) are batched into a single animation frame.
- **Bundle budgets.** `angular.json` sets size budgets, so a regression fails the production build instead of quietly bloating the app.

---

## Engineering decisions & trade-offs

- **Two views of state instead of one.** The UI wants clean, typed events; Gemini wants its own `Content[]` history with `thoughtSignature` data kept intact (thinking models break on the next round without it). Instead of deriving one from the other and risking drift, the store builds both from the same turn.
- **Manifest / descriptor split.** A tiny eager layer is what makes lazy-loading real: the model can hear about a dozen tools without loading a dozen components, Zod, and their dependencies up front.
- **Retries only during setup.** `retryWithBackoff` guards connection setup and the connection test — never a chunk mid-stream. Retrying mid-stream would spend tokens twice and could duplicate output, so it's deliberately left out.
- **Two key-storage tiers.** Session-only storage with a non-exportable key is the safe default (XSS can't export the key material); passphrase-encrypted local storage is an opt-in convenience. The trade-off — a passphrase prompt on every visit — is intentional.
- **Mock backends behind a stable contract.** Swapping any tool for a real backend is a one-file change — replace `execute` in the descriptor, and the component, declaration, and Zod schema stay the same (see [what's mocked](#known-limitations--whats-mocked)).
- **One error pipeline.** Every failure becomes a typed `AppError`, is logged once (with secrets redacted), and is shown based on a simple policy (toast, app-shell, inline, or silent). Cancellations are always silent. This keeps messages consistent and secrets out of the logs, with no remote logging.

---

## Known limitations / what's mocked

Atlas is a frontend app. The model **is real**, but the tool backends are not — this keeps the app reliable and free to run:

- `searchFlights`, `searchHotels`, `bookFlight`, `renderItinerary`, and `findActivities` return fixed mock data based on their arguments (same input → same output). Delays are simulated so you can see tools running in parallel.
- `bookFlight` doesn't book a real flight; it returns a confirmation with a made-up booking reference.
- There's no auth, no multi-user state, and no server rendering. The whole app is a static SPA.
- Token prices in [`core/observability/pricing.ts`](./src/app/core/observability/pricing.ts) match the public Gemini pricing at the time of writing; update the table to keep them current.

---

## Troubleshooting

| Symptom                                                          | Likely cause                                                                                 | Fix                                                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Authentication failed. Your API key may be invalid or expired." | No key, an expired session, or a revoked/invalid key (all auth errors show the same message) | Open **Settings** → **Forget saved key** to onboard again. If the key itself is bad, generate a new one in [AI Studio](https://aistudio.google.com/app/apikey). |
| `429` / rate limit / quota                                       | Free-tier requests-per-minute exceeded                                                       | Wait a minute, or switch the model tier in **Settings**.                                                                                                        |
| "passphrase did not unlock the stored key"                       | Wrong passphrase                                                                             | Re-enter it, or click **Forget saved key** to start over.                                                                                                       |
| Cards say "running" forever                                      | The browser blocked the request (e.g. a corporate proxy)                                     | Check the network tab; the request to `generativelanguage.googleapis.com` should be visible.                                                                    |
| Map never appears                                                | The browser blocked OpenStreetMap tiles                                                      | Open the network tab while the itinerary card is in view; `tile.openstreetmap.org` must be reachable.                                                           |
| "Storage unavailable" in Library / Tools                         | Private-browsing mode or a full storage quota                                                | The app degrades gracefully: Library and Tools show an inline banner instead of the list/editor, and the chat still works.                                      |

---

## License

Released under the [MIT License](./LICENSE).
