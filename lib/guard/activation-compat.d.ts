/**
 * One `subagents.startActivation` spec that every supported host line reads.
 *
 * The activation spec was reshaped between 0.2.2-rc.1 and 0.2.2-rc.3:
 *
 * - 0.2.2-rc.1: `{ provider, label, request: { prompt, parent, ... } }` — the
 *   task composition is nested under `request`;
 * - 0.2.2-rc.3: `SubagentActivationSpec extends SubagentStartRequest` — the same
 *   fields sit directly on the spec (`prompt`, `parent`, `outputSchema`,
 *   `agentPreset`, `agentOptions`).
 *
 * A nested-only spec is silently unactable on rc.3 (`prompt` reads as
 * undefined), so send both forms: the flat fields, plus the same composition
 * under `request` for rc.1. The flat half is built at the installed host
 * line's own declaration, so the flattening is checked at build time; the
 * aliasing object is asserted once because no single declaration admits both
 * keys at once.
 *
 * @module dsh-doublecheck/guard/activation-compat
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { SubagentActivationSpec } from '@deepseek-ai/dsh-subagent';
/** The task/composition half of an activation, wherever the host line stores it. */
export interface ActivationComposition {
    /** Content delivered as the child's user message. */
    prompt: ContentBlock[];
    /** The spawning agent: seeds a forked child and supplies its default cwd. */
    parent: Agent;
    /** Structured output the child must satisfy, when one is required. */
    outputSchema?: unknown;
    /** Read-only Agent Preset the child is composed from. */
    agentPreset: string;
    /** Host-Agent overrides (model, reasoning effort) for the child. */
    agentOptions?: Record<string, unknown>;
}
/** Everything one activation needs, in the host-independent shape. */
export interface ActivationStartInput extends ActivationComposition {
    /** Registered subagent backend to run the child on. */
    provider: string;
    /** Short task label retained in cataloged child membership. */
    label: string;
    /** Caller cancellation, forwarded to the host's activation. */
    signal: AbortSignal;
    /** The guard only ever observes the result itself. */
    delivery: 'caller';
}
/**
 * Compose the host-Agent overrides the guard forwards to a child.
 * @param model - the configured model route, or null to inherit the parent's.
 * @param reasoningEffort - the configured effort id, or undefined to inherit.
 * @returns the override bag, or undefined when nothing is configured.
 */
export declare function hostAgentOptions(model: string | null, reasoningEffort?: string): Record<string, unknown> | undefined;
/**
 * Build the activation spec for either host line.
 * @param input - provider, label, task composition, and cancellation.
 * @returns the flat 0.2.2-rc.3 spec carrying the 0.2.2-rc.1 `request` alias.
 */
export declare function buildActivationSpec(input: ActivationStartInput): SubagentActivationSpec;
