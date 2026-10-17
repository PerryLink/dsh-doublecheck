/**
 * Minimal shape of the 0.2.1+ `subagents.startActivation` surface. The alpha
 * host line only exposes `start(provider, request)`; keeping this structural
 * lets the same guard code compile against both.
 */
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

export interface GuardActivationService {
  startActivation?: (spec: {
    provider: string
    label: string
    request: {
      prompt: ContentBlock[]
      parent: Agent
      outputSchema: unknown
      maxDepth?: number
      agentOptions?: Record<string, unknown>
      agentPreset: string
    }
    signal: AbortSignal
    delivery: 'caller'
  }) => Promise<{
    childId: SessionId
    result: Promise<{ stopReason: string; structured?: unknown }>
    dispose(): Promise<void>
  }>
}
