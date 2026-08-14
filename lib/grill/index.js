/**
 * The grill module: dsh-doublecheck's requirements-furnace plugin.
 *
 * Registers the bundled `skills/` directory on the DSH skill registry (the
 * official skill capability seam), exposes the model-facing catalog/loader
 * tool `doublecheck_skills`, and provides `doublecheck_spec` — the tool that
 * commits a grilled requirements spec to the session log (via its own
 * `tool/result`) and to a workspace markdown file.
 *
 * @module dsh-doublecheck/grill
 */
import { renderSkillContent } from '@deepseek-ai/dsh-skill';
import { defineTool } from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import { SPEC_TOOL_NAME } from "../domain/stages.js";
import { BundledSkillProvider, PROVIDER_NAME } from "./provider.js";
export const name = 'doublecheck-grill';
export const inject = ['skills', 'tools'];
export const Config = z.object({
    specFile: z.string().min(1).default('doublecheck-spec.md'),
});
/** Model-facing catalog of the package's own skills, one line per skill. */
function renderCatalog(skills) {
    if (skills.length === 0)
        return 'No doublecheck skills are currently available.';
    return [
        'The following doublecheck discipline skills are available:',
        ...skills.map(skill => `- \`${skill.name}\`: ${skill.description}`),
    ].join('\n');
}
/** The rendered spec document written to the workspace and shown to the model. */
export function renderSpecMarkdown(spec) {
    return [
        '# Doublecheck spec',
        '',
        '## Goal',
        spec.goal,
        '',
        '## Scope',
        spec.scope,
        '',
        '## Acceptance criteria',
        spec.acceptanceCriteria,
        '',
        '## Failure modes',
        spec.failureModes,
        '',
        '## Priorities',
        spec.priorities,
        '',
        '## Non-goals',
        spec.nonGoals,
        '',
    ].join('\n');
}
/**
 * Install the grill module: bundled skill provider plus its two tools.
 * @param ctx - plugin context; registrations unwind with it.
 * @param config - validated {@link Config}.
 */
export function apply(ctx, config) {
    ctx.skills.registerProvider(() => new BundledSkillProvider(ctx));
    ctx.tools.register(defineTool({
        name: 'doublecheck_skills',
        description: 'List the doublecheck engineering-discipline skills, or load the full instructions of one by its exact name. Call this before acting on a task that names or clearly matches one of them.',
        parameters: {
            name: {
                type: 'string',
                description: 'Exact skill name to load; omit to list every available doublecheck skill.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    skills: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: { type: 'string', required: true },
                                description: { type: 'string', required: true },
                                whenToUse: { type: 'string' },
                            },
                        },
                    },
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    resourceBase: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            kind: { type: 'string', required: true, const: 'directory' },
                            path: { type: 'string', required: true },
                        },
                    },
                    content: { type: 'string' },
                },
            },
            render: (_args, value) => {
                if (value.content === undefined || value.provider === undefined) {
                    return [{ type: 'text', text: renderCatalog(value.skills) }];
                }
                const name = value.name ?? _args.name ?? '';
                const loaded = renderSkillContent({
                    name,
                    provider: value.provider,
                    ...value.resourceBase !== undefined ? { resourceBase: value.resourceBase } : {},
                    content: value.content,
                });
                return [{ type: 'text', text: loaded }];
            },
        },
        async execute(args, exec) {
            const lookup = { cwd: exec.agent?.session.header.cwd, signal: exec.signal, scope: exec.agent };
            const summaries = (await ctx.skills.list(lookup)).filter(skill => skill.provider === PROVIDER_NAME);
            const skills = summaries.map(({ name: skillName, description, whenToUse }) => ({
                name: skillName,
                description,
                ...whenToUse !== undefined ? { whenToUse } : {},
            }));
            if (args.name === undefined)
                return { skills };
            const skill = await ctx.skills.get(args.name, lookup);
            if (skill === undefined || skill.provider !== PROVIDER_NAME) {
                throw new Error(`skill "${args.name}" is not a doublecheck skill or is no longer available`);
            }
            const resourceBase = skill.resourceBase !== undefined && skill.resourceBase.kind === 'directory'
                ? { kind: 'directory', path: skill.resourceBase.path }
                : undefined;
            return {
                skills,
                name: skill.name,
                provider: skill.provider,
                ...resourceBase !== undefined ? { resourceBase } : {},
                content: skill.content,
            };
        },
        presentCall(args) {
            return args.name === undefined
                ? { card: 'generic', title: 'List doublecheck skills', kind: 'read' }
                : { card: 'generic', title: `Load skill ${args.name}`, kind: 'read', rawInput: args.name };
        },
    }));
    ctx.tools.register(defineTool({
        name: SPEC_TOOL_NAME,
        description: 'Record the grilled requirements spec for the current task. Fill all six fields after the requirements grill reaches consensus (goal, scope, acceptance criteria, failure modes, priorities, non-goals), so the contract is kept in the session and written to the workspace before implementation starts.',
        parameters: {
            goal: { type: 'string', required: true, description: 'What outcome the work must produce, in one verifiable sentence.' },
            scope: { type: 'string', required: true, description: 'What is in scope and what is out of scope for this change.' },
            acceptanceCriteria: { type: 'string', required: true, description: 'Observable checks that prove the work is done.' },
            failureModes: { type: 'string', required: true, description: 'What can go wrong and the correct behavior in each case.' },
            priorities: { type: 'string', required: true, description: 'What to trade when goals conflict; what is optional.' },
            nonGoals: { type: 'string', required: true, description: 'What the user explicitly does not want.' },
            filePath: { type: 'string', description: 'Optional workspace path for the markdown copy. Defaults to the configured spec file in the session working directory.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    spec: {
                        type: 'object',
                        required: true,
                        additionalProperties: false,
                        properties: {
                            goal: { type: 'string', required: true },
                            scope: { type: 'string', required: true },
                            acceptanceCriteria: { type: 'string', required: true },
                            failureModes: { type: 'string', required: true },
                            priorities: { type: 'string', required: true },
                            nonGoals: { type: 'string', required: true },
                        },
                    },
                    path: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                    written: { type: 'boolean', required: true },
                },
            },
            render: (_args, value) => {
                const note = value.written
                    ? `Recorded to ${value.path}.`
                    : 'No workspace copy was written; the spec is recorded in this session only.';
                return [{ type: 'text', text: `${renderSpecMarkdown(value.spec)}\n${note}` }];
            },
        },
        async execute(args, exec) {
            const spec = {
                goal: args.goal,
                scope: args.scope,
                acceptanceCriteria: args.acceptanceCriteria,
                failureModes: args.failureModes,
                priorities: args.priorities,
                nonGoals: args.nonGoals,
            };
            const outcome = await writeSpecFile(ctx, spec, args.filePath ?? config.specFile, exec);
            if (exec.agent !== undefined) {
                ctx.emit('doublecheck/spec', { session: exec.agent.session, spec, ...outcome });
            }
            return { spec, ...outcome };
        },
        presentCall(args) {
            return {
                card: 'generic',
                title: 'Record doublecheck spec',
                kind: 'edit',
                content: [{ type: 'text', text: args.goal.length > 240 ? `${args.goal.slice(0, 240)}…` : args.goal }],
            };
        },
    }));
}
/** Write the spec markdown through the filesystem seam, when one exists. */
async function writeSpecFile(ctx, spec, filePath, exec) {
    const fs = ctx.get('fs');
    if (fs === undefined)
        return { path: null, written: false };
    let target;
    try {
        target = await fs.resolve(filePath, {
            ...exec.agent?.session.header.cwd !== undefined ? { cwd: exec.agent.session.header.cwd } : {},
            signal: exec.signal,
        });
        await fs.writeText(target, renderSpecMarkdown(spec), undefined, exec.signal);
    }
    catch (error) {
        // Any write failure leaves the spec recorded in the session (the tool
        // result is the durable snapshot); the outcome reports `written: false`
        // instead of failing the commit.
        exec.signal.throwIfAborted();
        ctx.logger.debug(`dsh-doublecheck: spec file write skipped: ${String(error)}`);
        return { path: null, written: false };
    }
    return { path: target.displayPath, written: true };
}
//# sourceMappingURL=index.js.map