import { useState } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'
import Stepper from './Stepper.jsx'

function generateCode() {
  const a = ['NEON','GLITCH','PULSE','VORTEX','CIPHER','PHOTON','VOLT','ECHO','NYX']
  const b = ['ORBIT','BATTLE','RIOT','SYNC','PIXEL','FROST','SPARK','RUSH']
  return a[Math.floor(Math.random()*a.length)] + '-' + b[Math.floor(Math.random()*b.length)] + '-' + Math.floor(Math.random()*99).toString().padStart(2,'0')
}

export default function CreateRoom({ onBack, onCreated, showToast }) {
  const gl = useGenLayer()
  const [code, setCode]       = useState(generateCode)
  const [players, setPlayers] = useState(6)
  const [rounds, setRounds]   = useState(8)

  async function handleCreate() {
    if (!code.trim()) return
    try {
      await gl.createRoom(code.trim(), players, rounds)
      showToast('Room created on-chain')
      onCreated({ code: code.trim(), players, rounds })
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm mb-24" onClick={onBack}>← BACK</button>
      <span className="kicker">/ NEW ROOM</span>
      <h1 className="display display-lg mt-12 mb-24">Spin up a game.</h1>

      <div className="card">
        <div className="field mb-16">
          <label className="field-label">Room code</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              className="input input-big"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, '-'))}
            />
            <button className="btn btn-ghost" type="button" onClick={() => setCode(generateCode())}>↻ ROLL</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label className="field-label">Max players · 2–10</label>
            <Stepper value={players} setValue={setPlayers} min={2} max={10} />
          </div>
          <div className="field">
            <label className="field-label">Rounds · 5–10</label>
            <Stepper value={rounds} setValue={setRounds} min={5} max={10} />
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 16, border: '1px dashed var(--line-2)', borderRadius: 10, background: 'var(--ink)' }}>
          <div className="kicker mb-12">/ TRANSACTION PREVIEW</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '0.82rem' }}>
            <span className="text-muted mono">METHOD</span>  <span className="mono">create_room</span>
            <span className="text-muted mono">CHAIN</span>   <span className="mono">Bradbury · 4221</span>
            <span className="text-muted mono">EST. GAS</span><span className="mono">~0.0008 GEN</span>
            <span className="text-muted mono">ARGS</span>    <span className="mono">"{code}", {players}, {rounds}</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: 18 }}
          disabled={gl.loading || !code.trim()}
          onClick={handleCreate}
        >
          {gl.loading ? <><span className="spinner" /> SIGNING…</> : 'CREATE ROOM ↗'}
        </button>
      </div>
    </div>
  )
}
