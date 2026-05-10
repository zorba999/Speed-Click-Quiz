import { useEffect, useState, useCallback } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'
import Avatar from './Avatar.jsx'
import { shortAddr, nick } from '../utils/format.js'

export default function Results({ roomId, myAddress, onLeave, onDispute, showToast }) {
  const gl = useGenLayer()
  const myAddr = (myAddress || '').toLowerCase()
  const [room,   setRoom]   = useState(null)
  const [busy,   setBusy]   = useState(false)

  const fetchRoom = useCallback(async () => {
    try { const r = await gl.getRoom(roomId); setRoom(r); return r } catch { return null }
  }, [gl, roomId])

  useEffect(() => { fetchRoom() }, [fetchRoom])

  async function handleDistribute() {
    setBusy(true)
    try {
      await gl.distributeXP(roomId)
      showToast('XP committed to global ladder')
      await fetchRoom()
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    } finally { setBusy(false) }
  }

  if (!room) {
    return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
  }

  const scores   = room.scores ?? {}
  const players  = room.players ?? []
  const sorted   = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const top3     = sorted.slice(0, 3)
  const amHost   = myAddr === (room.host || '').toLowerCase()
  const distributed = room.xp_distributed || room.status === 'ended'

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-16" onClick={onLeave}>← BACK HOME</button>

      <div className="row-between mb-24" style={{ alignItems: 'flex-end' }}>
        <div>
          <span className="kicker">/ FINAL · {roomId}</span>
          <h1 className="display display-lg mt-12" style={{ marginBottom: 6 }}>
            {distributed ? 'XP committed.' : 'Game over.'}
          </h1>
          <p className="text-muted">
            {distributed
              ? 'Scores are now part of the on-chain leaderboard.'
              : 'Host can distribute XP to push these scores to the global ladder.'}
          </p>
        </div>
        <span className="chip chip-amber">{room.total_rounds} rounds played</span>
      </div>

      <div className="podium">
        {[1, 0, 2].map((podiumIdx) => {
          const addr = top3[podiumIdx]
          if (!addr) return <div key={podiumIdx} />
          const place = podiumIdx + 1
          return (
            <div key={addr} className={`podium-step p${place} anim-pop`} style={{ animationDelay: `${podiumIdx * 0.15}s` }}>
              <div className="pos">#{place}</div>
              <Avatar addr={addr} name={nick(addr)} size={48} />
              <div className="podium-name">{nick(addr)}{addr.toLowerCase() === myAddr ? ' · YOU' : ''}</div>
              <div className="podium-addr">{shortAddr(addr)}</div>
              <div className="podium-xp">+{scores[addr] ?? 0} XP</div>
            </div>
          )
        })}
      </div>

      <div className="results-table">
        <div className="results-row head">
          <span>RANK</span>
          <span />
          <span>PLAYER</span>
          <span style={{ textAlign: 'right' }}>XP</span>
          <span style={{ textAlign: 'right' }}>ACTION</span>
        </div>
        {sorted.map((addr, i) => (
          <div key={addr} className={`results-row r${i + 1}`}
            style={{ background: addr.toLowerCase() === myAddr ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : 'transparent' }}>
            <span className="rank-num">#{i + 1}</span>
            <Avatar addr={addr} name={nick(addr)} size={32} />
            <div>
              <div className="name">{nick(addr)}{addr.toLowerCase() === myAddr ? ' · YOU' : ''}</div>
              <div className="addr">{shortAddr(addr)}</div>
            </div>
            <span className="xp">+{scores[addr] ?? 0}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onDispute(roomId, room.total_rounds)}>
              DISPUTE
            </button>
          </div>
        ))}
      </div>

      {amHost && !distributed && (
        <button
          className="btn btn-primary btn-lg mt-24"
          style={{ width: '100%' }}
          onClick={handleDistribute}
          disabled={busy}
        >
          {busy ? <><span className="spinner" /> COMMITTING TO CHAIN…</> : 'DISTRIBUTE XP TO LEADERBOARD'}
        </button>
      )}
    </div>
  )
}
