/**
 * CI smoke assertion: verify a `dsh --profile ci --dump-config` output
 * carries the dsh-doublecheck bundle layer with both rows mounted and no
 * FAILED marker. Catches a patch/export regression that unit tests cannot:
 * they never assemble cordis.patch.yml into a real DSH profile.
 * Usage: node scripts/assert-profile.mjs <dump.txt>
 */
import { readFile } from 'node:fs/promises'

const file = process.argv[2]
if (file === undefined) {
  console.error('usage: node scripts/assert-profile.mjs <dump.txt>')
  process.exit(2)
}
const text = await readFile(file, 'utf8')

const checks = [
  ['bundle layer', /^# == dsh-doublecheck$/m, true],
  ['grill row', /^- id: doublecheck-grill$/m, true],
  ['guard row', /^- id: doublecheck-guard$/m, true],
  ['FAILED marker', /FAILED/, false],
]
const failures = []
for (const [label, pattern, present] of checks) {
  const found = pattern.test(text)
  if (found !== present) {
    failures.push(`${label}: expected ${present ? 'present' : 'absent'}, found ${found ? 'present' : 'absent'}`)
  }
}
if (failures.length > 0) {
  console.error(`profile assertion failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('profile assertion passed: dsh-doublecheck rows mounted, no FAILED')
