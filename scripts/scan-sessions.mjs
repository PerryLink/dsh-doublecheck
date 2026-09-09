// One-off: find which session contains the doublecheck_report call.
//
// Usage: node scripts/scan-sessions.mjs <sessions-project-dir>
//
// The project directory is a required argument on purpose: this tool must
// never default to the real `~/.dsh` session store (session data is user
// property). Pass a fixture copy or a temporary `DSH_HOME` session directory.
//
// Session logs are generation-suffixed: generation 0 is `session.jsonl`, any
// later generation is `session.v<N>.jsonl` (the current writer emits
// `session.v3.jsonl.zstd`), plus the `.zstd` compression suffix. Each session
// directory is read at its highest generation.
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import zlib from 'node:zlib'
import { scanZstdFrames } from 'file:///D:/deepseek-harness/packages/session/session-persistence-jsonl/src/zstd.ts'

/** Canonical log filename: `session.jsonl.zstd` (generation 0) or `session.v<N>.jsonl.zstd`. */
const LOG_FILENAME = /^session(?:\.v([1-9][0-9]*))?\.jsonl\.zstd$/

const root = process.argv[2]
if (root === undefined || root.trim() === '') {
  console.error('usage: node scripts/scan-sessions.mjs <sessions-project-dir>')
  console.error('pass a fixture copy or a temporary DSH_HOME session directory; never the real store')
  process.exit(2)
}

/** The generation number a log filename carries, or `undefined` when it is not a session log. */
function logGeneration(name) {
  const match = LOG_FILENAME.exec(name)
  if (match === null) return undefined
  return match[1] === undefined ? 0 : Number.parseInt(match[1], 10)
}

const dirs = await readdir(root)
for (const dir of dirs) {
  const entries = await readdir(join(root, dir)).catch(() => [])
  let latest
  for (const entry of entries) {
    const generation = logGeneration(entry)
    if (generation === undefined) continue
    if (latest === undefined || generation > latest.generation) latest = { file: entry, generation }
  }
  if (latest === undefined) {
    console.log(`${dir} | no session log`)
    continue
  }
  const buffer = await readFile(join(root, dir, latest.file))
  const { frames } = scanZstdFrames(buffer)
  let raw = ''
  for (const frame of frames) raw += zlib.zstdDecompressSync(buffer.subarray(frame.start, frame.end)).toString('utf8')
  const events = raw.split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))
  const report = events.some(e => e.type === 'tool/call' && e.data.name === 'doublecheck_report')
  const spec = events.some(e => e.type === 'tool/call' && e.data.name === 'doublecheck_spec')
  console.log(`${dir} | ${latest.file} (gen ${latest.generation}) | events=${events.length} report=${report} spec=${spec}`)
}
