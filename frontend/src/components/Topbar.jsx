import WalletPill from './WalletPill.jsx'

const THEMES = [
  ['lime',    'Lime'],
  ['magenta', 'Magenta'],
  ['cyan',    'Cyan'],
  ['amber',   'Amber'],
]

export default function Topbar({ screen, onNav }) {
  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'lime'
    const idx = THEMES.findIndex(([t]) => t === current)
    const next = THEMES[(idx + 1) % THEMES.length][0]
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header className="topbar">
      <div className="brand" onClick={() => onNav('landing')} style={{ cursor: 'pointer' }}>
        <span className="brand-mark">S</span>
        <span>SPEED.<span style={{ color: 'var(--accent)' }}>CLICK</span></span>
        <span className="brand-tag">Bradbury · v1</span>
      </div>
      <nav className="topnav">
        <button className={`navlink${screen === 'landing' ? ' active' : ''}`} onClick={() => onNav('landing')}>HOME</button>
        <button className={`navlink${screen === 'leaderboard' ? ' active' : ''}`} onClick={() => onNav('leaderboard')}>LADDER</button>
        <button className={`navlink${screen === 'dispute' ? ' active' : ''}`} onClick={() => onNav('dispute')}>TRIBUNAL</button>
        <button className="btn btn-ghost btn-sm" style={{ padding: '6px 10px', fontSize: '0.72rem' }} onClick={cycleTheme} title="Cycle theme">THEME</button>
        <WalletPill />
      </nav>
    </header>
  )
}
