import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { compileDetection, type TestRunDetection } from '../src/domain/evidence.ts'
import {
  applyDoublecheckEvent,
  emptyDoublecheckState,
  foldDoublecheckState,
  viewDoublecheck,
} from '../src/domain/projection.ts'
import { doublecheckViewSchema } from '../src/types.ts'
import {
  legacyCodeDispatchRun,
  mutationCall,
  ptcDispatchRun,
  reviewInjectionEvent,
  shellCall,
  shellResult,
  specToolCall,
  toolResult,
  userTask,
} from './helpers.ts'

function detection(): TestRunDetection {
  return compileDetection({
    testToolNames: ['bash', 'pwsh'],
    testCommandPatterns: ['(?:^|[;&|]\\s*)(?:(?:pnpm|npm|npx|yarn|bun)(?:\\s+run)?\\s+(?:test|vitest|jest|mocha)(?:\\s|$))'],
    guardTools: ['edit', 'write'],
    testFilePatterns: ['(^|[\\\\/])(tests?|__tests__|specs?)([\\\\/]|$)', '\\.(test|spec)\\.[A-Za-z0-9]+$'],
  })
}

describe('doublecheck projection fold', () => {
  it('starts empty and stays there for unrelated events', () => {
    const state = emptyDoublecheckState()
    const unrelated = userTask('hello') as SessionEvent
    expect(applyDoublecheckEvent(state, unrelated, detection())).toBe(state)
    expect(viewDoublecheck(state)).toEqual({
      stage: 'grill', color: 'none', hasSpec: false, specGoal: '', reviewed: false, editCount: 0,
      gateVerdict: 'none', gateRedCount: 0,
    })
  })

  it('folds spec → red → green → review into the wire view', () => {
    const events: SessionEvent[] = [
      userTask('fix the bug'),
      specToolCall({ goal: 'ship parser fix', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' }, 'spec-1'),
      toolResult('spec-1'),
      shellCall('bash', 'pnpm test', 't-1'),
      shellResult('t-1', '[exit code: 1]'),
      mutationCall('edit', 'src/app.ts', 'e-1'),
      shellCall('bash', 'pnpm test', 't-2'),
      shellResult('t-2', '4 passed'),
      reviewInjectionEvent('clean'),
    ] as unknown as SessionEvent[]
    const state = foldDoublecheckState(events, detection())
    const view = viewDoublecheck(state)
    expect(view).toEqual({
      stage: 'green', color: 'green', hasSpec: true, specGoal: 'ship parser fix', reviewed: true, editCount: 1,
      gateVerdict: 'none', gateRedCount: 0,
    })
    // The wire payload passes its own schema.
    expect(doublecheckViewSchema.parse(view)).toEqual(view)
  })

  it('counts only non-test-file mutations as implementation edits', () => {
    const events = [
      mutationCall('edit', 'src/app.ts', 'e-1'),
      mutationCall('write', 'src/app.spec.ts', 'e-2'),
    ] as unknown as SessionEvent[]
    const state = foldDoublecheckState(events, detection())
    expect(viewDoublecheck(state).editCount).toBe(1)
  })

  it('ignores a failed spec attempt (error result) while keeping the goal pending', () => {
    const events = [
      specToolCall({ goal: 'g', scope: 's', acceptanceCriteria: 'a', failureModes: 'f', priorities: 'p', nonGoals: 'n' }, 'spec-1'),
      { ...toolResult('spec-1'), data: { ...toolResult('spec-1').data, error: { name: 'ToolCallError', code: 'boom' } } },
    ] as unknown as SessionEvent[]
    const state = foldDoublecheckState(events, detection())
    expect(viewDoublecheck(state).hasSpec).toBe(false)
  })

  it('moves the projection color on a settled PTC sub-dispatch test run', () => {
    const red = foldDoublecheckState([ptcDispatchRun('pnpm test', '[exit code: 1]')], detection())
    expect(red.color).toBe('red')
    expect(red.stage).toBe('red')
    const green = foldDoublecheckState([ptcDispatchRun('pnpm test', '4 passed\n[exit code: 0]')], detection())
    expect(green.color).toBe('green')
    expect(green.stage).toBe('green')
  })

  // L6 upgrade compatibility: the predecessor `tool/code-dispatch` label folds
  // to the identical projection state as the current `tool/ptc-dispatch` label.
  it('folds the predecessor dispatch label to the identical projection state', () => {
    const current = foldDoublecheckState([
      ptcDispatchRun('pnpm test', '1 failed\n[exit code: 1]'),
      ptcDispatchRun('pnpm test', '3 passed\n[exit code: 0]'),
    ], detection())
    const legacy = foldDoublecheckState([
      legacyCodeDispatchRun('pnpm test', '1 failed\n[exit code: 1]'),
      legacyCodeDispatchRun('pnpm test', '3 passed\n[exit code: 0]'),
    ], detection())
    expect(legacy).toEqual(current)
    expect(legacy.color).toBe('green')
    expect(legacy.stage).toBe('green')
  })
})
