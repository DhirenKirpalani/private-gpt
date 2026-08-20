import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()]}))

const EVOLUTION_URL = env.EVOLUTION_API_URL || 'http://srv1912272.hstgr.cloud'
const EVOLUTION_KEY = env.EVOLUTION_API_KEY || '47e7b223e7651bec882553bae2f50fc2cfd88add341df95f36e07f0329ce4c42'
const INSTANCE = 'exploro_2b61a1c4_1787196943387'

console.log('1. Checking instance state...')
const stateRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, { headers: { apikey: EVOLUTION_KEY }, cache: 'no-store' })
const stateData = await stateRes.json()
console.log('   State:', stateData?.instance?.state || JSON.stringify(stateData))

console.log('2. Fetching messages from VPS...')
const msgRes = await fetch(`${EVOLUTION_URL}/chat/findMessages/${INSTANCE}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
  body: JSON.stringify({ where: {}, limit: 10, page: 1 }),
  cache: 'no-store',
})
const msgData = await msgRes.json()
const records = msgData?.messages?.records || []
console.log(`   Found ${msgData?.messages?.total ?? 0} total messages, ${records.length} on page 1`)
records.forEach((m, i) => {
  const text = m.message?.conversation || m.message?.extendedTextMessage?.text || `[${m.messageType}]`
  console.log(`   [${i+1}] fromMe=${m.key?.fromMe} jid=${m.key?.remoteJid?.slice(0,20)} text="${text.slice(0,50)}"`)
})

console.log('3. Calling sync API...')
const syncRes = await fetch('http://localhost:3000/api/whatsapp/evolution/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: '2b61a1c4-9cc6-4104-8230-938091985ed4' }),
})
const syncData = await syncRes.json()
console.log('   Sync result:', JSON.stringify(syncData))
