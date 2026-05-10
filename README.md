# ⚡ Speed Click Quiz

> Fast-paced multiplayer quiz game powered by **GenLayer Intelligent Contracts** & **Optimistic Democracy**

Built on the [GenLayer Bradbury Testnet](https://explorer-bradbury.genlayer.com/) — the world's first AI-native blockchain.

---

## 🎮 How it Works

1. **Create a Room** — host creates a room with 2–10 players and 5–10 rounds
2. **Players Join** — share the room ID with friends
3. **Start Game** — host starts the game; the on-chain AI (via Optimistic Democracy) generates fresh quiz questions
4. **Answer Fast** — speed matters: 1st correct = 100 XP, 2nd = 75 XP, 3rd = 50 XP…
5. **Dispute** — if a question is wrong, any player can open an on-chain AI dispute
6. **XP Leaderboard** — scores are pushed to the global leaderboard

---

## 🧠 GenLayer Features Used

| Feature | Where |
|---------|-------|
| **Intelligent Contract** | `contract/speed_click_quiz.py` |
| **Optimistic Democracy #1** | `start_game()` — LLM generates questions, validators verify |
| **Optimistic Democracy #2** | `dispute_question()` — LLM arbitrates disputes |
| **on-chain state** | Rooms, scores, leaderboard all stored on GenLayer |

---

## 🗂 Project Structure

```
Genlayer2/
├── contract/
│   └── speed_click_quiz.py     # GenLayer Intelligent Contract
├── deploy/
│   ├── deploy.js               # Deployment script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameRoom.jsx    # Multiplayer game UI
│   │   │   ├── HomeScreen.jsx  # Create / Join room
│   │   │   ├── Leaderboard.jsx # Global XP leaderboard
│   │   │   └── WalletButton.jsx # MetaMask connect
│   │   ├── context/
│   │   │   └── WalletContext.jsx # EVM wallet state
│   │   ├── hooks/
│   │   │   └── useGenLayer.js  # Contract interaction hook
│   │   └── App.jsx
│   ├── .env                    # VITE_CONTRACT_ADDRESS
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- [MetaMask](https://metamask.io/) browser extension
- GEN tokens on Bradbury Testnet — get them from the [faucet](https://faucet.genlayer.com/)

### Run locally

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Deploy contract

```bash
cd deploy
npm install
$env:PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
node deploy.js
# Update frontend/.env with the new contract address
```

---

## 🔗 Live Contract

| Network | Address |
|---------|---------|
| Bradbury Testnet | `0xA96469B2897476444c397e9B69C4415b7Aa7d5Ae` |

Explorer: [View on Bradbury](https://explorer-bradbury.genlayer.com/contracts)

---

## 🛠 Tech Stack

- **Smart Contract**: Python + [genlayer SDK](https://docs.genlayer.com)
- **Frontend**: React + Vite + TailwindCSS
- **Wallet**: MetaMask (EIP-3085 network switching)
- **Chain**: GenLayer Bradbury Testnet (Chain ID: 4221)
