import { describe, expect, it } from 'vitest'
import {
  claimExpedition, equipSpecies, exportCommunitySong, exportVisitorBottle, exportWhale, importCommunitySong, importVisitorBottle,
  importWhale, loadRoomPreset, placeCollectible, reduceWhale, saveRoomPreset, setCommunity, startExpedition,
} from '../src/reducer.ts'
import { initialWhaleState, type WhaleState } from '../src/spec.ts'

const event = (checkpoint: string, kind: 'turn' | 'tool' | 'session', day = '2026-08-21', at = Date.UTC(2026, 7, 21, 9)): { checkpoint: string, kind: 'turn' | 'tool' | 'session', day: string, at: number } => ({ checkpoint, kind, day, at })

function atLevel(level: number): WhaleState {
  let state = initialWhaleState()
  let index = 0
  while (state.level < level) state = reduceWhale(state, event(`grow-${index++}`, 'turn', '2026-08-21', Date.UTC(2026, 7, 21, 9, index)))
  return state
}

describe('whale world reducer', () => {
  it('awards progress once for an opaque bounded receipt', () => {
    const once = reduceWhale(initialWhaleState(), event('v5:opaque-receipt', 'turn'))
    expect(reduceWhale(once, event('v5:opaque-receipt', 'turn'))).toBe(once)
    expect(once.xp).toBe(10)
    expect(once.checkpoints).toEqual(['v5:opaque-receipt'])
  })

  it('creates a safe reaction moment without a raw checkpoint', () => {
    const state = reduceWhale(initialWhaleState(), event('v5:ABCDEF', 'session'))
    expect(state.moments).toHaveLength(1)
    expect(state.moments[0]?.id).not.toContain('session-')
    expect(state.moments[0]?.category).toBe('session-start')
    expect(state.moments[0]?.reactionId).toContain('common-minke')
  })

  it('prioritizes a level moment over a low-priority turn reaction', () => {
    const levelTwoXp = 40
    const state = { ...initialWhaleState(), xp: levelTwoXp - 10, level: 1 }
    const next = reduceWhale(state, event('level-up', 'turn'))
    expect(next.level).toBe(2)
    expect(next.moments.at(-1)?.category).toBe('level-up')
  })

  it('keeps a forgiving session streak after an absence without resetting progress', () => {
    const first = reduceWhale(initialWhaleState(), event('first', 'session', '2026-08-01'))
    const next = reduceWhale(first, event('return', 'session', '2026-08-05'))
    expect(next.streak).toBe(1)
    expect(next.xp).toBeGreaterThan(first.xp)
    expect(next.achievements).toContain('first-swim')
  })

  it('does not let repetitive tool results create a tide every time', () => {
    const first = reduceWhale(initialWhaleState(), event('tool-1', 'tool', '2026-08-21', 1_000))
    const second = reduceWhale(first, event('tool-2', 'tool', '2026-08-21', 2_000))
    expect(first.moments).toHaveLength(1)
    expect(second.moments).toHaveLength(1)
    expect(second.tools).toBe(2)
  })

  it('retains the newest thirty distinct tide days instead of only thirty events', () => {
    let state = initialWhaleState()
    for (let index = 0; index < 31; index += 1) {
      const at = Date.UTC(2026, 0, index + 1, 9)
      const day = new Date(at).toISOString().slice(0, 10)
      state = reduceWhale(state, event(`day-${index}`, 'session', day, at))
    }
    expect(new Set(state.moments.map(moment => moment.progressDay)).size).toBe(30)
    expect(state.moments.some(moment => moment.progressDay === '2026-01-01')).toBe(false)
    expect(state.moments.some(moment => moment.progressDay === '2026-01-31')).toBe(true)
  })

  it('tracks session streaks and unlocks first swim', () => {
    const first = reduceWhale(initialWhaleState(), event('a', 'session', '2026-01-01', 1))
    const next = reduceWhale(first, event('b', 'session', '2026-01-02', 2))
    expect(next.streak).toBe(2)
    expect(next.achievements).toContain('first-swim')
  })

  it('makes all twenty species equippable only after their unlock level', () => {
    const mature = atLevel(100)
    for (const species of ['common-minke', 'brydes', 'humpback', 'gray', 'beluga', 'orca', 'sperm', 'pilot', 'narwhal', 'bowhead', 'fin', 'sei', 'blue', 'southern-right', 'omura', 'cuviers-beaked', 'north-atlantic-right', 'north-pacific-right', 'rices', 'spade-toothed'] as const) expect(equipSpecies(mature, species).species).toBe(species)
    expect(() => equipSpecies(initialWhaleState(), 'orca')).toThrow('海洋等级')
  })

  it('gains deterministic collectibles and keeps room placement constrained to matching slots', () => {
    const mature = atLevel(15)
    expect(mature.collectibles.length).toBeGreaterThan(2)
    const placed = placeCollectible(mature, 'foreground', 'first-wake')
    expect(placed.room.slots.foreground).toBe('first-wake')
    expect(() => placeCollectible(mature, 'lighting', 'first-wake')).toThrow('不适合')
  })

  it('saves and restores a bounded room preset', () => {
    const mature = atLevel(15)
    const placed = placeCollectible(mature, 'foreground', 'first-wake')
    const saved = saveRoomPreset(placed)
    const cleared = placeCollectible(saved, 'foreground', null)
    expect(loadRoomPreset(cleared, 0).room.slots.foreground).toBe('first-wake')
  })

  it('advances an expedition once only after the daily session and turn pair', () => {
    const started = startExpedition(initialWhaleState(), 'aurora-cove', 'common-minke', 2, Date.UTC(2026, 7, 21, 8))
    const session = reduceWhale(started, event('s1', 'session', '2026-08-21', Date.UTC(2026, 7, 21, 9)))
    const turn = reduceWhale(session, event('t1', 'turn', '2026-08-21', Date.UTC(2026, 7, 21, 9, 1)))
    const extra = reduceWhale(turn, event('t2', 'turn', '2026-08-21', Date.UTC(2026, 7, 21, 9, 2)))
    expect(turn.expedition?.progress).toBe(1)
    expect(extra.expedition?.progress).toBe(1)
    expect(() => claimExpedition(extra)).toThrow('尚未完成')
  })

  it('exports a portable backup without receipt digests and migrates v1 data', () => {
    const progressed = reduceWhale(initialWhaleState(), event('v5:private-receipt', 'turn'))
    const backup = exportWhale(progressed)
    expect(backup).not.toContain('v5:private-receipt')
    expect(backup).not.toContain('2026-08-21')
    expect(importWhale(backup).checkpoints).toEqual([])
    const legacy = { version: 1, xp: 0, level: 1, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0, checkpoints: ['session-99:4'], achievements: [], skin: 'ocean', position: { x: .03, y: .08 }, updatedAt: 0 }
    const migrated = importWhale({ format: 'dsh-whale-companion', version: 1, state: legacy })
    expect(migrated.version).toBe(5)
    expect(migrated.checkpoints[0]).toMatch(/^legacy-/)
    expect(migrated.checkpoints[0]).not.toContain('session-99')
  })

  it('creates an isolated visitor bottle that never modifies the receiver state', () => {
    const state = placeCollectible(atLevel(15), 'foreground', 'first-wake')
    const bottle = importVisitorBottle(exportVisitorBottle(state))
    expect(bottle.room.slots.foreground).toBe('first-wake')
    expect(initialWhaleState().room.slots.foreground).toBeNull()
  })

  it('requires explicit community opt-in and only imports safe summary fields', () => {
    expect(() => exportCommunitySong(initialWhaleState())).toThrow('主动开启')
    const local = setCommunity(initialWhaleState(), true, 'blue-current')
    const peer = setCommunity(initialWhaleState(), true, 'sea-salt')
    const joined = importCommunitySong(local, exportCommunitySong(peer), 1)
    expect(joined.community.peers).toHaveLength(1)
    expect(JSON.stringify(joined.community.peers[0])).not.toContain('checkpoint')
    expect(JSON.stringify(joined.community.peers[0])).not.toContain('session')
  })
})
