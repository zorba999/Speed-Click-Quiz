/* global React, Avatar, shortAddr, nick, MOCK_ADDRS, MOCK_QUESTIONS */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ═══════════════════════════════════════════════════════════════════════
// GAME — active round
// ═══════════════════════════════════════════════════════════════════════
function ActiveGame({ room, myAddress, onFinishGame, onLeave, showToast }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('answering'); // answering | reveal
  const [timer, setTimer] = useState(30);
  const [myAnswer, setMyAnswer] = useState(null);
  const [myPosition, setMyPosition] = useState(null);

  // simulated other-players answers (position order)
  const [submissions, setSubmissions] = useState([]); // [{addr, answer, position}]
  const [scores, setScores] = useState(() => {
    const s = {};
    s[myAddress] = 0;
    MOCK_ADDRS.slice(1, 4).forEach(a => s[a] = 0);
    return s;
  });

  const players = useMemo(() => Object.keys(scores), [scores]);

  const question = MOCK_QUESTIONS[round % MOCK_QUESTIONS.length];

  // Countdown
  useEffect(() => {
    if (phase !== 'answering') return;
    if (timer <= 0) { setPhase('reveal'); return; }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, phase]);

  // Simulate other players submitting
  useEffect(() => {
    if (phase !== 'answering') return;
    const others = MOCK_ADDRS.slice(1, 4);
    others.forEach((addr, idx) => {
      const delay = 3000 + idx * 2400 + Math.random()*2000;
      const t = setTimeout(() => {
        setSubmissions(curr => {
          if (curr.find(s => s.addr === addr)) return curr;
          // 75% chance correct
          const ans = Math.random() < 0.75 ? question.correct : (question.correct + 1 + Math.floor(Math.random()*3)) % 4;
          return [...curr, { addr, answer: ans, position: curr.length + 1 }];
        });
      }, delay);
      return () => clearTimeout(t);
    });
  }, [phase, round, question.correct]);

  function handleAnswer(idx) {
    if (myAnswer !== null || phase !== 'answering') return;
    setMyAnswer(idx);
    setSubmissions(curr => {
      const pos = curr.length + 1;
      setMyPosition(pos);
      return [...curr, { addr: myAddress, answer: idx, position: pos }];
    });
    showToast(`Locked in · position #${(submissions.length + 1)}`);
  }

  // Keyboard A/B/C/D
  useEffect(() => {
    function onKey(e) {
      const map = { a:0, b:1, c:2, d:3, '1':0, '2':1, '3':2, '4':3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined) handleAnswer(idx);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Auto-finalize after all answered or timer 0
  useEffect(() => {
    if (phase === 'answering' && (submissions.length >= players.length || timer <= 0)) {
      const t = setTimeout(() => setPhase('reveal'), 600);
      return () => clearTimeout(t);
    }
  }, [submissions.length, players.length, timer, phase]);

  // After reveal, advance
  function nextRound() {
    // tally scores
    const newScores = { ...scores };
    let correctCount = 0;
    submissions
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach(s => {
        if (s.answer === question.correct) {
          correctCount++;
          const pts = Math.max(25, 100 - (correctCount - 1) * 25);
          newScores[s.addr] = (newScores[s.addr] || 0) + pts;
        }
      });
    setScores(newScores);

    if (round + 1 >= room.rounds) {
      onFinishGame(newScores, players);
    } else {
      setRound(round + 1);
      setMyAnswer(null);
      setMyPosition(null);
      setSubmissions([]);
      setTimer(30);
      setPhase('answering');
    }
  }

  const xpForPosition = (pos) => Math.max(25, 100 - (pos - 1) * 25);

  return (
    <div>
      <div className="row-between mb-16">
        <button className="btn btn-ghost btn-sm" onClick={onLeave}>← LEAVE</button>
        <span className="chip chip-accent mono">{room.code}</span>
      </div>

      <div className="timer-mega">
        <div>
          <div className="kicker mb-8">/ TIME</div>
          <div className={`timer-mega-num ${timer <= 5 ? 'danger' : ''}`}>
            {String(timer).padStart(2, '0')}
            <span style={{ fontSize: '0.4em', opacity: 0.6, marginLeft: 6 }}>s</span>
          </div>
        </div>
        <div className="timer-mega-meta">
          <span className="kicker">/ ROUND</span>
          <span className="timer-mega-rounds display" style={{ fontSize: '1.6rem' }}>
            {String(round + 1).padStart(2,'0')} <span className="text-muted">/ {String(room.rounds).padStart(2,'0')}</span>
          </span>
        </div>
        <div className={`timer-progress ${timer <= 5 ? 'danger' : ''}`} style={{ width: `${(timer / 30) * 100}%` }} />
      </div>

      <div className="game-shell">
        <div>
          <div className="q-card anim-up" key={round}>
            <div className="q-meta">
              <span className="chip">{question.category}</span>
              <span className={`chip ${question.difficulty === 'easy' ? 'chip-accent' : question.difficulty === 'medium' ? 'chip-amber' : 'chip-magenta'}`}>
                {question.difficulty}
              </span>
              <span className="chip mono">Q{round + 1}</span>
            </div>
            <p className="q-text">{question.q}</p>

            <div className="answers">
              {question.options.map((opt, i) => {
                const selected = myAnswer === i;
                let cls = 'answer';
                if (phase === 'reveal') {
                  if (i === question.correct) cls += ' correct';
                  else if (selected) cls += ' wrong';
                  else cls += ' locked-other';
                } else if (myAnswer !== null) {
                  cls += selected ? ' selected' : ' locked-other';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    disabled={myAnswer !== null || phase !== 'answering'}
                    onClick={() => handleAnswer(i)}
                  >
                    <span className="answer-key">{['A','B','C','D'][i]}</span>
                    <span>{opt}</span>
                    <span className="kbd-hint">↵ {i+1}</span>
                  </button>
                );
              })}
            </div>

            {myAnswer !== null && phase === 'answering' && (
              <div className="speed-readout anim-pop">
                <div>
                  <div className="speed-pos">#{myPosition}<sup></sup></div>
                </div>
                <div>
                  <div className="speed-label">YOUR POSITION ON-CHAIN</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                    Tx accepted · awaiting reveal
                  </div>
                </div>
                <div className="text-right">
                  <div className="speed-label">IF CORRECT</div>
                  <div className="speed-bonus">+{xpForPosition(myPosition)} XP</div>
                </div>
              </div>
            )}

            {phase === 'reveal' && (
              <div className="speed-readout anim-pop" style={{ borderColor: 'var(--acid)' }}>
                <div className="speed-pos" style={{ color: 'var(--acid)', fontSize: '2rem' }}>
                  {myAnswer === question.correct ? '✓' : '✗'}
                </div>
                <div>
                  <div className="speed-label">CORRECT ANSWER</div>
                  <div className="display" style={{ fontSize: '1.05rem', marginTop: 4 }}>
                    {String.fromCharCode(65 + question.correct)} · {question.options[question.correct]}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={nextRound}>
                  {round + 1 >= room.rounds ? 'SEE RESULTS →' : 'NEXT ROUND →'}
                </button>
              </div>
            )}
          </div>
        </div>

        <Race players={players} submissions={submissions} scores={scores} myAddress={myAddress} question={question} phase={phase} />
      </div>
    </div>
  );
}

function Race({ players, submissions, scores, myAddress, question, phase }) {
  // Build display list ordered by submission position; un-answered at bottom
  const submitted = submissions.slice().sort((a, b) => a.position - b.position);
  const submittedAddrs = new Set(submitted.map(s => s.addr));
  const pending = players.filter(p => !submittedAddrs.has(p));

  return (
    <div className="race">
      <div className="race-head">
        <h4>// LIVE RACE</h4>
        <span className="mono text-muted" style={{ fontSize: '0.72rem' }}>{submissions.length}/{players.length}</span>
      </div>
      <div className="race-list">
        {submitted.map((s, i) => {
          const correct = phase === 'reveal' && s.answer === question.correct;
          const wrong = phase === 'reveal' && s.answer !== question.correct;
          return (
            <div key={s.addr} className={`race-row answered ${s.addr === myAddress ? 'me' : ''} anim-up`}>
              <span className={`race-rank ${wrong ? 'dim' : ''}`}>#{i+1}</span>
              <Avatar addr={s.addr} name={nick(s.addr)} size={28} />
              <div>
                <div className="race-name">{nick(s.addr)}{s.addr === myAddress ? ' · YOU' : ''}</div>
                <div className="mono" style={{ fontSize: '0.68rem', color: correct ? 'var(--acid)' : wrong ? 'var(--accent-2)' : 'var(--muted)' }}>
                  {phase === 'reveal'
                    ? (correct ? `+${Math.max(25, 100 - i*25)} XP` : '0 XP')
                    : 'submitted'}
                </div>
              </div>
              <span className="race-score">{scores[s.addr] || 0}</span>
            </div>
          );
        })}
        {pending.map(addr => (
          <div key={addr} className="race-row" style={{ opacity: 0.55 }}>
            <span className="race-rank dim">—</span>
            <Avatar addr={addr} name={nick(addr)} size={28} />
            <div>
              <div className="race-name">{nick(addr)}{addr === myAddress ? ' · YOU' : ''}</div>
              <div className="race-pending">thinking…</div>
            </div>
            <span className="race-score" style={{ color: 'var(--muted)' }}>{scores[addr] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════
function Results({ room, scores, players, myAddress, onLeave, onDispute, showToast }) {
  const [distributed, setDistributed] = useState(false);
  const [busy, setBusy] = useState(false);

  const sorted = players.slice().sort((a, b) => (scores[b]||0) - (scores[a]||0));
  const top3 = sorted.slice(0, 3);

  async function handleDistribute() {
    setBusy(true);
    await new Promise(r => setTimeout(r, 1500));
    setDistributed(true);
    showToast('XP committed to global ladder ✓');
    setBusy(false);
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-16" onClick={onLeave}>← BACK HOME</button>

      <div className="row-between mb-24" style={{ alignItems: 'flex-end' }}>
        <div>
          <span className="kicker">/ FINAL · {room.code}</span>
          <h1 className="display display-lg mt-12" style={{ marginBottom: 6 }}>
            {distributed ? 'XP committed.' : 'Game over.'}
          </h1>
          <p className="text-muted">
            {distributed
              ? 'Scores are now part of the on-chain leaderboard.'
              : 'Host can distribute XP to push these scores to the global ladder.'}
          </p>
        </div>
        <span className="chip chip-amber">{room.rounds} rounds played</span>
      </div>

      {/* Podium */}
      <div className="podium">
        {[1, 0, 2].map((podiumIdx) => {
          const addr = top3[podiumIdx];
          if (!addr) return <div key={podiumIdx} />;
          const place = podiumIdx + 1;
          return (
            <div key={addr} className={`podium-step p${place} anim-pop`} style={{ animationDelay: `${podiumIdx * 0.15}s` }}>
              <div className="pos">#{place}</div>
              <Avatar addr={addr} name={nick(addr)} size={48} />
              <div className="podium-name">{nick(addr)}{addr === myAddress ? ' · YOU' : ''}</div>
              <div className="podium-addr">{shortAddr(addr)}</div>
              <div className="podium-xp">+{scores[addr] || 0} XP</div>
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <div className="results-table">
        <div className="results-row head">
          <span>RANK</span>
          <span></span>
          <span>PLAYER</span>
          <span style={{ textAlign: 'right' }}>XP</span>
          <span style={{ textAlign: 'right' }}>ACTION</span>
        </div>
        {sorted.map((addr, i) => (
          <div key={addr} className={`results-row r${i+1}`}>
            <span className="rank-num">#{i+1}</span>
            <Avatar addr={addr} name={nick(addr)} size={32} />
            <div>
              <div className="name">{nick(addr)}{addr === myAddress ? ' · YOU' : ''}</div>
              <div className="addr">{shortAddr(addr)}</div>
            </div>
            <span className="xp">+{scores[addr] || 0}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onDispute()}>⚖ DISPUTE</button>
          </div>
        ))}
      </div>

      {!distributed && (
        <button
          className="btn btn-primary btn-lg mt-24"
          style={{ width: '100%' }}
          onClick={handleDistribute}
          disabled={busy}
        >
          {busy ? <><span className="spinner" /> COMMITTING TO CHAIN…</> : '⚡ DISTRIBUTE XP TO LEADERBOARD'}
        </button>
      )}
    </div>
  );
}

Object.assign(window, { ActiveGame, Results });
