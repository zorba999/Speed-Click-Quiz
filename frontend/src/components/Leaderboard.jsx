import { useState, useEffect } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'

function shortAddr(addr) {
  if (!addr) return '???'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const gl = useGenLayer()
  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState(null)

  async function fetchBoard() {
    setLoading(true)
    try {
      const data = await gl.getLeaderboard()
      setEntries(Array.isArray(data) ? data : [])
      setLastFetch(new Date())
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBoard()
    const id = setInterval(fetchBoard, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">🏆 Global Leaderboard</h2>
          <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
            Cumulative XP earned across all game sessions on Bradbury Testnet
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchBoard}
          disabled={loading}
        >
          {loading ? '⏳' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats bar */}
      {entries.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            ['👥 Players', entries.length],
            ['⚡ Top XP',  entries[0]?.xp ?? 0],
            ['📊 Avg XP',  Math.round(entries.reduce((s, e) => s + e.xp, 0) / entries.length)],
          ].map(([label, val]) => (
            <div
              key={label}
              className="card"
              style={{ padding: '14px 16px', textAlign: 'center' }}
            >
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr 100px',
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: '.78rem',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          <span>#</span>
          <span>Address</span>
          <span style={{ textAlign: 'right' }}>Total XP</span>
        </div>

        {loading && entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>Fetching leaderboard…</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <p style={{ color: 'var(--muted)' }}>No entries yet — play a game to get on the board!</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry.address}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr 100px',
                padding: '12px 18px',
                alignItems: 'center',
                borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                background: i < 3 ? `${['#ffd70008', '#c0c0c008', '#cd7f3208'][i]}` : 'transparent',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => {
                e.currentTarget.style.background = i < 3
                  ? ['#ffd70008', '#c0c0c008', '#cd7f3208'][i]
                  : 'transparent'
              }}
            >
              {/* Rank */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {i < 3 ? (
                  <span style={{ fontSize: '1.2rem' }}>{MEDALS[i]}</span>
                ) : (
                  <span
                    style={{
                      width: 28, height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.8rem', fontWeight: 700, color: 'var(--muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Address */}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '.85rem',
                  color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text)',
                }}
              >
                {entry.address}
              </span>

              {/* XP */}
              <span
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: i < 3 ? '1.1rem' : '.95rem',
                  color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--accent)',
                }}
              >
                {entry.xp.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {lastFetch && (
        <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--muted)', marginTop: 12 }}>
          Last updated: {lastFetch.toLocaleTimeString()} · auto-refreshes every 30s
        </p>
      )}
    </div>
  )
}
