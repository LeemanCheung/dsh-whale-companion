import { describe, expect, it } from 'vitest'
import { initialWhaleState, whaleStateSchema } from '../src/spec.ts'

describe('whale world storage schema', () => {
  it('rejects a level that does not derive from XP', () => {
    expect(() => whaleStateSchema.parse({ ...initialWhaleState(), level: 9 })).toThrow('level')
  })

  it('rejects duplicate receipt digests and moments', () => {
    const state = initialWhaleState()
    expect(() => whaleStateSchema.parse({ ...state, checkpoints: ['one', 'one'] })).toThrow('checkpoints')
    const moment = { id: 'moment-one', progressDay: '2026-08-21', at: 1, category: 'session-start', species: 'common-minke', reactionId: 'common-minke-tide', templateId: 'launch-tide', visualSeed: 1 }
    expect(() => whaleStateSchema.parse({ ...state, moments: [moment, moment] })).toThrow('moments')
  })

  it('rejects a room placement that is not owned or duplicated', () => {
    const state = initialWhaleState()
    expect(() => whaleStateSchema.parse({ ...state, room: { ...state.room, slots: { ...state.room.slots, foreground: 'first-wake' } } })).toThrow('room')
    const owned = { ...state, collectibles: [{ collectibleId: 'first-wake', variant: 0, earnedProgressDay: '2026-08-21' } as const] }
    expect(() => whaleStateSchema.parse({ ...owned, room: { ...owned.room, slots: { ...owned.room.slots, foreground: 'first-wake', backdrop: 'first-wake' } } })).toThrow('room')
  })

  it('rejects invalid expedition and community peer state', () => {
    const state = initialWhaleState()
    expect(() => whaleStateSchema.parse({ ...state, expedition: { expeditionId: 'aurora', species: 'common-minke', startedProgressDay: '2026-08-21', progress: 8, goal: 7, rewardClaimed: false } })).toThrow('progress')
    expect(() => whaleStateSchema.parse({ ...state, community: { enabled: true, aliasId: 'blue-current', peers: [{ aliasId: 'blue-current', species: 'common-minke', skin: 'ocean', activityBucket: '1', observedBucket: '1-4', resonanceStars: 1, seed: 1, importedAt: 1 }] } })).toThrow('peer alias')
  })

  it('strictly rejects unknown fields in current state', () => {
    expect(() => whaleStateSchema.parse({ ...initialWhaleState(), unexpected: true })).toThrow()
  })

  it('migrates supported v2 state into the latest state', () => {
    const v2 = { version: 2, xp: 0, level: 1, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0, checkpoints: [], achievements: [], skin: 'ocean', position: { x: .03, y: .08 }, updatedAt: 0, species: 'common-minke', resonance: {} }
    const migrated = whaleStateSchema.parse(v2)
    expect(migrated.version).toBe(5)
    expect(migrated.room.slots.foreground).toBeNull()
    expect(migrated.community.enabled).toBe(false)
  })

  it('canonicalizes supported v3 and v4 state without inferring consent', () => {
    const current = initialWhaleState()
    const { collectibles, room, expedition: _expedition, storyFragments: _stories, community: _community, ...v3Fields } = current
    const v3 = { ...v3Fields, version: 3 }
    const migratedV3 = whaleStateSchema.parse(v3)
    expect(migratedV3.version).toBe(5)
    expect(migratedV3.community.enabled).toBe(false)
    const v4 = { ...v3Fields, version: 4, collectibles, room }
    const migratedV4 = whaleStateSchema.parse(v4)
    expect(migratedV4.version).toBe(5)
    expect(migratedV4.community.peers).toEqual([])
  })
})
