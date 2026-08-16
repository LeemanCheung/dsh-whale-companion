import { describe, expect, it } from 'vitest'
import { whaleStateSchema } from '../src/spec.ts'

describe('whale storage schema', () => {
  it('rejects a level that does not derive from XP', () => {
    expect(() => whaleStateSchema.parse({ version: 1, xp: 0, level: 9, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0, checkpoints: [], achievements: [], skin: 'ocean', updatedAt: 0 })).toThrow()
  })
  it('rejects duplicate checkpoints', () => {
    expect(() => whaleStateSchema.parse({ version: 1, xp: 0, level: 1, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0, checkpoints: ['x', 'x'], achievements: [], skin: 'ocean', updatedAt: 0 })).toThrow()
  })
})
