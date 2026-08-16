import { describe, expect, it } from 'vitest'
import { exportWhale, importWhale, reduceWhale } from '../src/reducer.ts'
import { initialWhaleState, type WhaleState } from '../src/spec.ts'

describe('whale progress reducer', () => {
  it('awards XP once for an idempotent checkpoint', () => {
    const event = { checkpoint: 's:1', kind: 'turn' as const, day: '2026-01-01', at: 1 }
    const once = reduceWhale(initialWhaleState(), event)
    expect(reduceWhale(once, event)).toBe(once)
    expect(once.xp).toBe(10)
  })
  it('tracks session streaks and unlocks first swim', () => {
    const first = reduceWhale(initialWhaleState(), { checkpoint: 'a', kind: 'session', day: '2026-01-01', at: 1 })
    const next = reduceWhale(first, { checkpoint: 'b', kind: 'session', day: '2026-01-02', at: 2 })
    expect(next.streak).toBe(2)
    expect(next.achievements).toContain('first-swim')
  })
  it('unlocks early bird only before 06:00 UTC, not by calendar day', () => {
    const early = reduceWhale(initialWhaleState(), { checkpoint: 'early', kind: 'turn', day: '2026-02-18', at: Date.UTC(2026, 1, 18, 5, 59) })
    const noon = reduceWhale(initialWhaleState(), { checkpoint: 'noon', kind: 'turn', day: '2026-02-01', at: Date.UTC(2026, 1, 1, 12, 0) })
    const boundary = reduceWhale(initialWhaleState(), { checkpoint: 'boundary', kind: 'turn', day: '2026-02-18', at: Date.UTC(2026, 1, 18, 6, 0) })
    expect(early.achievements).toContain('early-bird')
    expect(noon.achievements).not.toContain('early-bird')
    expect(boundary.achievements).not.toContain('early-bird')
  })
  it('keeps achievement order and unlocks collector only after eight milestones', () => {
    const firstSeven = { ...initialWhaleState(), achievements: ['first-swim', 'ten-turns', 'century', 'week-current', 'month-tide', 'level-five', 'level-ten'] as WhaleState['achievements'] }
    const eightMilestones = { ...firstSeven, achievements: [...firstSeven.achievements, 'tool-diver'] }
    const event = { checkpoint: 'collector', kind: 'turn' as const, day: '2026-02-18', at: Date.UTC(2026, 1, 18, 10) }
    expect(reduceWhale(firstSeven, event).achievements).not.toContain('collector')
    expect(reduceWhale(eightMilestones, event).achievements).toEqual([...eightMilestones.achievements, 'collector'])
  })
  it('round trips an export through schema validation and rejects unknown envelope versions', () => {
    expect(importWhale(exportWhale(initialWhaleState()))).toEqual(initialWhaleState())
    expect(() => importWhale({ format:'dsh-whale-companion',version:2,state:initialWhaleState() })).toThrow('unsupported')
  })
})
