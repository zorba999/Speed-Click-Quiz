/* global React, Avatar, shortAddr, nick, MOCK_ADDRS, MOCK_LEADERBOARD, MOCK_QUESTIONS */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ═══════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════
function Leaderboard({ myAddress, onBack }) {
  const total = MOCK_LEADERBOARD.reduce((s, e) => s + e.xp, 0);
  const top = MOCK_LEADERBOARD[0]?.xp || 0;
  const avg = Math.round(total / MOCK_LEADERBOARD.length);

  return (
    <div>
      <div className="row-between mb-24">
        <div>
          <span className="kicker">/ GLOBAL LADDER · BRADBURY</span>
          <h1 className="display display-lg mt-12">Hall of speed.</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← HOME</button>
      </div>

      <div className="lb-stat-grid">
        <div className="lb-stat accent">
          <div className="label">// PLAYERS</div>
          <div className="num tabular">{MOCK_LEADERBOARD.length}</div>
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

      <div className="results-table">
        <div className="results-row head">
          <span>RANK</span>
          <span></span>
          <span>PLAYER</span>
          <span style={{ textAlign: 'right' }}>XP</span>
          <span style={{ textAlign: 'right' }}>STATUS</span>
        </div>
        {MOCK_LEADERBOARD.map((entry, i) => (
          <div key={entry.addr} className={`results-row r${i+1}`} style={{ background: entry.addr === myAddress ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : 'transparent' }}>
            <span className="rank-num">#{i+1}</span>
            <Avatar addr={entry.addr} name={nick(entry.addr)} size={32} />
            <div>
              <div className="name">
                {nick(entry.addr)}
                {entry.addr === myAddress && <span className="text-accent" style={{ marginLeft: 6 }}>· YOU</span>}
              </div>
              <div className="addr">{shortAddr(entry.addr)}</div>
            </div>
            <span className="xp">{entry.xp.toLocaleString()}</span>
            <span className="mono text-muted" style={{ textAlign: 'right', fontSize: '0.74rem' }}>
              {i === 0 ? 'CHAMPION' : i < 3 ? 'PODIUM' : 'ACTIVE'}
            </span>
          </div>
        ))}
      </div>

      <p className="center text-muted mt-16" style={{ fontSize: '0.78rem' }}>
        // Auto-syncs from on-chain state every 30s · last updated just now
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DISPUTE — AI Tribunal
// ═══════════════════════════════════════════════════════════════════════
function Dispute({ room, onBack, showToast }) {
  const [round, setRound] = useState(0);
  const [reason, setReason] = useState('');
  const [phase, setPhase] = useState('compose'); // compose | submitting | validating | verdict
  const [verdict, setVerdict] = useState(null);

  const validators = useMemo(() => [
    { name: 'val.bradbury.0x4F', state: 'thinking' },
    { name: 'val.bradbury.0xC1', state: 'thinking' },
    { name: 'val.bradbury.0xA8', state: 'thinking' },
    { name: 'val.bradbury.0x9E', state: 'thinking' },
    { name: 'val.bradbury.0x2D', state: 'thinking' },
  ], []);
  const [valStates, setValStates] = useState(validators);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setPhase('submitting');
    await new Promise(r => setTimeout(r, 1200));
    setPhase('validating');
    // animate validators reaching consensus
    for (let i = 0; i < validators.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setValStates(curr => curr.map((v, idx) => idx === i ? { ...v, state: i === 2 ? 'dissent' : 'agree' } : v));
    }
    await new Promise(r => setTimeout(r, 600));
    setVerdict({
      upheld: false,
      newAnswer: 0,
      explanation: 'After re-evaluation, the originally marked option is consistent with established sources. The dispute is dismissed; the original answer stands.',
    });
    setPhase('verdict');
  }

  const question = MOCK_QUESTIONS[0];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm mb-24" onClick={onBack}>← BACK</button>

      <span className="kicker">/ AI TRIBUNAL · OPTIMISTIC DEMOCRACY</span>
      <h1 className="display display-lg mt-12 mb-24">File a dispute.</h1>

      <div className="tribunal">
        <div className="tribunal-head">
          <div>
            <div className="kicker mb-8">/ DISPUTED QUESTION</div>
            <div className="display" style={{ fontSize: '1.1rem', maxWidth: 480 }}>"{question.q}"</div>
            <div className="text-muted mt-12 mono" style={{ fontSize: '0.78rem' }}>
              MARKED CORRECT: <span className="text-accent">[{String.fromCharCode(65+question.correct)}] {question.options[question.correct]}</span>
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
                {Array.from({ length: room?.rounds || 8 }).map((_, i) => (
                  <option key={i} value={i}>Round {i+1}</option>
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
              disabled={!reason.trim()}
              onClick={handleSubmit}
            >
              ⚖ SUBMIT TO TRIBUNAL
            </button>
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

            <div className="validator-row" style={{ justifyContent: 'center' }}>
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
              <div className={`verdict-orb ${verdict.upheld ? '' : 'upheld'}`} />
              <span className={`chip ${verdict.upheld ? 'chip-magenta' : 'chip-accent'}`}>
                VERDICT · {verdict.upheld ? 'OVERTURNED' : 'UPHELD'}
              </span>
              <h3 className="display display-md mt-12 mb-12">
                {verdict.upheld ? 'The original answer was wrong.' : 'The original answer stands.'}
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

            <button
              className="btn btn-primary btn-lg mt-24"
              style={{ width: '100%' }}
              onClick={onBack}
            >
              BACK TO RESULTS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Leaderboard, Dispute });
