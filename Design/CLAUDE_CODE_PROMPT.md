# Speed Click Quiz — Wire the New UI into the Real dApp

## Context

I have a working dApp at the repository root:

```
contract/        # GenLayer Intelligent Contract (Python) — DO NOT TOUCH
deploy/          # Deployment scripts                    — DO NOT TOUCH
frontend/        # React + Vite frontend                 — UPGRADE THE UI ONLY
  src/
    App.jsx
    main.jsx
    index.css
    components/
      HomeScreen.jsx
      GameRoom.jsx
      Leaderboard.jsx
      WalletButton.jsx
    context/WalletContext.jsx       # MetaMask wiring   — KEEP LOGIC AS IS
    hooks/useGenLayer.js            # Contract bindings — KEEP LOGIC AS IS
```

I have already designed the new UI as a self-contained HTML/JSX prototype. **Your job is NOT to invent a new design.** Your job is to take those files and integrate them into the real `frontend/` Vite app, replacing the current UI 1:1 while keeping every existing on-chain interaction working.

## The design files are already in this repo

The reference design lives alongside the project (or wherever you have placed it — adjust the path if needed):

```
Speed Click.html        # entry — references the rest
styles.css              # full design system: tokens, components, screens
components.jsx          # Avatar + helpers + mock data
screens-1.jsx           # Landing, CreateRoom, JoinRoom, Lobby
screens-2.jsx           # ActiveGame (with Race sidebar + SpeedReadout), Results
screens-3.jsx           # Leaderboard, Dispute (AI Tribunal)
app.jsx                 # router + Tweaks panel wiring
tweaks-panel.jsx        # presentation harness — DO NOT port to production
```

**Read every one of those files before you start.** They are the source of truth for color tokens, typography, spacing, motion, layout, screen flow, copy tone, and component vocabulary. The CSS class names in `styles.css` are designed to be copied verbatim — keep them.

## What I want you to do

### 1. Lift the design system into `frontend/src/index.css`

Replace the current `frontend/src/index.css` with the contents of `styles.css` from the prototype. All the tokens (`--ink`, `--lime`, `--paper`, `--accent`, …), component classes (`.btn`, `.card`, `.answer`, `.timer-mega`, `.race-row`, `.podium-step`, `.tribunal`, …), and animation keyframes (`@keyframes pulse-dot`, `slide-up`, `pop-in`, `shimmer`) come over as-is.

Add the Google Fonts link to `frontend/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```

### 2. Port each screen from the prototype to a real React component file

The prototype concentrates many screens per file because it runs through Babel-in-browser. In the real Vite app, **split them into one file per screen** under `frontend/src/components/`:

| Prototype source | New file | Notes |
|---|---|---|
| `screens-1.jsx` → `Landing` | `frontend/src/components/Landing.jsx` | Replaces the hero portion of `HomeScreen.jsx`. Hero wordmark, two CTA cards, feature strip, scoring + how-it-works cards. The `LiveWidget` mock can be omitted (no contract method to list rooms) or kept as static "recent activity". |
| `screens-1.jsx` → `CreateRoom` | `frontend/src/components/CreateRoom.jsx` | Use `gl.createRoom(code, players, rounds)` instead of the mocked `setTimeout`. Keep the "↻ ROLL" code generator, the `Stepper` controls, the transaction preview block. |
| `screens-1.jsx` → `JoinRoom` | `frontend/src/components/JoinRoom.jsx` | Wire to `gl.joinRoom(code)`. |
| `screens-1.jsx` → `Lobby` | `frontend/src/components/Lobby.jsx` | Replace the simulated player-joining timeout with real `room.players` from the polling loop. Host's "START GAME" button calls `gl.startGame()` and shows "GENERATING QUESTIONS…" while awaiting. |
| `screens-2.jsx` → `ActiveGame` | `frontend/src/components/ActiveGame.jsx` | This is the biggest port. The prototype simulates other players answering on a timer — **delete that logic**. Use the real `room.round_answers` and `room.answer_count` from the contract via the existing 4s polling loop. Keep: the keyboard shortcut handler (A/B/C/D + 1/2/3/4), the `TimerMega` 30s countdown that resets on `current_round` change, the `SpeedReadout` that shows your on-chain `position`, and the `Race` sidebar ordered by submission position. The "reveal" phase happens when `host` calls `gl.finalizeRound()` — surface that as a host-only button at the bottom of the question card. |
| `screens-2.jsx` → `Results` | `frontend/src/components/Results.jsx` | Renders for `room.status === 'finished'` AND `'ended'`. Shows podium + full results table. Host-only "DISTRIBUTE XP" button calls `gl.distributeXP()` when `status === 'finished'`; hidden when `status === 'ended'` (just shows "XP committed."). Each row's "⚖ DISPUTE" button routes to the Dispute screen with the round + question pre-selected. |
| `screens-3.jsx` → `Leaderboard` | `frontend/src/components/Leaderboard.jsx` | Replaces the existing one. Uses `gl.getLeaderboard()` with the same 30s auto-refresh interval as today. Stat grid + results table styling. |
| `screens-3.jsx` → `Dispute` | `frontend/src/components/Dispute.jsx` | Pull this out of the current `GameRoom.jsx`. Submits via `gl.disputeQuestion(roomId, roundIndex, reason)`. The "verdict orb" + validator chip animation runs while awaiting the tx receipt; the verdict UPHELD / OVERTURNED is read from the response (`gl.getDispute(disputeId)` if needed). |

### 3. Build the shared atoms

Add to `frontend/src/components/`:
- `Avatar.jsx` — deterministic gradient blob from a wallet address (copy from `components.jsx`).
- `Topbar.jsx` — sticky brand bar with HOME / LADDER / TRIBUNAL nav + `WalletPill`.
- `WalletPill.jsx` — replaces today's `WalletButton.jsx` (export name change is fine; update imports).
- `Stepper.jsx` — three-button numeric stepper.
- `TimerMega.jsx` — countdown + progress bar with ≤5s `danger` color switch.
- `Race.jsx` — live submission-order sidebar.
- `SpeedReadout.jsx` — post-submit position + conditional XP card.
- `Podium.jsx` — three-step results podium.
- `Tribunal.jsx` — verdict orb + validator chip row used by `Dispute.jsx`.

The helpers `shortAddr(addr)` and `nick(addr)` from `components.jsx` move to `frontend/src/utils/format.js`.

### 4. Wire the router in `frontend/src/App.jsx`

Replace the current `App.jsx` with the prototype's `app.jsx` structure, but:
- Drop the `TWEAK_DEFAULTS`, `TweaksPanel`, `useTweaks` imports — the production app does not need the tweaks harness. (If you want a theme switcher, build a small `<select>` in the Topbar that toggles `data-theme` on `<html>`.)
- Drop the mock `MOCK_ADDRS[0]` placeholder — `myAddress` comes from `useWallet().address`.
- The router screen should be **derived from `room.status`** when a room is active, not from manual state, so the user automatically transitions Lobby → ActiveGame → Results as the contract progresses:
  ```js
  if (!room) screen = userIntent  // 'landing' | 'create' | 'join' | 'leaderboard' | 'dispute'
  else if (room.status === 'waiting') screen = 'lobby'
  else if (room.status === 'active') screen = 'active'
  else if (room.status === 'finished' || room.status === 'ended') screen = 'results'
  ```

### 5. Things that must keep working exactly as today

- `WalletContext.connect()` — including the EIP-3085 chain-add fallback for Bradbury (chain id 4221, RPC `https://rpc-bradbury.genlayer.com`, GEN token, explorer `https://explorer-bradbury.genlayer.com/`).
- `useGenLayer()` returns `createRoom, joinRoom, startGame, submitAnswer, finalizeRound, distributeXP, disputeQuestion, getRoom, getCurrentQuestion, getScores, getLeaderboard, getDispute, address, loading, error, txHash` — all consumed by name from the new components.
- The 4s polling loop for `getRoom`, the per-round re-fetch of `getCurrentQuestion` with the 1.5s retry on transient failure, and the 30s timer reset when `current_round` changes — port these into `ActiveGame.jsx` from the existing `GameRoom.jsx`.
- `import.meta.env.VITE_CONTRACT_ADDRESS` — do not hardcode.

## Things to drop on the floor

- All mock data in the prototype: `MOCK_ADDRS`, `MOCK_QUESTIONS`, `MOCK_LEADERBOARD`, the simulated other-players auto-submit timer, the synthetic verdict in `Dispute`. The real app gets its data from the contract.
- The Tweaks panel and its `tweaks-panel.jsx` — purely a presentation tool.
- The `LiveWidget` "live rooms" component on Landing — there is no contract method to enumerate rooms. Omit it or hardcode a static "recent activity" block.
- The fake "you connected" toggle on the `WalletPill` click — connect must run the real `useWallet().connect()`.

## Acceptance checklist

- [ ] `cd frontend && npm install && npm run dev` boots clean, zero console errors.
- [ ] MetaMask connect → auto-switch to Bradbury (no regression).
- [ ] Two browsers, two wallets: I can create a room, share the code, the second wallet joins, host starts the game, AI questions render, both submit answers, host finalizes each round, final XP distributes, both see the global leaderboard update.
- [ ] Disputes still call `dispute_question` and surface the verdict explanation from the on-chain response.
- [ ] Visually matches the prototype: same screens, same hierarchy, same fonts (Space Grotesk + JetBrains Mono), same color tokens, same component vocabulary. Pixel-identical not required; "looks like the same product" is.
- [ ] No emoji used as functional UI.
- [ ] Keyboard A/B/C/D + 1/2/3/4 select answers in `ActiveGame`.
- [ ] `data-theme="lime|magenta|cyan|amber"` on `<html>` swaps accent palettes.

## Working order I recommend

1. Read `Speed Click.html`, `styles.css`, `components.jsx`, `app.jsx`, then `screens-1.jsx`, `screens-2.jsx`, `screens-3.jsx` in that order.
2. Copy `styles.css` content into `frontend/src/index.css`. Add the Google Fonts `<link>`.
3. Build the shared atoms (`Avatar`, `Topbar`, `WalletPill`, `Stepper`, `TimerMega`, `Race`, `SpeedReadout`, `Podium`, `Tribunal`).
4. Port the screens one by one in this order: `Landing` → `CreateRoom` → `JoinRoom` → `Lobby` → `ActiveGame` → `Results` → `Leaderboard` → `Dispute`. Test the on-chain flow after each.
5. Replace `App.jsx` with the new router. Delete the now-unused `HomeScreen.jsx`, `GameRoom.jsx`, `WalletButton.jsx`.
6. Smoke test the full flow with two wallets on Bradbury testnet.

When in doubt about visuals → open the prototype files. When in doubt about contract behavior → leave `useGenLayer.js` and `WalletContext.jsx` exactly as they are and read what the existing components were doing.
