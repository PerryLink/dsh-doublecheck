import { describe, expect, it } from 'vitest'
import {
  DISCIPLINE_STAGES,
  foldDisciplineStage,
  sessionHasSpec,
  SPEC_TOOL_NAME,
  successfulToolCalls,
} from '../src/domain/stages.ts'
import { toolCall, toolResult, userTask } from './helpers.ts'

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
