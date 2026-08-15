#!/usr/bin/env node
/**
 * Extract the top section of CHANGELOG.md as GitHub Release notes.
 *
 * Reads the changelog, skips to the first `## ` heading, and prints that
 * section (minus the trailing blank line) to stdout. Empty output means no
 * section was found — callers fall back to generated release notes.
 *
 * Usage: node scripts/release-notes.mjs [changelog-file]
 */

import { readFileSync } from 'node:fs'

const file = process.argv[2] ?? 'CHANGELOG.md'
const lines = readFileSync(file, 'utf8').split(/\r?\n/)
const out = []
let started = false
for (const line of lines) {
  if (/^## /.test(line)) {
    if (started) break
    started = true
  }
  if (started) out.push(line)
}
process.stdout.write(`${out.join('\n').trimEnd()}\n`)
