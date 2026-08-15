/**
 * Shared discipline vocabulary: the durable structured facts the review and
 * report modules exchange. Kept type-only and import-cycle-free so events,
 * domain folds, and tool implementations all read the same definitions.
 *
 * @module dsh-doublecheck/domain/vocabulary
 */
/** All six spec fields, in declaration order. */
export const SPEC_FIELD_NAMES = [
    'goal', 'scope', 'acceptanceCriteria', 'failureModes', 'priorities', 'nonGoals',
];
/** All verify dimensions, in spec order. */
export const VERIFY_DIMENSIONS = [
    'goal',
    'scope',
    'acceptanceCriteria',
    'failureModes',
    'priorities',
    'nonGoals',
];
