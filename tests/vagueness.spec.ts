import { describe, expect, it } from 'vitest'
import { isVagueTask } from '../src/domain/vagueness.ts'

const config = { vagueTaskMaxChars: 200 }

describe('isVagueTask', () => {
  it('treats a brief task without artifacts as vague', () => {
    expect(isVagueTask('帮我做那个功能', config)).toBe(true)
    expect(isVagueTask('improve the thing', config)).toBe(true)
    expect(isVagueTask('搞一下', config)).toBe(true)
  })

  it('treats a task naming a file extension as concrete', () => {
    expect(isVagueTask('fix the bug in parser.ts', config)).toBe(false)
    expect(isVagueTask('rewrite src/main.rs', config)).toBe(false)
  })

  it('treats a task naming a path or a URL as concrete', () => {
    expect(isVagueTask('add tests under tests/unit/', config)).toBe(false)
    expect(isVagueTask('mirror the API from https://example.com/openapi.json', config)).toBe(false)
    expect(isVagueTask('C:\\work\\app\\main.js is broken', config)).toBe(false)
  })

  it('treats a short task with a quoted keyword as concrete', () => {
    expect(isVagueTask('make the "snapshot" field optional', config)).toBe(false)
    expect(isVagueTask("rename 'pending' to 'queued'", config)).toBe(false)
    expect(isVagueTask('use `verbose` when logging', config)).toBe(false)
    expect(isVagueTask('把“待定”状态改成“排队”', config)).toBe(false)
    expect(isVagueTask('搜索「空值」再处理', config)).toBe(false)
  })

  it('treats a brief task with an underscore keyword as concrete', () => {
    expect(isVagueTask('fix the retry_limit bug', config)).toBe(false)
    expect(isVagueTask('把 foo_bar 改掉', config)).toBe(false)
    expect(isVagueTask('rename user_name to display_name', config)).toBe(false)
    expect(isVagueTask('fix the foo__bar bug', config)).toBe(false)
  })

  it('treats a brief task with a hyphenated keyword as concrete', () => {
    expect(isVagueTask('fix the retry-limit bug', config)).toBe(false)
    expect(isVagueTask('把 foo-bar 改掉', config)).toBe(false)
    expect(isVagueTask('rename user-name to display-name', config)).toBe(false)
    expect(isVagueTask('fix the foo--bar bug', config)).toBe(false)
  })

  it('keeps a bare or edge hyphen from making a task concrete', () => {
    expect(isVagueTask('fix the - thing', config)).toBe(true)
    expect(isVagueTask('improve the thing-', config)).toBe(true)
    expect(isVagueTask('improve the -foo thing', config)).toBe(true)
    expect(isVagueTask('fix the --- thing', config)).toBe(true)
  })

  it('treats prose compounds, dates, and ranges as concrete (documented trade-off)', () => {
    expect(isVagueTask('use the well-known approach', config)).toBe(false)
    expect(isVagueTask('handle the 2024-01-01 report', config)).toBe(false)
    expect(isVagueTask('sort 3-5 items', config)).toBe(false)
  })

  it('keeps a bare underscore from making a task concrete', () => {
    expect(isVagueTask('fix the _ thing', config)).toBe(true)
    expect(isVagueTask('improve the thing_', config)).toBe(true)
  })

  it('keeps underscore-only runs from making a task concrete', () => {
    expect(isVagueTask('fix the ___ thing', config)).toBe(true)
    expect(isVagueTask('improve the a__', config)).toBe(true)
    expect(isVagueTask('rename __1 to foo', config)).toBe(true)
  })

  it('keeps empty quotes from making a task concrete', () => {
    expect(isVagueTask('fix the "" thing', config)).toBe(true)
  })

  it('treats a long task as concrete even without artifacts', () => {
    const long = 'x'.repeat(201)
    expect(isVagueTask(long, config)).toBe(false)
  })

  it('treats text at exactly the character cap as still brief', () => {
    const exact = 'y'.repeat(200)
    expect(isVagueTask(exact, config)).toBe(true)
  })

  it('ignores surrounding whitespace when measuring length', () => {
    const padded = `${'z'.repeat(200)}  `
    expect(isVagueTask(padded, config)).toBe(true)
  })

  it('returns false for empty input', () => {
    expect(isVagueTask('', config)).toBe(false)
    expect(isVagueTask('   ', config)).toBe(false)
  })
})
