import { describe, expect, it } from 'vitest'
import { initialWhaleState } from '../src/spec.ts'
import { coveItems, currentStoryBeat, reactionDuration, reactionPresentation, sevenDayJournal, shouldPresentReaction } from '../src/client/view-model.ts'

const moment = (day: string, category: 'session-start' | 'level-up', id: string) => ({ id, progressDay: day, at: Date.parse(`${day}T12:00:00Z`), category, species: 'common-minke' as const, reactionId: 'common-minke-tide', templateId: 'launch-tide', visualSeed: 1 })

describe('whale client view models', () => {
  it('projects seven calendar days with quiet gaps', () => {
    const state = { ...initialWhaleState(), moments: [moment('2026-08-15', 'session-start', 'one'), moment('2026-08-21', 'level-up', 'two')] }
    const journal = sevenDayJournal(state)
    expect(journal).toHaveLength(7)
    expect(journal[0]).toMatchObject({ day: '2026-08-15', count: 1 })
    expect(journal[1]).toMatchObject({ day: '2026-08-16', count: 0 })
    expect(journal[6]).toMatchObject({ day: '2026-08-21', count: 1, primary: 'level-up' })
  })

  it('marks milestone reactions high and ordinary turns low', () => {
    expect(reactionPresentation(moment('2026-08-21', 'level-up', 'high'))?.priority).toBe('high')
    const low = { ...moment('2026-08-21', 'session-start', 'low'), category: 'user-turn' as const }
    expect(reactionPresentation(low)?.priority).toBe('low')
  })

  it('shows each fresh reaction once and respects quiet, stale, hidden, and future states', () => {
    const reaction = reactionPresentation(moment('2026-08-21', 'level-up', 'fresh'))!
    const now = Date.parse('2026-08-21T12:00:30Z')
    expect(shouldPresentReaction({ reaction, occurredAt: now - 1_000, now, hidden: false, mode: 'quiet' })).toBe(true)
    expect(shouldPresentReaction({ reaction, previousId: reaction.id, occurredAt: now - 1_000, now, hidden: false, mode: 'lively' })).toBe(false)
    expect(shouldPresentReaction({ reaction, occurredAt: now - 61_000, now, hidden: false, mode: 'standard' })).toBe(false)
    expect(shouldPresentReaction({ reaction, occurredAt: now, now, hidden: true, mode: 'standard' })).toBe(false)
    expect(shouldPresentReaction({ reaction, occurredAt: now + 6_000, now, hidden: false, mode: 'standard' })).toBe(false)
    const low = reactionPresentation({ ...moment('2026-08-21', 'session-start', 'low'), category: 'user-turn' as const })!
    expect(shouldPresentReaction({ reaction: low, occurredAt: now, now, hidden: false, mode: 'quiet' })).toBe(false)
    expect(reactionDuration('quiet')).toBeLessThan(reactionDuration('lively'))
  })

  it('derives one current story beat from resonance instead of persisted story data', () => {
    const state = { ...initialWhaleState(), resonance: { 'common-minke': 180 } }
    expect(currentStoryBeat(state)).toMatchObject({ star: 3, title: '并肩深潜' })
  })

  it('projects the eight room slots without inventing unowned items', () => {
    const state = initialWhaleState()
    const cove = coveItems(state)
    expect(cove).toHaveLength(8)
    expect(cove.every(item => !item.occupied && item.itemName === undefined)).toBe(true)
  })
})
