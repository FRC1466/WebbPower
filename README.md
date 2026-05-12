# WebbPower

A diagnostic dashboard for FRC robot power — bus voltage, per-subsystem current draw, battery rotation, match-by-match analytics, and live capture from NetworkTables 4. Built to run on a pit laptop, the driver station, and phones simultaneously.

## Stack

- Bun · React Router 7 (SPA) · Vite · React 19 · TypeScript strict
- Tailwind CSS v4 · shadcn-style UI built on **Base UI** primitives · Lucide icons
- Convex (data + live queries + auth) · Convex Auth (email/password + anonymous)
- Zustand (ephemeral UI + live capture state) · next-themes · Sonner
- uPlot (match charts) · Recharts (analytics) · idb-keyval (offline queue) · Workbox PWA

## One command to run everything

```bash
./bin/dev           # macOS / Linux
```

```powershell
bin\dev             # Windows (cmd or PowerShell)
```

That script:
1. Installs **Bun** if it's missing.
2. Installs `node_modules`.
3. First run: kicks off `bunx convex dev --once` interactively — you'll be asked to log into Convex in your browser. Pick **your personal team** and create a new project named **WebbPower**.
4. Seeds the Convex environment variables (`TBA_API_KEY`, `NT4_DEFAULT_HOST`, `BROWNOUT_THRESHOLD_V`).
5. Starts `convex dev` and `vite` together with interleaved logs.

After that, the launcher skips setup and just boots the dev loop. Same command from a fresh checkout on any machine. The Windows launcher (`bin\dev.cmd` → `bin\dev.ps1`) mirrors the bash version exactly — no execution-policy fiddling required.

## What you must do on the first run

1. Run `./bin/dev`.
2. Open the Convex auth URL it prints; sign in with the account that owns your **personal** team.
3. Choose **Create new project** → name it `WebbPower` → pick your personal team.
4. When Vite is up, open http://localhost:5173, sign up with email/password, then visit **Setup** and click **Claim admin role**.
5. On Setup, save your TBA event key (e.g. `2026nvlv`) and team key (e.g. `frc1466`), then **Import schedule**.

## Project layout

```
convex/                  # Convex backend (schema, auth, queries, mutations, actions)
  schema.ts              # Tables: users, roles, batteries, subsystems, sessions, sampleWindows, captureLocks, alerts, matches, config
  auth.ts                # Convex Auth providers: Password + Anonymous
  tba.ts                 # TBA importer action
  ai.ts                  # AI skill: summarize session (Anthropic if ANTHROPIC_API_KEY is set)
src/
  routes/                # React Router 7 SPA routes (Live, Batteries, Matches, …)
  components/ui/         # shadcn-style components on Base UI
  components/layout/     # AppShell, UserMenu
  nt4/                   # NT4 WebSocket client + capture loop
  workers/               # Web Worker: .dslog / .wpilog parser
  store/                 # Zustand stores (ui, live)
  lib/                   # cn, lttb, device id, offline queue, etc.
bin/dev                  # Single-command launcher
```

## Roles

- **Admin** — setup, subsystem config, battery edits, retire/delete
- **Pit** — log measurements, import logs, tag sessions, claim capture role
- **Viewer** — read-only

The first user who is not anonymous can claim the admin role on the Setup page.

## Architecture highlights

- One **capture device** at a time runs the NT4 client (single capture lock in Convex).
- NT4 samples at the robot's native rate; capture device **downsamples to 10 Hz**, batches into **1-second windows**, and writes one document per window. The live store (Zustand) is the source for the dashboard UI on the capture device.
- Viewers subscribe to a rolling 30-second live buffer plus historical sample windows.
- Charts use **LTTB** to decimate to ~500 visible points regardless of session length.
- Log parsing runs in a **Web Worker** (`src/workers/log-parser.worker.ts`).
- Offline battery measurements queue in **IndexedDB** and sync when the network returns.

## Useful scripts

| Command | What it does |
| --- | --- |
| `./bin/dev` | One-command bootstrap + dev loop. |
| `bun run dev:parallel` | Already-bootstrapped dev loop (convex dev + vite). |
| `bun run typecheck` | Strict TS check (requires `convex dev` to have run once). |
| `bun run build` | Production build. |
| `bunx convex env set KEY value` | Set a Convex env var. |
| `bunx convex env list` | List Convex env vars. |
