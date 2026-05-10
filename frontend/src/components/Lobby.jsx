import { useState, useEffect, useCallback, useRef } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'
import Avatar from './Avatar.jsx'
import { shortAddr, nick } from '../utils/format.js'

const POLL_MS = 4000

export default function Lobby({ roomId, myAddress, onLeave, onGameStarted, showToast }) {
  const gl = useGenLayer()
  const [room, setRoom] = useState(null)
  const [starting, setStarting] = useState(false)
  const myAddr = (myAddress || '').toLowerCase()

  const fetchRoom = useCallback(async () => {
    try {
      const r = await gl.getRoom(roomId)
      setRoom(r)
      return r
    } catch { return null }
  }, [gl, roomId])

  useEffect(() => {
    let alive = true
    async function poll() {
      if (!alive) return
      const r = await fetchRoom()
      if (r?.status === 'active') { onGameStarted(); return }
      if (alive) setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { alive = false }
  }, [fetchRoom, onGameStarted])

  async function handleStart() {
    setStarting(true)
    showToast('AI generating questions on-chain…')
    try {
      await gl.startGame(roomId)
      showToast('Game started!')
      onGameStarted()
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
      setStarting(false)
    }
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" />
        <p className="text-muted mt-16">Loading room…</p>
      </div>
    )
  }

  const players  = room.players ?? []
  const maxSlots = room.max_players ?? 10
  const amHost   = myAddr === (room.host || '').toLowerCase()
  const inviteUrl = `speed.click/r/${roomId}`

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-24" onClick={onLeave}>← LEAVE</button>

      <div className="lobby-grid">
        <div className="room-code-card">
          <div className="row-between" style={{ position: 'relative' }}>
            <span className="kicker">/ ROOM CODE</span>
            <span className="chip chip-amber">
              <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
              WAITING
            </span>
          </div>
          <div className="room-code-display">{roomId}</div>

          <div className="invite-bar">
            <span className="url">{inviteUrl}</span>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => { navigator.clipboard?.writeText(roomId); showToast('Room code copied') }}>
              COPY
            </button>
          </div>

          <div className="row gap-16 mt-24" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{room.total_rounds} rounds</span>
            <span className="chip">{players.length}/{maxSlots} joined</span>
            <span className="chip chip-accent">AI on Bradbury</span>
          </div>

          {amHost ? (
            <button
              className="btn btn-primary btn-lg mt-24"
              style={{ width: '100%' }}
              onClick={handleStart}
              disabled={starting || gl.loading || players.length < 2}
            >
              {(starting || gl.loading)
                ? <><span className="spinner" /> GENERATING QUESTIONS…</>
                : players.length < 2
                  ? `WAITING FOR PLAYERS · ${players.length}/2 MIN`
                  : `START GAME · ${players.length} PLAYERS`}
            </button>
          ) : (
            <div className="mt-24 center text-muted" style={{ fontSize: '0.85rem' }}>
              <span className="spinner" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
              Waiting for host to start the game…
            </div>
          )}
        </div>

        <div className="card">
          <div className="row-between mb-16">
            <span className="kicker">/ PLAYERS</span>
            <span className="mono text-muted" style={{ fontSize: '0.78rem' }}>{players.length}/{maxSlots}</span>
          </div>
          <div className="col gap-8">
            {Array.from({ length: maxSlots }).map((_, i) => {
              const addr = players[i]
              if (!addr) {
                return (
                  <div key={i} className="player-slot empty">
                    <span className="text-muted mono center" style={{ fontSize: '1rem' }}>—</span>
                    <span className="text-muted mono">empty slot</span>
                    <span />
                  </div>
                )
              }
              const me   = addr.toLowerCase() === myAddr
              const host = addr.toLowerCase() === (room.host || '').toLowerCase()
              return (
                <div key={addr} className={`player-slot anim-up${me ? ' me' : ''}${host ? ' host' : ''}`}>
                  <Avatar addr={addr} name={nick(addr)} />
                  <div>
                    <div className="name">{nick(addr)}{me ? ' · YOU' : ''}</div>
                    <div className="addr">{shortAddr(addr)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
