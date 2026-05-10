import { useState, useEffect, useRef, useCallback } from 'react'
import { useGenLayer } from '../hooks/useGenLayer.js'

const LETTERS = ['A', 'B', 'C', 'D']
const POLL_MS  = 4000

function shortAddr(addr) {
  if (!addr) return '???'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerChip({ addr, score, isMe, isHost }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: isMe ? '#6c63ff22' : 'var(--surface2)',
        border: `1px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 8, gap: 10,
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '.82rem', color: isMe ? 'var(--primary-h)' : 'var(--muted)' }}>
        {shortAddr(addr)}{isMe ? ' (you)' : ''}{isHost ? ' 👑' : ''}
      </span>
      <span className="score-pill">{score ?? 0} XP</span>
    </div>
  )
}

function TimerBar({ seconds, max }) {
  const pct = Math.max(0, (seconds / max) * 100)
  return (
    <div className="timer-bar">
      <div
        className={`timer-fill${seconds <= 5 ? ' danger' : ''}`}
        style={{ width: pct + '%' }}
      />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function GameRoom({ roomId, isHost, myAddress, onLeave }) {
  const gl = useGenLayer()

  const [room,          setRoom]          = useState(null)
  const [question,      setQuestion]      = useState(null)
  const [myAnswer,      setMyAnswer]      = useState(null)   // index I submitted
  const [timer,         setTimer]         = useState(30)
  const [disputeRound,  setDisputeRound]  = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeMsg,    setDisputeMsg]    = useState('')
  const [toast,         setToast]         = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const prevRoundRef = useRef(null)
  const timerRef     = useRef(null)

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Fetch room state ────────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    try {
      const r = await gl.getRoom(roomId)
      setRoom(r)
      return r
    } catch { return null }
  }, [gl, roomId])

  // ── Fetch current question (with 1 auto-retry on failure) ───────────────────
  const fetchQuestion = useCallback(async () => {
    try {
      const q = await gl.getCurrentQuestion(roomId)
      setQuestion(q)
    } catch {
      // Contract state may not be settled yet — retry once after a short delay
      await new Promise(res => setTimeout(res, 1500))
      try {
        const q = await gl.getCurrentQuestion(roomId)
        setQuestion(q)
      } catch { setQuestion(null) }
    }
  }, [gl, roomId])

  // ── Polling loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function poll() {
      if (!alive) return
      const r = await fetchRoom()
      if (r?.status === 'active') {
        const roundChanged = r.current_round !== prevRoundRef.current
        if (roundChanged) {
          prevRoundRef.current = r.current_round
          setMyAnswer(null)
          setTimer(30)
          await fetchQuestion()
        }
      }
      if (alive) setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { alive = false }
  }, [fetchRoom, fetchQuestion])

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (room?.status !== 'active') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.status, room?.current_round])

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleStart() {
    setActionLoading(true)
    try {
      await gl.startGame(roomId)
      showToast('Game started!')
      await fetchRoom()
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    } finally { setActionLoading(false) }
  }

  async function handleAnswer(idx) {
    if (myAnswer !== null) return
    setMyAnswer(idx)
    try {
      await gl.submitAnswer(roomId, idx)
    } catch (e) {
      showToast('Error submitting: ' + (e?.message || 'unknown'))
      setMyAnswer(null)
    }
  }

  async function handleFinalize() {
    setActionLoading(true)
    try {
      await gl.finalizeRound(roomId)
      showToast('Round finalized!')
      const r = await fetchRoom()
      // Reset round tracking so poll AND host both fetch the new question
      if (r && r.status === 'active') {
        prevRoundRef.current = r.current_round
        setMyAnswer(null)
        setTimer(30)
        // Small delay to let contract state settle, then fetch question
        await new Promise(res => setTimeout(res, 800))
        await fetchQuestion()
      }
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    } finally { setActionLoading(false) }
  }

  async function handleDistributeXP() {
    setActionLoading(true)
    try {
      await gl.distributeXP(roomId)
      showToast('XP distributed to leaderboard!')
      await fetchRoom()
    } catch (e) {
      showToast('Error: ' + (e?.message || 'unknown'))
    } finally { setActionLoading(false) }
  }

  async function handleDispute(e) {
    e.preventDefault()
    if (disputeRound === null || !disputeReason.trim()) return
    setDisputeMsg('Submitting dispute to Optimistic Democracy validators…')
    try {
      await gl.disputeQuestion(roomId, disputeRound, disputeReason)
      setDisputeMsg('Dispute resolved! Check results for updated answer.')
      setDisputeReason('')
      await fetchRoom()
    } catch (err) {
      setDisputeMsg('Error: ' + (err?.message || 'unknown'))
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Loading room…</p>
      </div>
    )
  }

  const myAddr  = (myAddress || '').toLowerCase()
  const amHost   = myAddr === (room.host || '').toLowerCase()
  const myScore  = room.scores?.[myAddress] ?? room.scores?.[myAddr] ?? 0
  const players  = room.players ?? []
  const answeredCount = Object.keys(room.round_answers ?? {}).length

  // ══════════════════════════════════════════════════════════════════════════
  //  WAITING LOBBY
  // ══════════════════════════════════════════════════════════════════════════
  if (room.status === 'waiting') {
    return (
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="room-active-indicator" />
            Room: <span style={{ color: 'var(--accent)' }}>{roomId}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="badge badge-primary">Rounds: {room.total_rounds}</span>
            <span className="badge badge-accent">Max {room.max_players} players</span>
            <span className="badge badge-warn">🤖 AI Questions</span>
          </div>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: 20 }}>
            Waiting for players… Share the room ID <strong style={{ color: 'var(--text)' }}>{roomId}</strong> with your friends.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {players.map(p => (
              <PlayerChip
                key={p}
                addr={p}
                score={room.scores?.[p] ?? 0}
                isMe={p.toLowerCase() === myAddr}
                isHost={p.toLowerCase() === (room.host || '').toLowerCase()}
              />
            ))}
          </div>

          {amHost && (
            <button
              className="btn btn-primary btn-full"
              disabled={players.length < 2 || actionLoading || gl.loading}
              onClick={handleStart}
            >
              {actionLoading || gl.loading
                ? '⏳ Starting…'
                : players.length < 2
                  ? `Waiting for more players (${players.length}/2 min)`
                  : `🚀 Start Game (${players.length} players)`
              }
            </button>
          )}
          {!amHost && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
              Waiting for the host to start…
            </p>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLeave}>← Leave Room</button>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ACTIVE GAME
  // ══════════════════════════════════════════════════════════════════════════
  if (room.status === 'active') {
    const alreadyAnswered = room.round_answers?.[myAddress] !== undefined
      || room.round_answers?.[myAddr] !== undefined
      || myAnswer !== null

    return (
      <div>
        {/* Header bar */}
        <div className="card" style={{ marginBottom: 12, padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Round {(room.current_round ?? 0) + 1} / {room.total_rounds}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                {answeredCount}/{players.length} answered
              </span>
              <span
                style={{
                  fontSize: '1.1rem', fontWeight: 700,
                  color: timer <= 5 ? 'var(--danger)' : timer <= 10 ? 'var(--warn)' : 'var(--accent)',
                }}
              >
                ⏱ {timer}s
              </span>
            </div>
          </div>
          <TimerBar seconds={timer} max={30} />
        </div>

        {/* Question card */}
        {question ? (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-accent">{question.category}</span>
              <span className={`badge badge-${question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warn' : 'danger'}`}>
                {question.difficulty}
              </span>
            </div>
            <p className="q-text">{question.q}</p>

            <div className="answer-grid">
              {(question.options ?? []).map((opt, i) => {
                let cls = 'answer-btn'
                if (alreadyAnswered) {
                  if (myAnswer === i) cls += ' selected'
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    disabled={alreadyAnswered}
                    onClick={() => handleAnswer(i)}
                  >
                    <span className="answer-letter">{LETTERS[i]}</span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {alreadyAnswered && (
              <p style={{ marginTop: 14, textAlign: 'center', fontSize: '.85rem', color: 'var(--success)' }}>
                ✅ Answer submitted! Waiting for others…
              </p>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>Loading question…</p>
          </div>
        )}

        {/* Scores sidebar */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Live Scores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players
              .slice()
              .sort((a, b) => (room.scores?.[b] ?? 0) - (room.scores?.[a] ?? 0))
              .map(p => (
                <PlayerChip
                  key={p}
                  addr={p}
                  score={room.scores?.[p] ?? 0}
                  isMe={p === myAddress}
                  isHost={p === room.host}
                />
              ))}
          </div>
        </div>

        {/* Host controls */}
        {amHost && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Host Controls</div>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 12 }}>
              Finalize the round when all players have answered or time is up.
            </p>
            <button
              className="btn btn-accent btn-full"
              disabled={actionLoading || gl.loading}
              onClick={handleFinalize}
            >
              {actionLoading || gl.loading ? '⏳ Finalizing…' : `⚡ Finalize Round ${(room.current_round ?? 0) + 1}`}
            </button>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" onClick={onLeave}>← Leave</button>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FINISHED — scores ready, XP not yet distributed
  // ══════════════════════════════════════════════════════════════════════════
  if (room.status === 'finished') {
    const sorted = players
      .slice()
      .sort((a, b) => (room.scores?.[b] ?? 0) - (room.scores?.[a] ?? 0))

    return (
      <div>
        <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏁</div>
          <div className="section-title">Game Over!</div>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            All rounds complete. Final leaderboard below.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {sorted.map((addr, i) => (
              <div
                key={addr}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: addr === myAddress ? '#6c63ff18' : 'var(--surface2)',
                  border: `1px solid ${addr === myAddress ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.9rem',
                    background: i === 0 ? '#ffd70033' : i === 1 ? '#c0c0c033' : i === 2 ? '#cd7f3233' : 'var(--surface)',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--muted)',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '.85rem', color: addr === myAddress ? 'var(--primary-h)' : 'var(--text)' }}>
                  {shortAddr(addr)}{addr === myAddress ? ' (you)' : ''}{addr === room.host ? ' 👑' : ''}
                </span>
                <span className="score-pill" style={{ fontSize: '1rem' }}>{room.scores?.[addr] ?? 0} XP</span>
              </div>
            ))}
          </div>

          {amHost && (
            <button
              className="btn btn-success btn-full"
              disabled={actionLoading || gl.loading}
              onClick={handleDistributeXP}
            >
              {actionLoading || gl.loading ? '⏳ Distributing…' : '🎁 Distribute XP to Leaderboard'}
            </button>
          )}
          {!amHost && <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Waiting for host to distribute XP…</p>}
        </div>

        {/* Dispute panel */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">⚖️ Dispute a Question (Optimistic Democracy)</div>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 14 }}>
            Think a correct answer was wrong? Submit a dispute — GenLayer validators will re-run the AI arbiter and reach on-chain consensus.
          </p>
          <form onSubmit={handleDispute}>
            <div className="field">
              <label>Round to dispute (0 = round 1)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={(room.total_rounds ?? 1) - 1}
                value={disputeRound ?? ''}
                onChange={e => setDisputeRound(+e.target.value)}
                placeholder="Round index (e.g. 0)"
              />
            </div>
            <div className="field">
              <label>Reason</label>
              <input
                className="input"
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Why do you think the answer was wrong?"
              />
            </div>
            <button
              type="submit"
              className="btn btn-danger btn-full"
              disabled={disputeRound === null || !disputeReason.trim() || gl.loading}
            >
              {gl.loading ? '⏳ Submitting dispute…' : '⚖️ Submit Dispute'}
            </button>
            {disputeMsg && (
              <p style={{ marginTop: 10, fontSize: '.82rem', color: 'var(--warn)' }}>{disputeMsg}</p>
            )}
          </form>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={onLeave}>← Back to Home</button>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ENDED — XP already distributed
  // ══════════════════════════════════════════════════════════════════════════
  if (room.status === 'ended') {
    const sorted = players
      .slice()
      .sort((a, b) => (room.scores?.[b] ?? 0) - (room.scores?.[a] ?? 0))

    return (
      <div>
        <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
          <div className="section-title">XP Distributed!</div>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Scores have been committed to the on-chain leaderboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((addr, i) => (
              <div
                key={addr}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: addr === myAddress ? '#6c63ff18' : 'var(--surface2)',
                  border: `1px solid ${addr === myAddress ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                    background: i === 0 ? '#ffd70033' : i === 1 ? '#c0c0c033' : i === 2 ? '#cd7f3233' : 'var(--surface)',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--muted)',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '.85rem', color: addr === myAddress ? 'var(--primary-h)' : 'var(--text)' }}>
                  {shortAddr(addr)}{addr === myAddress ? ' (you)' : ''}{addr === room.host ? ' 👑' : ''}
                </span>
                <span className="score-pill" style={{ fontSize: '1rem' }}>{room.scores?.[addr] ?? 0} XP</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={onLeave}>
          🏠 Back to Home
        </button>
      </div>
    )
  }

  // Fallback
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Unknown room state: {room.status}</p>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onLeave}>← Leave</button>
    </div>
  )
}
