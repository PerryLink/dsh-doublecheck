/**
 * One-off fixture extractor: trim a real session log to the discipline-relevant
 * events (user messages, review injections, spec/report/shell/mutation calls
 * and their results) and write a compact fixture for regression tests.
 * Usage: tsx scripts/extract-fixture.mjs <session.jsonl.zstd> <out.json> <maxEvents>
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

// Runs under the harness checkout's tsx so the TS source import resolves.
// Point DSH_HARNESS_ROOT at the deepseek-harness checkout.
const harnessRoot = process.env.DSH_HARNESS_ROOT?.trim()
if (harnessRoot === undefined || harnessRoot === '') {
  console.error('DSH_HARNESS_ROOT must point at the deepseek-harness checkout')
  process.exit(2)
}
const { scanZstdFrames } = await import(
  pathToFileURL(resolve(harnessRoot, 'packages/session/session-persistence-jsonl/src/zstd.ts')).href
)

const [file, out, capArg] = process.argv.slice(2)
const cap = capArg === undefined ? 60 : Number(capArg)
const buffer = await readFile(file)
const { frames } = scanZstdFrames(buffer)
let raw = ''
for (const frame of frames) {
  raw += zlib.zstdDecompressSync(buffer.subarray(frame.start, frame.end)).toString('utf8')
}
const events = raw.split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))

const RELEVANT_CALLS = new Set(['doublecheck_spec', 'doublecheck_report', 'doublecheck_skills', 'bash', 'pwsh', 'edit', 'write'])
const keptCallIds = new Set()
const kept = []
for (const event of events) {
  if (kept.length >= cap) break
  switch (event.type) {
    case 'user/message': {
      const kind = event.data.source?.kind
      if (kind === 'user' || kind === 'doublecheck-review') kept.push(event)
      break
    }
    case 'tool/call': {
      if (!RELEVANT_CALLS.has(event.data.name)) break
      keptCallIds.add(event.data.callId)
      kept.push(event)
      break
    }
    case 'tool/result': {
      if (keptCallIds.has(event.data.message?.source?.callId)) kept.push(event)
      break
    }
  }
}
await writeFile(out, JSON.stringify(kept, null, 2) + '\n')
console.error(`kept ${kept.length} events -> ${out}`)
