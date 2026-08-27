import { describe, expect, it } from 'vitest'
import { initialWhaleState } from '../src/spec.ts'
import { nextSpeciesForLevel, shareSummary, unlockedSpeciesCount, voyageGoals } from '../src/client/planned-features.ts'

describe('planned companion growth features', () => {
  it('builds four bounded dynamic voyage goals', () => {
    const state = { ...initialWhaleState(), turns: 24, tools: 9, streak: 6, xp: 30 }
    const goals = voyageGoals(state)
    expect(goals.map(goal => goal.id)).toEqual(['level', 'turns', 'tools', 'streak'])
    expect(goals.every(goal => goal.percent >= 0 && goal.percent <= 100)).toBe(true)
    expect(goals.find(goal => goal.id === 'turns')?.target).toBe(25)
    expect(goals.find(goal => goal.id === 'streak')?.target).toBe(7)
  })

  it('derives the next encounter and unlocked species count from ocean level', () => {
    expect(unlockedSpeciesCount(1)).toBe(1)
    expect(nextSpeciesForLevel(1)?.unlockLevel).toBe(5)
    expect(nextSpeciesForLevel(100)).toBeUndefined()
  })

  it('creates a privacy-safe share summary with the companion name', () => {
    const state = { ...initialWhaleState(), name: '深蓝', level: 10, turns: 42, tools: 12, streak: 5 }
    const summary = shareSummary(state)
    expect(summary).toContain('深蓝')
    expect(summary).toContain('海洋等级 10')
    expect(summary).not.toContain('prompt')
    expect(summary).not.toContain('tool/result')
    expect(summary).not.toContain('session')
  })
})
