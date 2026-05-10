import { useState } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'

export default function JoinRoom({ onBack, onJoined, showToast }) {
  const gl = useGenLayer()
  const [code, setCode] = useState('')

  async function handleJoin() {
    if (!code.trim()) return
    try {
      await gl.joinRoom(code.trim())
      showToast('Joined room')
      onJoined({ code: code.trim() })
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm mb-24" onClick={onBack}>← BACK</button>
      <span className="kicker">/ JOIN A GAME</span>
      <h1 className="display display-lg mt-12 mb-24">Drop the code.</h1>

      <div className="card">
        <div className="field mb-16">
          <label className="field-label">Room code</label>
          <input
            autoFocus
            className="input input-big"
            placeholder="GLITCH-NEON-42"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>
        <button
          className="btn btn-magenta btn-lg"
          style={{ width: '100%' }}
          disabled={gl.loading || !code.trim()}
          onClick={handleJoin}
        >
          {gl.loading ? <><span className="spinner" /> JOINING…</> : 'JOIN ROOM →'}
        </button>
      </div>
    </div>
  )
}
