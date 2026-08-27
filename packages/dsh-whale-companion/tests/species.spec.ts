import { describe, expect, it } from 'vitest'
import { WHALE_REACTION_MANIFEST, WHALE_SPECIES, whaleSpeciesId } from '../src/species.ts'

describe('whale species reaction manifest', () => {
  it('covers every canonical species exactly once', () => {
    expect(WHALE_SPECIES).toHaveLength(20)
    expect(WHALE_REACTION_MANIFEST).toHaveLength(20)
    expect(new Set(WHALE_REACTION_MANIFEST.map(item => item.speciesId))).toEqual(new Set(whaleSpeciesId))
  })

  it('gives each species a safe visible reaction with a reduced-motion equivalent', () => {
    for (const item of WHALE_REACTION_MANIFEST) {
      expect(item.reactions.length).toBeGreaterThan(0)
      for (const reaction of item.reactions) {
        expect(reaction.reactionId).toMatch(/^[a-z0-9-]+$/)
        expect(reaction.templateId).toMatch(/^[a-z0-9-]+$/)
        expect(reaction.allowedEventIds.length).toBeGreaterThan(0)
        expect(['mark', 'label']).toContain(reaction.reducedMotionEffectId)
      }
    }
  })
})
