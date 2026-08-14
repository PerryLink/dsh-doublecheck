import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { BundledSkillProvider, parseSkillAsset, PROVIDER_NAME } from '../src/grill/provider.ts'

const SKILLS_ROOT = fileURLToPath(new URL('../skills/', import.meta.url))
const fakeCtx = { logger: console } as unknown as Context

describe('parseSkillAsset', () => {
  it('parses the shipped frontmatter scalars and body', async () => {
    const raw = await readFile(join(SKILLS_ROOT, 'grill-requirements', 'SKILL.md'), 'utf8')
    const parsed = parseSkillAsset(raw)
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe('grill-requirements')
    expect(parsed?.description).not.toBe('')
    expect(parsed?.content).toContain('grill-requirements')
  })

  it('returns undefined for files without a frontmatter fence', () => {
    expect(parseSkillAsset('plain text')).toBeUndefined()
    expect(parseSkillAsset('---\nname: x\nno closing fence')).toBeUndefined()
  })

  it('returns undefined when name or description is missing', () => {
    expect(parseSkillAsset('---\nname: only-name\n---\nbody')).toBeUndefined()
    expect(parseSkillAsset('---\ndescription: only-description\n---\nbody')).toBeUndefined()
  })

  it('strips one layer of matching quotes from scalar values', () => {
    const parsed = parseSkillAsset('---\nname: demo-skill\ndescription: "A quoted description"\n---\nbody')
    expect(parsed?.description).toBe('A quoted description')
  })

  it('parses CRLF frontmatter (Windows checkouts)', () => {
    const parsed = parseSkillAsset('---\r\nname: demo-skill\r\ndescription: "A quoted description"\r\nwhenToUse: when testing\r\n---\r\nbody')
    expect(parsed?.name).toBe('demo-skill')
    expect(parsed?.description).toBe('A quoted description')
    expect(parsed?.whenToUse).toBe('when testing')
    expect(parsed?.content).toBe('body')
  })
})

describe('BundledSkillProvider', () => {
  const provider = new BundledSkillProvider(fakeCtx)

  it('lists the shipped skills with bundled rank and metadata', async () => {
    const candidates = await provider.list({})
    expect(candidates.map(candidate => candidate.name)).toEqual(['grill-requirements'])
    const candidate = candidates[0]
    expect(candidate?.provider).toBe(PROVIDER_NAME)
    expect(candidate?.source).toBe('bundled')
    expect(candidate?.rank).toBe(BUNDLED_SKILL_RANK)
    expect(candidate?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
    expect(candidate?.resourceBase).toEqual({
      kind: 'directory',
      path: join(SKILLS_ROOT, 'grill-requirements'),
    })
    expect(candidate?.path).toBe(join(SKILLS_ROOT, 'grill-requirements', 'SKILL.md'))
  })

  it('loads a complete skill definition for a listed candidate', async () => {
    const candidate = (await provider.list({}))[0]
    expect(candidate).toBeDefined()
    const definition = await provider.get(candidate!, {})
    expect(definition?.name).toBe('grill-requirements')
    expect(definition?.provider).toBe(PROVIDER_NAME)
    expect(definition?.content).toContain('The six dimensions')
  })
})
