/* global React, ReactDOM, Landing, CreateRoom, JoinRoom, Lobby, ActiveGame, Results, Leaderboard, Dispute, Avatar, shortAddr, MOCK_ADDRS, useToast, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakToggle */
const { useState, useEffect, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "lime",
  "fontDisplay": "Space Grotesk",
  "scanline": true,
  "soundFx": true
}/*EDITMODE-END*/;

const THEME_OPTS = [
  ['lime', 'Lime / Magenta'],
  ['magenta', 'Magenta / Lime'],
  ['cyan', 'Cyan / Magenta'],
  ['amber', 'Amber / Cyan'],
];

const FONT_OPTS = [
  'Space Grotesk',
  'Bricolage Grotesque',
  'IBM Plex Mono',
  'Manrope',
];

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('landing'); // landing | create | join | lobby | game | results | leaderboard | dispute
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(true); // mock connected state
  const myAddress = MOCK_ADDRS[0];
  const [finalScores, setFinalScores] = useState(null);
  const [finalPlayers, setFinalPlayers] = useState(null);
  const [showToast, toastNode] = useToast();

  // apply theme + font
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.style.setProperty('--font-display', `'${tweaks.fontDisplay}', system-ui, sans-serif`);
    document.documentElement.style.setProperty('--font-text', `'${tweaks.fontDisplay}', system-ui, sans-serif`);
  }, [tweaks.theme, tweaks.fontDisplay]);

  function goHome() { setScreen('landing'); setRoom(null); }

  return (
    <div className="app">
      {tweaks.scanline && <div className="scanline" />}

      <header className="topbar">
        <div className="brand" onClick={goHome} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">⚡</span>
          <span>SPEED.<span style={{ color: 'var(--accent)' }}>CLICK</span></span>
          <span className="brand-tag">Bradbury · v1</span>
        </div>
        <nav className="topnav">
          <button className={`navlink ${screen === 'landing' ? 'active' : ''}`} onClick={() => setScreen('landing')}>HOME</button>
          <button className={`navlink ${screen === 'leaderboard' ? 'active' : ''}`} onClick={() => setScreen('leaderboard')}>LADDER</button>
          <button className={`navlink ${screen === 'dispute' ? 'active' : ''}`} onClick={() => setScreen('dispute')}>TRIBUNAL</button>
          <WalletPill connected={connected} address={myAddress} onClick={() => setConnected(c => !c)} />
        </nav>
      </header>

      <main className="page">
        {screen === 'landing' && (
          <Landing
            connected={connected}
            address={myAddress}
            onCreate={() => setScreen('create')}
            onJoin={() => setScreen('join')}
            onLeaderboard={() => setScreen('leaderboard')}
          />
        )}
        {screen === 'create' && (
          <CreateRoom
            onBack={goHome}
            onCreated={(r) => { setRoom(r); setIsHost(true); setScreen('lobby'); }}
            showToast={showToast}
          />
        )}
        {screen === 'join' && (
          <JoinRoom
            onBack={goHome}
            onJoined={(r) => { setRoom({ ...r, players: 8, rounds: 8 }); setIsHost(false); setScreen('lobby'); }}
            showToast={showToast}
          />
        )}
        {screen === 'lobby' && room && (
          <Lobby
            room={room}
            isHost={isHost}
            myAddress={myAddress}
            onStart={() => setScreen('game')}
            onLeave={goHome}
            showToast={showToast}
          />
        )}
        {screen === 'game' && room && (
          <ActiveGame
            room={room}
            myAddress={myAddress}
            onFinishGame={(scores, players) => {
              setFinalScores(scores);
              setFinalPlayers(players);
              setScreen('results');
            }}
            onLeave={goHome}
            showToast={showToast}
          />
        )}
        {screen === 'results' && room && finalScores && (
          <Results
            room={room}
            scores={finalScores}
            players={finalPlayers}
            myAddress={myAddress}
            onLeave={goHome}
            onDispute={() => setScreen('dispute')}
            showToast={showToast}
          />
        )}
        {screen === 'leaderboard' && (
          <Leaderboard myAddress={myAddress} onBack={goHome} />
        )}
        {screen === 'dispute' && (
          <Dispute room={room || { rounds: 8 }} onBack={() => setScreen(finalScores ? 'results' : 'landing')} showToast={showToast} />
        )}
      </main>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            label="Accent palette"
            value={tweaks.theme}
            options={THEME_OPTS}
            onChange={v => setTweak('theme', v)}
          />
        </TweakSection>
        <TweakSection title="Type">
          <TweakSelect
            label="Display font"
            value={tweaks.fontDisplay}
            options={FONT_OPTS}
            onChange={v => setTweak('fontDisplay', v)}
          />
        </TweakSection>
        <TweakSection title="FX">
          <TweakToggle
            label="Scanline overlay"
            value={tweaks.scanline}
            onChange={v => setTweak('scanline', v)}
          />
          <TweakToggle
            label="Sound FX (mocked)"
            value={tweaks.soundFx}
            onChange={v => setTweak('soundFx', v)}
          />
        </TweakSection>
      </TweaksPanel>

      {toastNode}
    </div>
  );
}

function WalletPill({ connected, address, onClick }) {
  if (!connected) {
    return (
      <button className="wallet-pill" onClick={onClick}>
        🦊 CONNECT
      </button>
    );
  }
  return (
    <button className="wallet-pill connected" onClick={onClick}>
      <span className="wallet-dot" />
      {shortAddr(address)}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
