/**
 * The `subagents.startActivation` surface the guard calls, declared at the
 * installed host line's own spec type. On 0.2.2-rc.3 that spec is flat; the
 * older lines nest the task under `request`, which is why every call goes
 * through {@link buildActivationSpec} rather than an inline literal. The
 * pre-0.2.1 `start(provider, request)` seam is feature-detected at the call
 * site instead of being declared here.
 *
 * @module dsh-doublecheck/guard/activation
 */
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { SubagentActivationSpec } from '@deepseek-ai/dsh-subagent';
export interface GuardActivationService {
    startActivation?: (spec: SubagentActivationSpec) => Promise<{
        childId: SessionId;
        result: Promise<{
            stopReason: string;
            structured?: unknown;
        }>;
        dispose(): Promise<void>;
    }>;
}
