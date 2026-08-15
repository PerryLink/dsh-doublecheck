import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The published-package contract: subpath exports, shipped files, and
 * metadata the registry and bundlers rely on. Pinned here so a broken
 * `exports` map or a missing built artifact fails CI before it fails a
 * consumer.
 */

interface PackageJson {
  exports: Record<string, { types?: string; import?: string } | string>
  files: string[]
  publishConfig: { access: string }
  sideEffects: boolean
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as PackageJson

/** Resolve a package-relative path against the repository root. */
function repoFile(path: string): URL {
  return new URL(`../${path}`, import.meta.url)
}

function exists(path: string): boolean {
  return readFileSync(repoFile(path), 'utf8').length >= 0
}

describe('package.json contract', () => {
  it('exposes the standalone invariant companion subpath', () => {
    expect(pkg.exports['./invariant']).toEqual({
      types: './lib/invariant.d.ts',
      import: './lib/invariant.js',
    })
  })

  it('every subpath export target exists in the built tree', () => {
    for (const [key, entry] of Object.entries(pkg.exports)) {
      if (key === './package.json') continue
      const record = entry as { types?: string; import?: string }
      for (const file of [record.types, record.import]) {
        if (file === undefined) continue
        expect(exists(file), `${key} -> ${file} is missing (run pnpm run build)`).toBe(true)
      }
    }
  })

  it('ships the plugin assets (lib, skills, patches, docs)', () => {
    for (const asset of ['lib', 'skills', 'cordis.patch.yml', 'strict.patch.yml', 'CHANGELOG.md', 'LICENSE']) {
      expect(pkg.files).toContain(asset)
    }
  })

  it('publishes publicly and declares no side effects', () => {
    expect(pkg.publishConfig.access).toBe('public')
    expect(pkg.sideEffects).toBe(false)
  })
})
