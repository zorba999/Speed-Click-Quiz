/* global React */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Address-based avatar (deterministic gradient blob) ─────────────────
function Avatar({ addr, size = 36, name = '' }) {
  const seed = useMemo(() => {
    const src = addr || name || 'x';
    let h = 0;
    for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0;
    return Math.abs(h);
  }, [addr, name]);
  const hue1 = seed % 360;
  const hue2 = (hue1 + 60 + (seed % 80)) % 360;
  const c1 = `oklch(0.78 0.18 ${hue1})`;
  const c2 = `oklch(0.55 0.22 ${hue2})`;
  const id = `g-${seed}`;
  const initial = (name?.[0] || addr?.[2] || '?').toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="8" fill={`url(#${id})`} />
        <text
          x="18" y="22.5" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700" fontSize="14"
          fill="rgba(0,0,0,0.7)"
        >{initial}</text>
      </svg>
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────
function shortAddr(a) {
  if (!a) return '0x000…0000';
  return a.slice(0, 6) + '…' + a.slice(-4);
}
function nick(addr) {
  // pseudo-username from address
  const NAMES = ['glitch', 'orbit', 'neon', 'static', 'pulse', 'echo', 'flux', 'vortex', 'pixel', 'cipher', 'voltage', 'quasar', 'photon', 'nyx', 'zen'];
  if (!addr) return 'anon';
  const h = parseInt(addr.slice(2, 8), 16) || 0;
  return NAMES[h % NAMES.length] + '.' + (h % 999).toString().padStart(3, '0');
}

// ─── Mock data ──────────────────────────────────────────────────────────
const MOCK_ADDRS = [
  '0x4f9a8b1c0d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
  '0xa1b2c3d4e5f6789012345678901234567890abcd',
  '0xc0ffee1234567890fedcba9876543210abcdef12',
  '0xdead00beef00cafe00face00bad00deed00f00d0',
  '0x7e57e57e57e57e57e57e57e57e57e57e57e57e57',
  '0xfeedface1234567890abcdef0987654321deadc0',
];

const MOCK_QUESTIONS = [
  {
    q: 'What concept lets GenLayer validators reach consensus on AI outputs without each running the LLM call?',
    options: ['Proof of Stake', 'Optimistic Democracy', 'zk-SNARKs', 'Sharding'],
    correct: 1,
    category: 'GenLayer',
    difficulty: 'medium',
  },
  {
    q: 'In Speed Click Quiz, how is "speed" measured for scoring?',
    options: ['Off-chain timestamps', 'Frontend latency', 'On-chain transaction order', 'Network ping'],
    correct: 2,
    category: 'GenLayer',
    difficulty: 'easy',
  },
  {
    q: 'Which year did the term "Web3" gain mainstream traction in crypto media?',
    options: ['2017', '2019', '2021', '2023'],
    correct: 2,
    category: 'Crypto',
    difficulty: 'medium',
  },
  {
    q: 'Which protocol popularized the meme "ngmi"?',
    options: ['Bitcoin', 'Ethereum NFT culture', 'Solana DeFi', 'Cosmos IBC'],
    correct: 1,
    category: 'Memes',
    difficulty: 'easy',
  },
];

const MOCK_LEADERBOARD = [
  { addr: MOCK_ADDRS[0], xp: 12480 },
  { addr: MOCK_ADDRS[2], xp: 9820 },
  { addr: MOCK_ADDRS[1], xp: 8740 },
  { addr: MOCK_ADDRS[5], xp: 6230 },
  { addr: MOCK_ADDRS[3], xp: 5410 },
  { addr: MOCK_ADDRS[4], xp: 3890 },
  { addr: '0xab12cd34ef56789012345678901234567890ab12', xp: 2640 },
  { addr: '0x9876543210fedcba9876543210fedcba98765432', xp: 1820 },
];

// ─── Toast ──────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2400);
  }, []);
  const node = msg ? <div className="toast">{msg}</div> : null;
  return [show, node];
}

// Expose
Object.assign(window, { Avatar, shortAddr, nick, MOCK_ADDRS, MOCK_QUESTIONS, MOCK_LEADERBOARD, useToast });
