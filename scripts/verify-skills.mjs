// scripts/verify-skills.mjs — bundled skill-manifest gate.
//
// Validates the `skills/` directory against the generic Agent Skills layout
// this package ships (reference: skill-pack-security verify mode):
//   * every skill lives at `skills/<name>/SKILL.md`;
//   * the shipped directory holds exactly the expected skill names;
//   * each SKILL.md opens with a `---` YAML frontmatter fence carrying a
//     non-empty `name` (matching its directory) and a non-empty `description`.
//
// Exit 0 prints a summary; any violation exits non-zero with the reason.
// Usage: node scripts/verify-skills.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILLS_ROOT = fileURLToPath(new URL('../skills/', import.meta.url))
const EXPECTED = ['delivery-proof', 'delivery-review', 'grill-requirements', 'red-green-tdd']

/** Parse the `key: value` frontmatter scalars the provider consumes. */
function parseSkillAsset(raw) {
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return undefined
  if (raw.slice(0, firstLineEnd).replace(/\r$/, '') !== '---') return undefined
  let lineStart = firstLineEnd + 1
  let frontmatter = ''
  let closing = undefined
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    const line = raw.slice(lineStart, lineEnd).replace(/\r$/, '')
    if (line === '---') {
      closing = { bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 }
      break
    }
    frontmatter += `${line}\n`
    if (nextNewline < 0) break
    lineStart = nextNewline + 1
  }
  if (closing === undefined) return undefined
  const scalar = (key) => {
    for (const line of frontmatter.split('\n')) {
      const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
      if (match === null || match[1] !== key) continue
      const value = match[2].trim()
      if (value.length === 0) return undefined
      const quote = value[0]
      if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) return value.slice(1, -1)
      return value
    }
    return undefined
  }
  const name = scalar('name')
  const description = scalar('description')
  if (name === undefined || description === undefined) return undefined
  return { name, description }
}

const entries = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

const missing = EXPECTED.filter(name => !entries.includes(name))
const extra = entries.filter(name => !EXPECTED.includes(name))
if (missing.length > 0) {
  throw new Error(`skills: missing bundled skill directories: ${missing.join(', ')}`)
}
if (extra.length > 0) {
  throw new Error(`skills: unexpected directories in skills/: ${extra.join(', ')}`)
}

for (const name of EXPECTED) {
  const file = join(SKILLS_ROOT, name, 'SKILL.md')
  const stats = statSync(file, { throwIfNoEntry: false })
  if (stats === undefined || !stats.isFile()) {
    throw new Error(`skills: ${name}/SKILL.md is missing or not a regular file`)
  }
  const raw = readFileSync(file, 'utf8')
  const parsed = parseSkillAsset(raw)
  if (parsed === undefined) {
    throw new Error(`skills: ${name}/SKILL.md has missing or malformed frontmatter (name + description required)`)
  }
  if (parsed.name !== name) {
    throw new Error(`skills: ${name}/SKILL.md frontmatter name "${parsed.name}" does not match its directory`)
  }
}

console.log(`skills OK: ${EXPECTED.length} bundled skills with valid frontmatter and layout`)
