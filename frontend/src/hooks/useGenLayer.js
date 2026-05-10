/**
 * useGenLayer.js
 * Thin wrapper around genlayer-js for the Speed Click Quiz dApp.
 * Uses WalletContext for MetaMask-connected read/write clients.
 */
import { useState, useCallback } from 'react'
import { useWallet } from '../context/WalletContext.jsx'

// ── Contract address ──────────────────────────────────────────────────────
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

// ═════════════════════════════════════════════════════════════════════════════
export function useGenLayer() {
  const { address, readClient, writeClient } = useWallet()

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [txHash,  setTxHash]  = useState(null)

  // ── Read (view) — no wallet needed ───────────────────────────────────────
  const read = useCallback(async (functionName, args = []) => {
    const raw = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
    })
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return raw }
    }
    return raw
  }, [readClient])

  // ── Write (state-changing) — requires MetaMask ────────────────────────────
  const write = useCallback(async (functionName, args = []) => {
    if (!writeClient) throw new Error('Connect your wallet first')
    setLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const hash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value: BigInt(0),
      })
      setTxHash(hash)

      const receipt = await writeClient.waitForTransactionReceipt({
        hash,
        status:   'ACCEPTED',
        interval: 4_000,
        retries:  60,
      })
      return receipt
    } catch (e) {
      setError(e?.message || 'Transaction failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [writeClient])

  // ── Convenience methods ───────────────────────────────────────────────────

  // Room
  const createRoom   = (roomId, maxPlayers, numRounds) =>
    write('create_room', [roomId, BigInt(maxPlayers), BigInt(numRounds)])

  const joinRoom     = (roomId) =>
    write('join_room', [roomId])

  const startGame    = (roomId) =>
    write('start_game', [roomId])

  // Gameplay
  const submitAnswer = (roomId, answerIndex) =>
    write('submit_answer', [roomId, BigInt(answerIndex)])

  const finalizeRound = (roomId) =>
    write('finalize_round', [roomId])

  const distributeXP = (roomId) =>
    write('distribute_xp', [roomId])

  // Dispute (Optimistic Democracy)
  const disputeQuestion = (roomId, roundIndex, reason) =>
    write('dispute_question', [roomId, BigInt(roundIndex), reason])

  // Reads
  const getRoom                = (roomId)     => read('get_room',                  [roomId])
  const getCurrentQuestion     = (roomId)     => read('get_current_question',      [roomId])
  const getScores              = (roomId)     => read('get_scores',                [roomId])
  const getLeaderboard         = ()           => read('get_leaderboard',           [])
  const getDispute             = (disputeId)  => read('get_dispute',              [disputeId])

  return {
    address,
    loading,
    error,
    txHash,
    // write
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    finalizeRound,
    distributeXP,
    disputeQuestion,
    // read
    getRoom,
    getCurrentQuestion,
    getScores,
    getLeaderboard,
    getDispute,
  }
}
