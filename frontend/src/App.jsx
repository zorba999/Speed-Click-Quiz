import { useState } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext.jsx'
import HomeScreen    from './components/HomeScreen.jsx'
import GameRoom      from './components/GameRoom.jsx'
import Leaderboard   from './components/Leaderboard.jsx'
import WalletButton  from './components/WalletButton.jsx'

function AppInner() {
  const { address } = useWallet()
  const [screen,       setScreen]       = useState('home')
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [isHost,       setIsHost]       = useState(false)

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <span>⚡</span>
          <span>Speed Click Quiz</span>
          <span className="badge badge-accent" style={{ marginLeft: 4 }}>GenLayer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {screen !== 'home' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen('home')}>
              ← Home
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setScreen(screen === 'leaderboard' ? 'home' : 'leaderboard')}
          >
            🏆 Leaderboard
          </button>
          <WalletButton />
        </div>
      </header>

      {/* ── Wallet required banner ── */}
      {!address && screen !== 'leaderboard' && (
        <div style={{
          width: '100%', background: '#6c63ff18',
          borderBottom: '1px solid #6c63ff44',
          padding: '10px 24px', textAlign: 'center',
          fontSize: '.85rem', color: 'var(--primary-h)',
        }}>
          🦊 Connect your MetaMask wallet to create rooms and play. Leaderboard is viewable without wallet.
        </div>
      )}

      {/* ── Pages ── */}
      <main className="page">
        {screen === 'home' && (
          <HomeScreen
            onEnterRoom={(roomId, asHost) => {
              setActiveRoomId(roomId)
              setIsHost(asHost)
              setScreen('room')
            }}
          />
        )}
        {screen === 'room' && (
          <GameRoom
            roomId={activeRoomId}
            isHost={isHost}
            myAddress={address}
            onLeave={() => setScreen('home')}
          />
        )}
        {screen === 'leaderboard' && (
          <Leaderboard />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  )
}
