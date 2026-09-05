import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WHALE_SPECIES_BY_ID } from '../src/species.ts'
import { WhaleArt } from '../src/client/WhaleArt.tsx'

const clientRoot = resolve(import.meta.dirname, '../src/client')

describe('raster-only whale art contract', () => {
  it('contains no runtime vector markup or vector image export', () => {
    for (const filename of ['WhaleArt.tsx', 'exports.ts', 'feature-sections.tsx']) {
      const source = readFileSync(resolve(clientRoot, filename), 'utf8')
      expect(source).not.toMatch(/<svg|createElement\(['"]svg|image\/svg\+xml|\.svg\b/iu)
    }
  })

  it('renders ImageGen raster art for still and animated companion states', () => {
    const still = WhaleArt({ species: WHALE_SPECIES_BY_ID.humpback, skin: 'ocean', title: '座头鲸' })
    const animated = WhaleArt({ species: WHALE_SPECIES_BY_ID['common-minke'], skin: 'ocean', title: '小须鲸' })
    expect(still.type).toBe('span')
    expect(still.props['data-raster-art']).toBe('imagegen-species')
    expect(String(still.props.style.backgroundImage)).toContain('data:image/webp;base64,')
    expect(animated.type).toBe('span')
    expect(animated.props['data-raster-art']).toBe('imagegen-animation')
    expect(String(animated.props.style.backgroundImage)).toContain('data:image/webp;base64,')
    expect(String(animated.props.style['--ink-whale-still'])).toContain('data:image/png;base64,')
  })
})
