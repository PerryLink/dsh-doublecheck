import { describe, expect, it } from 'vitest'
import {
  compileDetection,
  isTestCommand,
  isTestFilePath,
  mutationTargetPath,
  parseRawArguments,
  shellCommand,
  testOutcome,
} from '../src/domain/evidence.ts'

function detection(overrides: Partial<Parameters<typeof compileDetection>[0]> = {}) {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
    ...overrides,
  })
}

describe('compileDetection', () => {
  it('rejects invalid regex patterns and empty name lists fail-loud', () => {
    expect(() => detection({ testCommandPatterns: ['(unclosed'] })).toThrow(/invalid regex/)
    expect(() => detection({ testToolNames: [] })).toThrow(/must not be empty/)
    expect(() => detection({ guardTools: [] })).toThrow(/must not be empty/)
    expect(() => detection({ guardTools: ['edit', 'edit'] })).toThrow(/duplicates/)
  })
})

describe('parseRawArguments', () => {
  it('parses JSON-string arguments and passes normalized objects through', () => {
    expect(parseRawArguments('{"command":"pnpm test"}')).toEqual({ command: 'pnpm test' })
    expect(parseRawArguments({ command: 'pnpm test' })).toEqual({ command: 'pnpm test' })
    expect(parseRawArguments('not json')).toBeUndefined()
    expect(parseRawArguments('42')).toBeUndefined()
    expect(parseRawArguments(undefined)).toBeUndefined()
  })
})

describe('shellCommand + isTestCommand', () => {
  it('extracts the command only from configured shell tools', () => {
    const args = { command: 'pnpm test' }
    expect(shellCommand('bash', args, detection())).toBe('pnpm test')
    expect(shellCommand('read', args, detection())).toBeUndefined()
    expect(shellCommand('bash', { command: '' }, detection())).toBeUndefined()
  })

  it('classifies test commands against the patterns', () => {
    const det = detection()
    expect(isTestCommand('pnpm test', det)).toBe(true)
    expect(isTestCommand('npm run test -- --watch', det)).toBe(true)
    expect(isTestCommand('yarn vitest run', det)).toBe(true)
    expect(isTestCommand('echo hello', det)).toBe(false)
    expect(isTestCommand('pnpm build', det)).toBe(false)
  })

  it('recognizes deno and uv test invocations when configured', () => {
    const det = detection({ testCommandPatterns: ['(?:^|[;&|]\\s*)(?:deno\\s+test|uv\\s+run\\s+pytest)(?:\\s|$)'] })
    expect(isTestCommand('deno test', det)).toBe(true)
    expect(isTestCommand('uv run pytest tests/', det)).toBe(true)
    expect(isTestCommand('deno fmt', det)).toBe(false)
  })
})

describe('mutationTargetPath + isTestFilePath', () => {
  it('reads file_path from configured mutation tools only', () => {
    const det = detection()
    expect(mutationTargetPath('edit', { file_path: 'src/app.ts' }, det)).toBe('src/app.ts')
    expect(mutationTargetPath('write', { file_path: 'x.ts' }, det)).toBe('x.ts')
    expect(mutationTargetPath('read', { file_path: 'x.ts' }, det)).toBeUndefined()
    expect(mutationTargetPath('edit', {}, det)).toBeUndefined()
  })

  it('falls back to the path key for custom guard tools', () => {
    const det = detection({ guardTools: ['edit', 'write', 'apply_patch'] })
    expect(mutationTargetPath('apply_patch', { path: 'src/lib.ts' }, det)).toBe('src/lib.ts')
    expect(mutationTargetPath('edit', { path: 'src/lib.ts' }, det)).toBe('src/lib.ts')
    // file_path wins over path when both are present.
    expect(mutationTargetPath('edit', { file_path: 'a.ts', path: 'b.ts' }, det)).toBe('a.ts')
    expect(mutationTargetPath('apply_patch', { hunks: [] }, det)).toBeUndefined()
  })

  it('identifies test files by directory and extension', () => {
    const det = detection()
    expect(isTestFilePath('tests/app.spec.ts', det)).toBe(true)
    expect(isTestFilePath('src/__tests__/app.ts', det)).toBe(true)
    expect(isTestFilePath('src/app.test.ts', det)).toBe(true)
    expect(isTestFilePath('src/app.ts', det)).toBe(false)
  })
})

describe('testOutcome', () => {
  it('classifies shell result markers', () => {
    expect(testOutcome('1 failed\n[exit code: 1]', false)).toBe('fail')
    expect(testOutcome('[exit code: 0]', false)).toBe('pass')
    expect(testOutcome('12 passed\n[exit code: 0]', false)).toBe('pass')
    expect(testOutcome('[timed out after 60000ms]', false)).toBe('fail')
    expect(testOutcome('[killed by signal: SIGTERM]', false)).toBe('fail')
  })

  it('treats a marker-less finished run as a pass (fixture contract)', () => {
    expect(testOutcome('12 passed', false)).toBe('pass')
    expect(testOutcome('', false)).toBe('pass')
  })

  it('returns undefined for non-evidence results', () => {
    expect(testOutcome('spawn ENOENT', true)).toBeUndefined()
    expect(testOutcome('[sandbox: file access denied under read-only mode]', false)).toBeUndefined()
    expect(testOutcome('started background job job-1', false)).toBeUndefined()
  })
})
