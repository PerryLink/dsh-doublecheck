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
  mutationCall,
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
})
