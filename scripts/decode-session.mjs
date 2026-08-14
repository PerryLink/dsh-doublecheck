/**
 * One-off acceptance helper: decode a JSONL zstd session log from the flat
 * fallback's dsh-session-persistence-jsonl and print a compact event trace
 * filtered to the dsh-doublecheck evidence.
 * Usage: node scripts/decode-session.mjs <path-to-session.jsonl.zstd>
 */
import { readFile } from 'node:fs/promises'
import zlib from 'node:zlib'
// Runs under the harness checkout's tsx so the TS source import resolves.
import { scanZstdFrames } from 'file:///D:/deepseek-harness/packages/session/session-persistence-jsonl/src/zstd.ts'

const file = process.argv[2]
if (file === undefined) {
  console.error('usage: node scripts/decode-session.mjs <file>')
  process.exit(2)
}
const buffer = await readFile(file)
const { frames } = scanZstdFrames(buffer)
console.error(`frames: ${frames.length}`)
let out = ''
for (const frame of frames) {
  const slice = buffer.subarray(frame.start, frame.end)
  const decoded = zlib.zstdDecompressSync(slice)
  out += decoded.toString('utf8')
}
const events = out.split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))

const interesting = ['doublecheck_spec', 'edit', 'write', 'ask_user_question', 'doublecheck_skills', 'skill', 'read', 'glob', 'grep']
let edits = 0
let denies = 0
let reminders = 0
let asks = 0
let specs = 0
for (const event of events) {
  switch (event.type) {
    case 'tool/call': {
      const name = event.data.name
      if (interesting.includes(name)) console.log(`tool/call ${name} callId=${event.data.callId}`)
      if (name === 'edit' || name === 'write') edits += 1
      if (name === 'ask_user_question') asks += 1
      if (name === 'doublecheck_spec') specs += 1
      break
    }
    case 'tool/result': {
      const text = JSON.stringify(event.data.message)
      if (text.includes('dsh-doublecheck') || text.includes('requirements guard') || text.includes('doublecheck spec')) {
        console.log(`tool/result isError=${event.data.error !== undefined} ${text.slice(0, 220)}`)
        if (text.includes('requirements guard')) denies += 1
      }
      if (text.includes('no user-questions provider') || text.includes('NO_PROVIDER')) {
        console.log(`tool/result ask-user: ${text.slice(0, 160)}`)
      }
      break
    }
    case 'user/message': {
      const source = event.data.source
      if (source.kind === 'plugin' && source.plugin === 'dsh-doublecheck') {
        reminders += 1
        console.log(`user/message [plugin dsh-doublecheck] "${String(event.data.content[0]?.text).slice(0, 120)}…"`)
      }
      if (source.kind === 'skill-catalog') {
        const names = (source.entries ?? []).map(entry => entry.name).join(',')
        console.log(`user/message [skill-catalog] entries: ${names}`)
      }
      break
    }
  }
}
console.log(`--- totals: edits=${edits} denies=${denies} reminders=${reminders} asks=${asks} specs=${specs} events=${events.length}`)
