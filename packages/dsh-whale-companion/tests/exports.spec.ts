import { describe, expect, it } from 'vitest'
import { normalizePostcardText } from '../src/client/exports.ts'

describe('PNG postcard text normalization', () => {
  it('removes control characters, collapses whitespace, and enforces a bound', () => {
    expect(normalizePostcardText('  安全\u0000  航行\n记录  ', 8)).toBe('安全 航行 记录')
    expect(normalizePostcardText('123456789', 4)).toBe('1234')
  })
})
