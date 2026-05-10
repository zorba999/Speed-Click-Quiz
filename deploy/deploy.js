/**
 * deploy.js — Deploy SpeedClickQuiz to Bradbury Testnet
 * Run: node deploy.js
 */
import { createClient, createAccount, chains } from 'genlayer-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRIVATE_KEY    = process.env.PRIVATE_KEY
const CONTRACT_PATH  = resolve(__dirname, '../contract/speed_click_quiz.py')

if (!PRIVATE_KEY) {
  console.error('❌  Set PRIVATE_KEY env var before running.')
  process.exit(1)
}

async function main() {
  console.log('📡  Connecting to Bradbury Testnet…')
  const account = createAccount(PRIVATE_KEY)
  const client  = createClient({ chain: chains.testnetBradbury, account })

  console.log('🔑  Deploying from address:', account.address)

  const code = readFileSync(CONTRACT_PATH, 'utf8')
  console.log('📜  Contract size:', code.length, 'bytes')
  console.log('🚀  Sending deploy transaction…')

  const hash = await client.deployContract({
    code,
    args:  [],
    value: 0,
  })

  console.log('⏳  Transaction hash:', hash)
  console.log('⌛  Waiting for FINALIZED receipt (this can take 30–90s on Bradbury)…')

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status:   'FINALIZED',
    interval: 6_000,
    retries:  40,
  })

  const contractAddress = receipt?.data?.contract_address ?? receipt?.contractAddress
  if (!contractAddress) {
    console.error('❌  Could not extract contract address from receipt:')
    console.error(JSON.stringify(receipt, null, 2))
    process.exit(1)
  }

  console.log('\n✅  Contract deployed successfully!')
  console.log('📌  Contract address:', contractAddress)
  console.log('\n👉  Add this to frontend/.env:')
  console.log(`     VITE_CONTRACT_ADDRESS=${contractAddress}`)
}

main().catch(e => {
  console.error('❌  Deploy failed:', e?.message || e)
  process.exit(1)
})
