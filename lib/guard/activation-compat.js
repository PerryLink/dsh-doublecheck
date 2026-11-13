/**
 * Compose the host-Agent overrides the guard forwards to a child.
 * @param model - the configured model route, or null to inherit the parent's.
 * @param reasoningEffort - the configured effort id, or undefined to inherit.
 * @returns the override bag, or undefined when nothing is configured.
 */
export function hostAgentOptions(model, reasoningEffort) {
    const options = {
        ...model !== null ? { model } : {},
        ...reasoningEffort !== undefined ? { reasoningEffort } : {},
    };
    return Object.keys(options).length === 0 ? undefined : options;
}
/**
 * Build the activation spec for either host line.
 * @param input - provider, label, task composition, and cancellation.
 * @returns the flat 0.2.2-rc.3 spec carrying the 0.2.2-rc.1 `request` alias.
 */
export function buildActivationSpec(input) {
    const composition = {
        prompt: input.prompt,
        parent: input.parent,
        ...input.outputSchema === undefined ? {} : { outputSchema: input.outputSchema },
        agentPreset: input.agentPreset,
        ...input.agentOptions === undefined ? {} : { agentOptions: input.agentOptions },
    };
    // The installed host line's declaration (0.2.2-rc.3: the whole flat spec), so
    // every field's placement below is checked against the flattened seam.
    const flat = {
        provider: input.provider,
        label: input.label,
        prompt: composition.prompt,
        parent: composition.parent,
        ...composition.outputSchema === undefined
            ? {}
            : { outputSchema: composition.outputSchema },
        agentPreset: composition.agentPreset,
        ...composition.agentOptions === undefined
            ? {}
            : { agentOptions: composition.agentOptions },
        signal: input.signal,
        delivery: input.delivery,
    };
    // One assertion: the rc.1 spec is the same composition under `request`.
    return { ...flat, request: composition };
}
