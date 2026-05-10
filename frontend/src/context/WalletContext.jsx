import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [address,     setAddress]     = useState(null)
  const [writeClient, setWriteClient] = useState(null)
  const [connecting,  setConnecting]  = useState(false)
  const [error,       setError]       = useState(null)

  // Read client is always available — no wallet needed
  const readClient = useMemo(() => createClient({ chain: testnetBradbury }), [])

  const connect = useCallback(async () => {
    setError(null)
    if (!window.ethereum) {
      const msg = 'MetaMask (or compatible EVM wallet) not detected. Please install it.'
      setError(msg)
      throw new Error(msg)
    }
    setConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const addr = accounts[0]

      // Manually add / switch to Bradbury testnet (avoids wallet_getSnaps error)
      const BRADBURY_CHAIN_ID = '0x107D' // 4221
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BRADBURY_CHAIN_ID }],
        })
      } catch (switchErr) {
        // Chain not added yet — add it
        if (switchErr.code === 4902 || switchErr.code === -32603) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:         BRADBURY_CHAIN_ID,
              chainName:       'GenLayer Bradbury Testnet',
              nativeCurrency:  { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
              rpcUrls:         ['https://rpc-bradbury.genlayer.com'],
              blockExplorerUrls: ['https://explorer-bradbury.genlayer.com/'],
            }],
          })
        } else {
          throw switchErr
        }
      }

      const client = createClient({
        chain:    testnetBradbury,
        account:  addr,
        provider: window.ethereum,
      })

      setAddress(addr)
      setWriteClient(client)
      return addr
    } catch (e) {
      const msg = e?.message || 'Connection failed'
      setError(msg)
      throw e
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setWriteClient(null)
    setError(null)
  }, [])

  // Re-connect automatically if account changes in wallet
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else if (accounts[0] !== address) {
        connect()
      }
    })
  }

  return (
    <WalletContext.Provider value={{ address, readClient, writeClient, connect, disconnect, connecting, error }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>')
  return ctx
}
