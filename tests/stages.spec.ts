import { describe, expect, it } from 'vitest'
import {
  DISCIPLINE_STAGES,
  foldDisciplineRange,
  foldDisciplineStage,
  foldDisciplineState,
  REPORT_TOOL_NAME,
  sessionHasSpec,
  SPEC_TOOL_NAME,
  successfulToolCalls,
} from '../src/domain/stages.ts'
import { compileDetection } from '../src/domain/evidence.ts'
import { codeDispatchEdit, codeDispatchRun, mutationCall, shellCall, shellResult, toolCall, toolResult, userTask } from './helpers.ts'

function detection() {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

describe('discipline stage fold', () => {
  it('starts every session in grill', () => {
    expect(DISCIPLINE_STAGES[0]).toBe('grill')
    expect(foldDisciplineStage([])).toBe('grill')
    expect(sessionHasSpec([])).toBe(false)
  })

  it('stays in grill after a failed spec call', () => {
    const events = [
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1', { name: 'Error', code: 'FS_FAILURE' }),
    ]
    expect(foldDisciplineStage(events)).toBe('grill')
    expect(sessionHasSpec(events)).toBe(false)
  })

  it('stays in grill while a spec call has no result yet', () => {
    const events = [toolCall(SPEC_TOOL_NAME, 'spec-1')]
    expect(foldDisciplineStage(events)).toBe('grill')
    expect(sessionHasSpec(events)).toBe(false)
  })

  it('advances to design after a successful spec call', () => {
    const events = [
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
    ]
    expect(foldDisciplineStage(events)).toBe('design')
    expect(sessionHasSpec(events)).toBe(true)
  })

  it('records the spec commit sequence for task-change detection', () => {
    const events = [
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
    ]
    const state = foldDisciplineState(events)
    expect(state.specSeq).toBe(events[1]?.seq)
  })

  it('advances to verify after a successful report call', () => {
    const events = [
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolResult('spec-1'),
      toolCall(REPORT_TOOL_NAME, 'report-1'),
      toolResult('report-1'),
    ]
    expect(foldDisciplineStage(events)).toBe('verify')
  })

  it('ignores unrelated tool calls and user messages', () => {
    const events = [
      userTask('hello'),
      toolCall('read', 'read-1'),
      toolResult('read-1'),
      toolCall('edit', 'edit-1'),
      toolResult('edit-1'),
    ]
    expect(foldDisciplineStage(events)).toBe('grill')
    expect(sessionHasSpec(events)).toBe(false)
    expect(successfulToolCalls(events, 'read')).toEqual(['read-1'])
  })

  it('pairs results by call id only', () => {
    const events = [
      toolCall(SPEC_TOOL_NAME, 'spec-1'),
      toolCall(SPEC_TOOL_NAME, 'spec-2'),
      toolResult('spec-1'),
    ]
    expect(sessionHasSpec(events)).toBe(true)
    expect(successfulToolCalls(events, SPEC_TOOL_NAME)).toEqual(['spec-1'])
  })
})

describe('red/green evidence fold', () => {
  it('turns red on a failing test run and green on a passing one', () => {
    const events = [
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '1 failed\n[exit code: 1]'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '3 passed\n[exit code: 0]'),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.color).toBe('green')
    expect(state.stage).toBe('green')
    expect(state.pendingGreen).toBe(false)
  })

  it('keeps red as the latest evidence until a pass', () => {
    const events = [
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '[exit code: 2]'),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.color).toBe('red')
    expect(state.stage).toBe('red')
  })

  it('ignores non-test commands and infra failures', () => {
    const events = [
      shellCall('bash', 'pnpm build', 'b-1'),
      shellResult('b-1', '[exit code: 1]'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', 'spawn ENOENT', { name: 'Error', code: 'SPAWN_FAILED' }),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.color).toBe('none')
  })

  it('folds Code Mode sub-dispatches as settled test runs', () => {
    const events = [codeDispatchRun('pnpm test', '[exit code: 1]')]
    const state = foldDisciplineState(events, detection())
    expect(state.color).toBe('red')
    const green = foldDisciplineState([codeDispatchRun('pnpm test', '5 passed\n[exit code: 0]')], detection())
    expect(green.color).toBe('green')
    // Code Mode dispatches carry no exit marker: a finished dispatch with no
    // failure markers settled with exit 0, so it is green evidence.
    const markerless = foldDisciplineState([codeDispatchRun('pnpm test', '5 passed')], detection())
    expect(markerless.color).toBe('green')
  })

  it('counts Code Mode edit dispatches as implementation edits', () => {
    const events = [
      { ...codeDispatchRun('pnpm test', '1 failed\n[exit code: 1]') },
      codeDispatchEdit('src/app.ts'),
      codeDispatchRun('pnpm test', '3 passed\n[exit code: 0]'),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.editCount).toBe(1)
    expect(state.pendingGreen).toBe(false)
    expect(state.color).toBe('green')

    const stillPending = foldDisciplineState([
      codeDispatchRun('pnpm test', '1 failed\n[exit code: 1]'),
      codeDispatchEdit('src/app.ts'),
    ], detection())
    expect(stillPending.editCount).toBe(1)
    expect(stillPending.pendingGreen).toBe(true)
  })

  it('arms the green gate on implementation edits and clears it on a pass', () => {
    const events = [
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '3 passed\n[exit code: 0]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '3 passed\n[exit code: 0]'),
      mutationCall('edit', 'src/app.ts', 'e-2'),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.pendingGreen).toBe(true)
    expect(state.editCount).toBe(2)
  })

  it('does not count test-file edits as implementation edits', () => {
    const events = [
      mutationCall('write', 'tests/app.spec.ts', 'w-1'),
      mutationCall('edit', 'src/app.test.ts', 'e-1'),
    ]
    const state = foldDisciplineState(events, detection())
    expect(state.pendingGreen).toBe(false)
    expect(state.editCount).toBe(0)
  })

  it('advances an existing state over only the appended tail', () => {
    const first = [shellCall('bash', 'pnpm test', 't-1'), shellResult('t-1', '[exit code: 1]')]
    const state = foldDisciplineState(first, detection())
    expect(state.color).toBe('red')
    const appended = [...first, shellCall('bash', 'pnpm test', 't-2'), shellResult('t-2', '4 passed\n[exit code: 0]')]
    foldDisciplineRange(state, appended, first.length, detection())
    expect(state.color).toBe('green')
    expect(state.pendingGreen).toBe(false)
  })
})
