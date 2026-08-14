// One-off: find which recent session contains the doublecheck_report call.
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import zlib from 'node:zlib'
import { scanZstdFrames } from 'file:///D:/deepseek-harness/packages/session/session-persistence-jsonl/src/zstd.ts'

const root = 'C:/Users/zzhdz/.dsh/sessions/--D-deepseek-harness-Project-Plugins-dsh-doublecheck--'
const dirs = await readdir(root)
for (const dir of dirs) {
  const file = join(root, dir, 'session.jsonl.zstd')
  const buffer = await readFile(file)
  const { frames } = scanZstdFrames(buffer)
  let raw = ''
  for (const frame of frames) raw += zlib.zstdDecompressSync(buffer.subarray(frame.start, frame.end)).toString('utf8')
  const events = raw.split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))
  const report = events.some(e => e.type === 'tool/call' && e.data.name === 'doublecheck_report')
  const spec = events.some(e => e.type === 'tool/call' && e.data.name === 'doublecheck_spec')
  console.log(`${dir} | events=${events.length} report=${report} spec=${spec}`)
}
