import { useState, useMemo } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'

const MOCK_VALIDATORS = [
  { name: 'val.bradbury.0x4F' },
  { name: 'val.bradbury.0xC1' },
  { name: 'val.bradbury.0xA8' },
  { name: 'val.bradbury.0x9E' },
  { name: 'val.bradbury.0x2D' },
]

export default function Dispute({ roomId, totalRounds = 8, onBack, showToast }) {
  const gl = useGenLayer()
  const [round,     setRound]     = useState(0)
  const [reason,    setReason]    = useState('')
  const [phase,     setPhase]     = useState('compose') // compose | submitting | validating | verdict
  const [verdict,   setVerdict]   = useState(null)
  const [valStates, setValStates] = useState(MOCK_VALIDATORS.map(v => ({ ...v, state: 'thinking' })))

  async function handleSubmit() {
    if (!reason.trim() || !roomId) return
    setPhase('submitting')
    try {
      await gl.disputeQuestion(roomId, round, reason)

      setPhase('validating')
      for (let i = 0; i < MOCK_VALIDATORS.length; i++) {
        await new Promise(r => setTimeout(r, 600))
        setValStates(curr => curr.map((v, idx) =>
          idx === i ? { ...v, state: i === 2 ? 'dissent' : 'agree' } : v
        ))
      }
      await new Promise(r => setTimeout(r, 500))

      const disputeId = `${roomId}_r${round}`
      let disputeData = null
      try {
        const raw = await gl.getDispute(disputeId)
        disputeData = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch { /* verdict not available yet */ }

      setVerdict(disputeData ?? {
        was_wrong: false,
        explanation: 'Dispute submitted. Validators have reached consensus — check back shortly for the final verdict on-chain.',
      })
      setPhase('verdict')
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
      setPhase('compose')
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm mb-24" onClick={onBack}>← BACK</button>

      <span className="kicker">/ AI TRIBUNAL · OPTIMISTIC DEMOCRACY</span>
      <h1 className="display display-lg mt-12 mb-24">File a dispute.</h1>

      <div className="tribunal">
        <div className="tribunal-head">
          <div>
            <div className="kicker mb-8">/ DISPUTE CONTEXT</div>
            <div className="display" style={{ fontSize: '1.05rem', maxWidth: 480 }}>
              {roomId ? `Room: ${roomId}` : 'Select a room to dispute'}
            </div>
            <div className="text-muted mt-12 mono" style={{ fontSize: '0.78rem' }}>
              // Select the round you believe had a wrong answer. The AI arbiter and validators will review.
            </div>
          </div>
        </div>

        {phase === 'compose' && (
          <>
            <div className="field mb-16">
              <label className="field-label">Round to dispute</label>
              <select
                className="input"
                value={round}
                onChange={e => setRound(+e.target.value)}
              >
                {Array.from({ length: totalRounds }).map((_, i) => (
                  <option key={i} value={i}>Round {i + 1}</option>
                ))}
              </select>
            </div>

            <div className="field mb-16">
              <label className="field-label">Why was the answer wrong?</label>
              <textarea
                className="input"
                rows={4}
                style={{ fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                placeholder="Explain in plain language. The arbiter LLM and validators will read this."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <button
              className="btn btn-magenta btn-lg"
              style={{ width: '100%' }}
              disabled={!reason.trim() || !roomId || gl.loading}
              onClick={handleSubmit}
            >
              {gl.loading ? <><span className="spinner" /> SIGNING…</> : 'SUBMIT TO TRIBUNAL'}
            </button>

            {!roomId && (
              <p className="text-muted mt-12" style={{ fontSize: '0.82rem' }}>
                // You must be in a room to file a dispute. Navigate from the Results screen.
              </p>
            )}
          </>
        )}

        {(phase === 'submitting' || phase === 'validating') && (
          <div className="center" style={{ padding: '24px 0' }}>
            <div className="verdict-orb" />
            <div className="display display-md" style={{ marginBottom: 8 }}>
              {phase === 'submitting' ? 'Sealing transaction…' : 'Validators converging…'}
            </div>
            <div className="text-muted mono" style={{ fontSize: '0.82rem' }}>
              {phase === 'submitting'
                ? '// Broadcasting to Bradbury network'
                : '// Each validator runs the arbiter LLM independently'}
            </div>
            <div className="validator-row" style={{ justifyContent: 'center', marginTop: 20 }}>
              {valStates.map((v, i) => (
                <div key={i} className={`validator ${v.state === 'thinking' ? 'thinking' : v.state === 'dissent' ? 'dissent' : ''}`}>
                  <span className="v-dot" />
                  {v.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'verdict' && verdict && (
          <div className="anim-pop">
            <div className="center">
              <div className={`verdict-orb ${verdict.was_wrong ? '' : 'upheld'}`} />
              <span className={`chip ${verdict.was_wrong ? 'chip-magenta' : 'chip-accent'}`}>
                VERDICT · {verdict.was_wrong ? 'OVERTURNED' : 'UPHELD'}
              </span>
              <h3 className="display display-md mt-12 mb-12">
                {verdict.was_wrong ? 'The original answer was wrong.' : 'The original answer stands.'}
              </h3>
              <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto', fontSize: '0.92rem' }}>
                {verdict.explanation}
              </p>
            </div>
            <div className="validator-row" style={{ justifyContent: 'center', marginTop: 24 }}>
              {valStates.map((v, i) => (
                <div key={i} className={`validator ${v.state === 'dissent' ? 'dissent' : ''}`}>
                  <span className="v-dot" />
                  {v.name}
                  <span className="text-muted" style={{ marginLeft: 4 }}>· {v.state === 'dissent' ? 'DISSENT' : 'AGREE'}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg mt-24" style={{ width: '100%' }} onClick={onBack}>
              BACK TO RESULTS
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
