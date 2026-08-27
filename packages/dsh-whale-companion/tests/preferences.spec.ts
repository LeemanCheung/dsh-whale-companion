import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESENTATION, PRESENTATION_STORAGE_KEY, parsePresentation, readPresentation, writePresentation, type StorageLike } from '../src/client/preferences.ts'

describe('local whale presentation preferences', () => {
  it('strictly falls back for malformed or unknown values', () => {
    expect(parsePresentation('{broken')).toEqual(DEFAULT_PRESENTATION)
    expect(parsePresentation(JSON.stringify({ mode: 'noisy', reduceMotion: false }))).toEqual(DEFAULT_PRESENTATION)
    expect(parsePresentation(JSON.stringify({ mode: 'quiet', reduceMotion: true }))).toEqual({ mode: 'quiet', reduceMotion: true })
  })

  it('contains only presentation values and never host progress fields', () => {
    const writes: string[] = []
    const storage: StorageLike = { getItem: () => null, setItem: (key, value) => { writes.push(`${key}:${value}`) } }
    expect(writePresentation(storage, { mode: 'lively', reduceMotion: false })).toBe(true)
    expect(writes[0]).toContain(PRESENTATION_STORAGE_KEY)
    expect(writes[0]).not.toMatch(/session|checkpoint|moment|community|species/iu)
  })

  it('survives storage access and quota failures', () => {
    const storage: StorageLike = { getItem: () => { throw new DOMException('denied', 'SecurityError') }, setItem: () => { throw new DOMException('full', 'QuotaExceededError') } }
    expect(readPresentation(storage)).toEqual({ value: DEFAULT_PRESENTATION, available: false })
    expect(writePresentation(storage, { mode: 'quiet', reduceMotion: true })).toBe(false)
  })
})
