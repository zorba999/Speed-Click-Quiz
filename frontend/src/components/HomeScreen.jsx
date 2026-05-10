import { useState } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'

export default function HomeScreen({ onEnterRoom }) {
  const gl = useGenLayer()

  // Tabs: 'create' | 'join' | 'admin'
  const [tab, setTab] = useState('create')

  // Create room form
  const [roomId,     setRoomId]     = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [numRounds,  setNumRounds]  = useState(8)

  // Join form
  const [joinId, setJoinId] = useState('')

  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!roomId.trim()) return
    try {
      await gl.createRoom(roomId.trim(), maxPlayers, numRounds)
      showToast('Room created!')
      onEnterRoom(roomId.trim(), true)
    } catch (err) {
      showToast('Error: ' + (err?.message || 'unknown'))
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinId.trim()) return
    try {
      await gl.joinRoom(joinId.trim())
      showToast('Joined room!')
      onEnterRoom(joinId.trim(), false)
    } catch (err) {
      showToast('Error: ' + (err?.message || 'unknown'))
    }
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>⚡</div>
        <h1 className="section-title">Speed Click Quiz</h1>
        <p className="section-sub">
          Fast-paced multiplayer quiz powered by{' '}
          <span style={{ color: 'var(--accent)' }}>GenLayer Intelligent Contracts</span>
          {' & '}
          <span style={{ color: 'var(--primary-h)' }}>Optimistic Democracy</span>
        </p>
        <div className="flex gap-8 wrap" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <span className="badge badge-accent">Multiplayer</span>
          <span className="badge badge-primary">AI Questions</span>
          <span className="badge badge-warn">XP Leaderboard</span>
          <span className="badge badge-success">Dispute Resolution</span>
        </div>
      </div>

      {/* Feature chips */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            ['🧠', 'AI-Generated Questions', 'Unique questions per room, live via on-chain LLM'],
            ['⚖️', 'Optimistic Democracy', 'Dispute wrong answers with on-chain consensus'],
            ['🏎️', 'Speed Scoring', '1st correct = 100 XP, 2nd = 75, 3rd = 50…'],
            ['⚡', 'Instant Start', 'AI generates questions when game starts — no setup needed'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '1.4rem' }}>{icon}</span>
              <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{title}</span>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8" style={{ marginBottom: 16 }}>
        {[['create', '＋ Create Room'], ['join', '→ Join Room']].map(([t, label]) => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Create ── */}
      {tab === 'create' && (
        <div className="card">
          <div className="card-title">Create a New Room</div>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Room ID (unique name)</label>
              <input
                className="input"
                placeholder="e.g. genlayer-battle-42"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Max Players (2–10)</label>
                <input
                  className="input"
                  type="number" min={2} max={10}
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(+e.target.value)}
                />
              </div>
              <div className="field">
                <label>Rounds (5–10)</label>
                <input
                  className="input"
                  type="number" min={5} max={10}
                  value={numRounds}
                  onChange={e => setNumRounds(+e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full mt-12"
              disabled={gl.loading}
            >
              {gl.loading ? '⏳ Creating…' : '🚀 Create Room'}
            </button>
          </form>
        </div>
      )}

      {/* ── Join ── */}
      {tab === 'join' && (
        <div className="card">
          <div className="card-title">Join an Existing Room</div>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label>Room ID</label>
              <input
                className="input"
                placeholder="Enter the room ID"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-accent btn-full mt-12"
              disabled={gl.loading}
            >
              {gl.loading ? '⏳ Joining…' : '➡ Join Room'}
            </button>
          </form>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
