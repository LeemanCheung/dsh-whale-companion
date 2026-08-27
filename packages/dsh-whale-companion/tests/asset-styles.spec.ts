import { describe, expect, it } from 'vitest'
import { collectibleArtStyle, speciesArtStyle } from '../src/client/asset-styles.ts'

describe('visual sprite registration', () => {
  it('maps all corners of the 6 by 4 collectible atlas', () => {
    expect(collectibleArtStyle('first-wake').backgroundPosition).toBe('0% 0%')
    expect(collectibleArtStyle('dawn-reed').backgroundPosition).toBe('20% 33.333333333333336%')
    expect(collectibleArtStyle('unknown-spire').backgroundPosition).toBe('100% 100%')
    expect(collectibleArtStyle('unknown-spire').backgroundImage).toMatch(/^url\(data:image\/jpeg;base64,/)
  })

  it('keeps the species atlas registered to its 5 by 4 grid', () => {
    expect(speciesArtStyle('common-minke').backgroundPosition).toBe('0% 0%')
    expect(speciesArtStyle('spade-toothed').backgroundPosition).toBe('100% 100%')
    expect(speciesArtStyle('spade-toothed').backgroundImage).toMatch(/^url\(data:image\/webp;base64,/)
  })
})
