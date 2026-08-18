// Verify the built artifacts after `pnpm run build`: the shipped files the
// two plugin rows and the domain root need are present, the three JS faces
// parse under plain Node, and both plugin rows import with the expected
// contracts (name === 'doublecheck-grill' / 'doublecheck-guard', apply is a
// function, no default export). Guards against TypeScript-only syntax
// leaking into shipped output and against a tarball missing a plugin row.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'lib/index.js',
  'lib/index.d.ts',
  'lib/grill/index.js',
  'lib/grill/index.d.ts',
  'lib/guard/index.js',
  'lib/guard/index.d.ts',
  'lib/invariant.js',
  'cordis.patch.yml',
]
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

for (const rel of ['lib/index.js', 'lib/grill/index.js', 'lib/guard/index.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'inherit' })
}

const rows = [
  ['lib/grill/index.js', 'doublecheck-grill'],
  ['lib/guard/index.js', 'doublecheck-guard'],
]
for (const [rel, expected] of rows) {
  const face = await import(pathToFileURL(path.join(root, rel)).href)
  if ('default' in face) throw new Error(`${rel} must not carry a default export`)
  if (face.name !== expected || typeof face.apply !== 'function') {
    throw new Error(`${rel} exports an unexpected plugin face`)
  }
}

console.log('artifacts OK: syntax + ESM imports of both plugin rows + bundle patch present')
