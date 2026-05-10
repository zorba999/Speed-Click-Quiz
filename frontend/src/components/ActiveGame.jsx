import { useState, useEffect, useRef, useCallback } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'
import Avatar from './Avatar.jsx'
import { shortAddr, nick } from '../utils/format.js'

const POLL_MS  = 4000
const LETTERS  = ['A', 'B', 'C', 'D']

function xpForPos(pos) { return Math.max(25, 100 - (pos - 1) * 25) }

// ── Race sidebar ──────────────────────────────────────────────────────────
function Race({ players, roundAnswers, scores, myAddress }) {
  const myAddr = (myAddress || '').toLowerCase()
  const submitted = players
    .filter(p => roundAnswers?.[p] !== undefined)
    .sort((a, b) => (roundAnswers[a]?.position ?? 99) - (roundAnswers[b]?.position ?? 99))
  const pending = players.filter(p => roundAnswers?.[p] === undefined)

  return (
    <div className="race">
      <div className="race-head">
        <h4>// LIVE RACE</h4>
        <span className="mono text-muted" style={{ fontSize: '0.72rem' }}>{submitted.length}/{players.length}</span>
      </div>
      <div className="race-list">
        {submitted.map((addr, i) => {
          const isMe = addr.toLowerCase() === myAddr
          return (
            <div key={addr} className={`race-row answered anim-up${isMe ? ' me' : ''}`}>
              <span className="race-rank">#{i + 1}</span>
              <Avatar addr={addr} name={nick(addr)} size={28} />
              <div>
                <div className="race-name">{nick(addr)}{isMe ? ' · YOU' : ''}</div>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>submitted</div>
              </div>
              <span className="race-score">{scores?.[addr] ?? 0}</span>
            </div>
          )
        })}
        {pending.map(addr => {
          const isMe = addr.toLowerCase() === myAddr
          return (
            <div key={addr} className="race-row" style={{ opacity: 0.55 }}>
              <span className="race-rank dim">—</span>
              <Avatar addr={addr} name={nick(addr)} size={28} />
              <div>
                <div className="race-name">{nick(addr)}{isMe ? ' · YOU' : ''}</div>
                <div className="race-pending">thinking…</div>
              </div>
              <span className="race-score" style={{ color: 'var(--muted)' }}>{scores?.[addr] ?? 0}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function ActiveGame({ roomId, myAddress, onFinished, onLeave, showToast }) {
  const gl = useGenLayer()
  const myAddr = (myAddress || '').toLowerCase()

  const [room,          setRoom]          = useState(null)
  const [question,      setQuestion]      = useState(null)
  const [myAnswer,      setMyAnswer]      = useState(null)
  const [myPosition,    setMyPosition]    = useState(null)
  const [timer,         setTimer]         = useState(30)
  const [actionLoading, setActionLoading] = useState(false)

  const prevRoundRef = useRef(null)
  const timerRef     = useRef(null)

  // ── Fetch room ──────────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    try {
      const r = await gl.getRoom(roomId)
      setRoom(r)
      return r
    } catch { return null }
  }, [gl, roomId])

  // ── Fetch question (with 1 retry) ───────────────────────────────────────
  const fetchQuestion = useCallback(async () => {
    try {
      const q = await gl.getCurrentQuestion(roomId)
      setQuestion(q)
    } catch {
      await new Promise(res => setTimeout(res, 1500))
      try {
        const q = await gl.getCurrentQuestion(roomId)
        setQuestion(q)
      } catch { setQuestion(null) }
    }
  }, [gl, roomId])

  // ── Polling loop ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function poll() {
      if (!alive) return
      const r = await fetchRoom()
      if (!r) { if (alive) setTimeout(poll, POLL_MS); return }
      if (r.status === 'finished' || r.status === 'ended') { onFinished(roomId); return }
      if (r.status === 'active') {
        const roundChanged = r.current_round !== prevRoundRef.current
        if (roundChanged) {
          prevRoundRef.current = r.current_round
          setMyAnswer(null)
          setMyPosition(null)
          setTimer(30)
          await fetchQuestion()
        }
      }
      if (alive) setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { alive = false }
  }, [fetchRoom, fetchQuestion, onFinished, roomId])

  // ── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || room.status !== 'active') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.status, room?.current_round])

  // ── Submit answer ───────────────────────────────────────────────────────
  async function handleAnswer(idx) {
    if (myAnswer !== null) return
    setMyAnswer(idx)
    try {
      await gl.submitAnswer(roomId, idx)
      const r = await fetchRoom()
      if (r) {
        const myKey = Object.keys(r.round_answers || {}).find(k => k.toLowerCase() === myAddr)
        if (myKey) setMyPosition(r.round_answers[myKey].position)
      }
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
      setMyAnswer(null)
    }
  }

  // ── Keyboard A/B/C/D + 1/2/3/4 ─────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (myAnswer !== null) return
      const map = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 }
      const idx = map[e.key.toLowerCase()]
      if (idx !== undefined) handleAnswer(idx)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Finalize round (host only) ──────────────────────────────────────────
  async function handleFinalize() {
    setActionLoading(true)
    try {
      await gl.finalizeRound(roomId)
      showToast('Round finalized!')
      const r = await fetchRoom()
      if (r && r.status === 'active') {
        prevRoundRef.current = r.current_round
        setMyAnswer(null)
        setMyPosition(null)
        setTimer(30)
        await new Promise(res => setTimeout(res, 800))
        await fetchQuestion()
      }
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    } finally { setActionLoading(false) }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" />
        <p className="text-muted mt-16">Loading game…</p>
      </div>
    )
  }

  const players      = room.players ?? []
  const amHost       = myAddr === (room.host || '').toLowerCase()
  const roundAnswers = room.round_answers ?? {}
  const answeredCount = Object.keys(roundAnswers).length
  const alreadyAnswered = myAnswer !== null
    || Object.keys(roundAnswers).some(k => k.toLowerCase() === myAddr)

  const currentRound = room.current_round ?? 0
  const totalRounds  = room.total_rounds ?? 0

  return (
    <div>
      <div className="row-between mb-16">
        <button className="btn btn-ghost btn-sm" onClick={onLeave}>← LEAVE</button>
        <span className="chip chip-accent mono">{roomId}</span>
      </div>

      <div className="timer-mega">
        <div>
          <div className="kicker mb-8">/ TIME</div>
          <div className={`timer-mega-num${timer <= 5 ? ' danger' : ''}`}>
            {String(timer).padStart(2, '0')}
            <span style={{ fontSize: '0.4em', opacity: 0.6, marginLeft: 6 }}>s</span>
          </div>
        </div>
        <div className="timer-mega-meta">
          <span className="kicker">/ ROUND</span>
          <span className="timer-mega-rounds display" style={{ fontSize: '1.6rem' }}>
            {String(currentRound + 1).padStart(2, '0')} <span className="text-muted">/ {String(totalRounds).padStart(2, '0')}</span>
          </span>
          <span className="mono text-muted" style={{ fontSize: '0.72rem' }}>{answeredCount}/{players.length} answered</span>
        </div>
        <div className={`timer-progress${timer <= 5 ? ' danger' : ''}`} style={{ width: `${(timer / 30) * 100}%` }} />
      </div>

      <div className="game-shell">
        <div>
          {question ? (
            <div className="q-card anim-up" key={currentRound}>
              <div className="q-meta">
                <span className="chip">{question.category}</span>
                <span className={`chip ${question.difficulty === 'easy' ? 'chip-accent' : question.difficulty === 'medium' ? 'chip-amber' : 'chip-magenta'}`}>
                  {question.difficulty}
                </span>
                <span className="chip mono">Q{currentRound + 1}</span>
              </div>
              <p className="q-text">{question.q}</p>

              <div className="answers">
                {(question.options ?? []).map((opt, i) => {
                  let cls = 'answer'
                  if (myAnswer !== null) cls += myAnswer === i ? ' selected' : ' locked-other'
                  return (
                    <button
                      key={i}
                      className={cls}
                      disabled={alreadyAnswered}
                      onClick={() => handleAnswer(i)}
                    >
                      <span className="answer-key">{LETTERS[i]}</span>
                      <span>{opt}</span>
                      <span className="kbd-hint">{i + 1}</span>
                    </button>
                  )
                })}
              </div>

              {alreadyAnswered && (
                <div className="speed-readout anim-pop">
                  {myPosition ? (
                    <>
                      <div>
                        <div className="speed-pos">#{myPosition}<sup></sup></div>
                      </div>
                      <div>
                        <div className="speed-label">YOUR POSITION ON-CHAIN</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Tx accepted · awaiting reveal</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="speed-label">IF CORRECT</div>
                        <div className="speed-bonus">+{xpForPos(myPosition)} XP</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="spinner" />
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Answer submitted · waiting for on-chain confirmation…</span>
                    </div>
                  )}
                </div>
              )}

              {amHost && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                  <div className="kicker mb-12">/ HOST CONTROLS</div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={actionLoading || gl.loading}
                    onClick={handleFinalize}
                  >
                    {(actionLoading || gl.loading)
                      ? <><span className="spinner" /> FINALIZING…</>
                      : `FINALIZE ROUND ${currentRound + 1} →`}
                  </button>
                  <p className="text-muted mt-12" style={{ fontSize: '0.78rem' }}>
                    // Finalize when all players have answered or time is up.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="q-card" style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner" />
              <p className="text-muted mt-16">Loading question…</p>
            </div>
          )}
        </div>

        <Race
          players={players}
          roundAnswers={roundAnswers}
          scores={room.scores}
          myAddress={myAddress}
        />
      </div>
    </div>
  )
}
