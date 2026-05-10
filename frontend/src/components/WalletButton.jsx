import { useState } from 'react'
import { useWallet } from '../context/WalletContext.jsx'

function shortAddr(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export default function WalletButton() {
  const { address, connect, disconnect, connecting, error } = useWallet()
  const [showMenu, setShowMenu] = useState(false)

  if (address) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ borderColor: 'var(--success)', color: 'var(--success)', gap: 6 }}
          onClick={() => setShowMenu(v => !v)}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 5px var(--success)',
            display: 'inline-block',
          }} />
          {shortAddr(address)}
        </button>

        {showMenu && (
          <div style={{
            position: 'absolute', top: '110%', right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 0',
            minWidth: 180, zIndex: 100,
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ padding: '6px 16px', fontSize: '.78rem', color: 'var(--muted)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              Connected
            </div>
            <div style={{ padding: '6px 16px', fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--text)', marginBottom: 4 }}>
              {address}
            </div>
            <button
              onClick={() => { disconnect(); setShowMenu(false) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '8px 16px',
                background: 'none', border: 'none',
                color: 'var(--danger)', cursor: 'pointer',
                fontSize: '.85rem',
              }}
            >
              🔌 Disconnect
            </button>
          </div>
        )}

        {showMenu && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        className="btn btn-primary btn-sm"
        onClick={connect}
        disabled={connecting}
        style={{ gap: 6 }}
      >
        {connecting ? '⏳ Connecting…' : '🦊 Connect Wallet'}
      </button>
      {error && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          background: '#ff525218', border: '1px solid #ff525260',
          borderRadius: 8, padding: '8px 14px',
          fontSize: '.78rem', color: 'var(--danger)',
          maxWidth: 260, zIndex: 100,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
