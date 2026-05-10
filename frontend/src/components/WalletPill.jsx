import { useWallet } from '../context/WalletContext.jsx'
import { shortAddr } from '../utils/format.js'

export default function WalletPill() {
  const { address, connect, connecting } = useWallet()

  if (!address) {
    return (
      <button className="wallet-pill" onClick={connect} disabled={connecting}>
        {connecting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> CONNECTING…</> : 'CONNECT WALLET'}
      </button>
    )
  }

  return (
    <div className="wallet-pill connected">
      <span className="wallet-dot" />
      {shortAddr(address)}
    </div>
  )
}
