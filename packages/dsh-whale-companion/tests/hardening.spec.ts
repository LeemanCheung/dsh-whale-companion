import { describe, expect, it } from 'vitest'
import { importCommunitySong, importVisitorBottle, importWhale, MAX_IMPORT_BYTES, reduceWhale } from '../src/reducer.ts'
import { companionNameSchema, initialWhaleState, whaleStateSchema } from '../src/spec.ts'

describe('planned hardening and compatibility', () => {
  it('keeps the latest session day and streak when an older session arrives late', () => {
    const current = reduceWhale(initialWhaleState(), { checkpoint: 'current', kind: 'session', day: '2026-08-27', at: Date.UTC(2026, 7, 27, 9) })
    const late = reduceWhale(current, { checkpoint: 'late', kind: 'session', day: '2026-08-20', at: Date.UTC(2026, 7, 20, 9) })
    expect(late.sessions).toBe(2)
    expect(late.lastActiveDay).toBe('2026-08-27')
    expect(late.streak).toBe(current.streak)
  })

  it('accepts a trimmed companion name and rejects empty or oversized names', () => {
    expect(companionNameSchema.parse('  小蓝  ')).toBe('小蓝')
    expect(() => companionNameSchema.parse('   ')).toThrow()
    expect(() => companionNameSchema.parse('鲸'.repeat(21))).toThrow()
    expect(whaleStateSchema.parse({ ...initialWhaleState(), name: '星潮' }).name).toBe('星潮')
  })

  it('rejects oversized JSON before parsing every text import surface', () => {
    const payload = 'x'.repeat(MAX_IMPORT_BYTES + 1)
    expect(() => importWhale(payload)).toThrow('过大')
    expect(() => importVisitorBottle(payload)).toThrow('过大')
    expect(() => importCommunitySong({ ...initialWhaleState(), community: { ...initialWhaleState().community, enabled: true } }, payload)).toThrow('过大')
  })
})
