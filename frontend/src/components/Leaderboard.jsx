import { useState, useEffect } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'
import Avatar from './Avatar.jsx'
import { shortAddr, nick } from '../utils/format.js'

export default function Leaderboard({ myAddress, onBack }) {
  const gl = useGenLayer()
  const myAddr = (myAddress || '').toLowerCase()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchBoard() {
    setLoading(true)
    try {
      const data = await gl.getLeaderboard()
      setEntries(Array.isArray(data) ? data : [])
    } catch { setEntries([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchBoard()
    const id = setInterval(fetchBoard, 30_000)
    return () => clearInterval(id)
  }, [])

  const total = entries.reduce((s, e) => s + (e.xp ?? 0), 0)
  const top   = entries[0]?.xp ?? 0
  const avg   = entries.length ? Math.round(total / entries.length) : 0

  return (
    <div>
      <div className="row-between mb-24">
        <div>
          <span className="kicker">/ GLOBAL LADDER · BRADBURY</span>
          <h1 className="display display-lg mt-12">Hall of speed.</h1>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm" onClick={fetchBoard} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↻ REFRESH'}
          </button>
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack}>← HOME</button>}
        </div>
      </div>

      <div className="lb-stat-grid">
        <div className="lb-stat accent">
          <div className="label">// PLAYERS</div>
          <div className="num tabular">{entries.length}</div>
        </div>
        <div className="lb-stat">
          <div className="label">// TOTAL XP</div>
          <div className="num tabular">{total.toLocaleString()}</div>
        </div>
        <div className="lb-stat magenta">
          <div className="label">// TOP SCORE</div>
          <div className="num tabular">{top.toLocaleString()}</div>
        </div>
        <div className="lb-stat">
          <div className="label">// AVG XP</div>
          <div className="num tabular">{avg.toLocaleString()}</div>
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p className="text-muted">No entries yet — play a game to get on the board.</p>
        </div>
      ) : (
        <div className="results-table">
          <div className="results-row head">
            <span>RANK</span><span /><span>PLAYER</span>
            <span style={{ textAlign: 'right' }}>XP</span>
            <span style={{ textAlign: 'right' }}>STATUS</span>
          </div>
          {entries.map((entry, i) => {
            const addr = entry.address ?? entry.addr ?? ''
            const isMe = addr.toLowerCase() === myAddr
            return (
              <div key={addr} className={`results-row r${i+1}`}
                style={{ background: isMe ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : 'transparent' }}>
                <span className="rank-num">#{i+1}</span>
                <Avatar addr={addr} name={nick(addr)} size={32} />
                <div>
                  <div className="name">{nick(addr)}{isMe && <span className="text-accent" style={{ marginLeft: 6 }}>· YOU</span>}</div>
                  <div className="addr">{shortAddr(addr)}</div>
                </div>
                <span className="xp">{(entry.xp ?? 0).toLocaleString()}</span>
                <span className="mono text-muted" style={{ textAlign: 'right', fontSize: '0.74rem' }}>
                  {i === 0 ? 'CHAMPION' : i < 3 ? 'PODIUM' : 'ACTIVE'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="center text-muted mt-16" style={{ fontSize: '0.78rem' }}>
        // Auto-syncs from on-chain state every 30s
      </p>
    </div>
  )
}
