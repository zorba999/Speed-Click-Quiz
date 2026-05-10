import { useState, useCallback, useEffect } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext.jsx'
import { useGenLayer } from './hooks/useGenLayer.js'
import Topbar      from './components/Topbar.jsx'
import Landing     from './components/Landing.jsx'
import CreateRoom  from './components/CreateRoom.jsx'
import JoinRoom    from './components/JoinRoom.jsx'
import Lobby       from './components/Lobby.jsx'
import ActiveGame  from './components/ActiveGame.jsx'
import Results     from './components/Results.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Dispute     from './components/Dispute.jsx'

function useToast() {
  const [msg, setMsg] = useState(null)
  const show = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(null), 2800) }, [])
  return [show, msg]
}

function AppInner() {
  const { address } = useWallet()

  // User intent: landing | create | join | leaderboard | dispute
  const [intent,       setIntent]       = useState('landing')
  const [roomId,       setRoomId]       = useState(null)
  const [disputeCtx,   setDisputeCtx]   = useState({ roomId: null, rounds: 8 })
  const [showToast, toastMsg] = useToast()

  function goHome() { setRoomId(null); setIntent('landing') }

  function handleCreated({ code }) {
    setRoomId(code)
    setIntent('landing') // room status drives to lobby automatically
  }

  function handleJoined({ code }) {
    setRoomId(code)
    setIntent('landing')
  }

  function handleDispute(rid, rounds) {
    setDisputeCtx({ roomId: rid, rounds })
    setIntent('dispute')
  }

  // Derive actual screen from room presence + intent
  // Room status drives lobby → active → results automatically via polling
  const screen = roomId ? 'room' : intent

  // Topbar nav — only allow leaving room to go home
  function handleNav(target) {
    if (roomId && target !== 'leaderboard' && target !== 'dispute') {
      goHome()
    } else {
      setIntent(target)
    }
  }

  // Visible screen label for topbar active state
  const topbarScreen = roomId
    ? (intent === 'dispute' ? 'dispute' : 'landing')
    : intent

  return (
    <div className="app">
      <div className="scanline" />
      <Topbar screen={topbarScreen} onNav={handleNav} />

      <main className="page">
        {screen === 'landing' && (
          <Landing
            onCreate={() => setIntent('create')}
            onJoin={() => setIntent('join')}
            onLeaderboard={() => setIntent('leaderboard')}
          />
        )}

        {screen === 'create' && (
          <CreateRoom
            onBack={goHome}
            onCreated={handleCreated}
            showToast={showToast}
          />
        )}

        {screen === 'join' && (
          <JoinRoom
            onBack={goHome}
            onJoined={handleJoined}
            showToast={showToast}
          />
        )}

        {screen === 'leaderboard' && (
          <Leaderboard myAddress={address} onBack={() => setIntent('landing')} />
        )}

        {screen === 'dispute' && (
          <Dispute
            roomId={disputeCtx.roomId}
            totalRounds={disputeCtx.rounds}
            onBack={() => roomId ? setIntent('landing') : setIntent('landing')}
            showToast={showToast}
          />
        )}

        {/* Room screens — driven by room.status via polling inside each component */}
        {screen === 'room' && (
          <RoomRouter
            roomId={roomId}
            myAddress={address}
            onLeave={goHome}
            onDispute={handleDispute}
            showToast={showToast}
          />
        )}
      </main>

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}

// ── RoomRouter: polls room.status and renders the right screen ───────────────
function RoomRouter({ roomId, myAddress, onLeave, onDispute, showToast }) {
  const gl = useGenLayer()
  const [roomStatus, setRoomStatus] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const r = await gl.getRoom(roomId)
      setRoomStatus(r?.status ?? null)
    } catch { /* room not ready yet */ }
  }, [gl, roomId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [refresh])

  if (!roomStatus) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" />
        <p className="text-muted mt-16">Connecting to room…</p>
      </div>
    )
  }

  if (roomStatus === 'waiting') {
    return (
      <Lobby
        roomId={roomId}
        myAddress={myAddress}
        onLeave={onLeave}
        onGameStarted={refresh}
        showToast={showToast}
      />
    )
  }

  if (roomStatus === 'active') {
    return (
      <ActiveGame
        roomId={roomId}
        myAddress={myAddress}
        onLeave={onLeave}
        onFinished={refresh}
        showToast={showToast}
      />
    )
  }

  if (roomStatus === 'finished' || roomStatus === 'ended') {
    return (
      <Results
        roomId={roomId}
        myAddress={myAddress}
        onLeave={onLeave}
        onDispute={onDispute}
        showToast={showToast}
      />
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p className="text-muted">Room status: {roomStatus}</p>
      <button className="btn btn-ghost btn-sm mt-16" onClick={onLeave}>← HOME</button>
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
