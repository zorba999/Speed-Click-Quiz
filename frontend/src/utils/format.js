export function shortAddr(a) {
  if (!a) return '0x000…0000';
  return a.slice(0, 6) + '…' + a.slice(-4);
}

const NAMES = ['glitch','orbit','neon','static','pulse','echo','flux','vortex','pixel','cipher','voltage','quasar','photon','nyx','zen'];
export function nick(addr) {
  if (!addr) return 'anon';
  const h = parseInt(addr.slice(2, 8), 16) || 0;
  return NAMES[h % NAMES.length] + '.' + (h % 999).toString().padStart(3, '0');
}
