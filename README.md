# Speed Click Quiz

> Fast-paced multiplayer quiz game powered by **GenLayer Intelligent Contracts** & **Optimistic Democracy**

Built on the [GenLayer Bradbury Testnet](https://explorer-bradbury.genlayer.com/) — the world's first AI-native blockchain.

---

## How it Works

1. **Create a Room** — host creates a room with 2–10 players and 5–10 rounds
2. **Players Join** — share the room code with friends
3. **Start Game** — host starts; the on-chain LLM (Optimistic Democracy) generates fresh questions
4. **Answer Fast** — 1st correct = 100 XP, 2nd = 75 XP, 3rd = 50 XP…
5. **Dispute** — if a question is wrong, any player files an on-chain AI dispute
6. **XP Leaderboard** — scores persist on the global leaderboard

---

## GenLayer Features Used

| Feature | Where |
|---------|-------|
| **Intelligent Contract** | `contract/speed_click_quiz.py` |
| **Optimistic Democracy #1** | `start_game()` — LLM generates questions, validators verify |
| **Optimistic Democracy #2** | `dispute_question()` — LLM arbitrates disputes |
| **On-chain state** | Rooms, scores, leaderboard stored on GenLayer |

---

## Project Structure

```
Genlayer2/
├── contract/
│   └── speed_click_quiz.py          # GenLayer Intelligent Contract (Python)
├── deploy/
│   ├── deploy.js                    # Deployment script
│   └── package.json
├── Design/                          # Original UI prototype files (reference only)
│   ├── styles.css
│   ├── screens-1.jsx / screens-2.jsx / screens-3.jsx
│   └── components.jsx
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.jsx          # Home / hero screen
│   │   │   ├── CreateRoom.jsx       # Room creation flow
│   │   │   ├── JoinRoom.jsx         # Join by room code
│   │   │   ├── Lobby.jsx            # Pre-game waiting room
│   │   │   ├── ActiveGame.jsx       # Live question + race sidebar
│   │   │   ├── Results.jsx          # Round/game results + podium
│   │   │   ├── Leaderboard.jsx      # Global XP leaderboard
│   │   │   ├── Dispute.jsx          # AI tribunal screen
│   │   │   ├── Topbar.jsx           # Navigation bar
│   │   │   ├── WalletPill.jsx       # Wallet connect button
│   │   │   ├── Avatar.jsx           # Deterministic gradient avatar
│   │   │   └── Stepper.jsx          # Multi-step form indicator
│   │   ├── context/
│   │   │   └── WalletContext.jsx    # MetaMask wallet state
│   │   ├── hooks/
│   │   │   └── useGenLayer.js       # Contract interaction hook
│   │   ├── utils/
│   │   │   └── format.js            # shortAddr / nick helpers
│   │   ├── index.css                # Design system (tokens, components, animations)
│   │   └── App.jsx                  # Router — derives screen from room.status
│   ├── index.html
│   ├── .env                         # VITE_CONTRACT_ADDRESS
│   └── package.json
└── README.md
```

---

## Quick Start

### Prerequisites
- [MetaMask](https://metamask.io/) browser extension
- GEN tokens on Bradbury Testnet — [faucet](https://faucet.genlayer.com/)

### Run locally

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Deploy contract

```bash
cd deploy
npm install
# Windows PowerShell
$env:PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
node deploy.js
# Copy the printed address into frontend/.env as VITE_CONTRACT_ADDRESS
```

---

## Live Contract

| Network | Address |
|---------|---------|
| Bradbury Testnet | `0xA96469B2897476444c397e9B69C4415b7Aa7d5Ae` |

[View on Bradbury Explorer](https://explorer-bradbury.genlayer.com/contracts)

---

## Tech Stack

- **Smart Contract**: Python + [GenLayer SDK](https://docs.genlayer.com)
- **Frontend**: React 18 + Vite + CSS design system
- **Wallet**: MetaMask via EIP-3085 network switching
- **Chain**: GenLayer Bradbury Testnet (Chain ID: 4221)
