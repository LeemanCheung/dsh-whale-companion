import { achievementIdSchema, initialWhaleState, levelForXp, whaleStateSchema, type WhaleState } from './spec.ts'

export type WhaleObservation = Readonly<{ checkpoint: string, kind: 'turn' | 'tool' | 'session', day: string, at: number }>
export const XP = { turn: 10, tool: 5, session: 20 } as const
export const ACHIEVEMENTS = achievementIdSchema.options

export function reduceWhale(state: WhaleState, event: WhaleObservation): WhaleState {
  if (state.checkpoints.includes(event.checkpoint)) return state
  const xp = state.xp + XP[event.kind]
  const active = state.lastActiveDay === event.day
  const previous = state.lastActiveDay
  const adjacent = previous !== undefined && utcDayOffset(previous, event.day) === 1
  const streak = event.kind === 'session' && !active ? (adjacent ? state.streak + 1 : 1) : state.streak
  const next: WhaleState = {
    ...state, xp, level: levelForXp(xp),
    turns: state.turns + Number(event.kind === 'turn'), tools: state.tools + Number(event.kind === 'tool'),
    sessions: state.sessions + Number(event.kind === 'session'), streak,
    longestStreak: Math.max(state.longestStreak, streak), lastActiveDay: event.kind === 'session' ? event.day : state.lastActiveDay,
    checkpoints: [...state.checkpoints, event.checkpoint].slice(-4096), updatedAt: Math.max(state.updatedAt, event.at),
  }
  return { ...next, achievements: unlock(next, event) }
}

export function resetWhale(): WhaleState { return initialWhaleState() }
export function exportWhale(state: WhaleState): string { return JSON.stringify({ format: 'dsh-whale-companion', version: 1, state }) }
export function importWhale(raw: unknown): WhaleState {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (typeof parsed !== 'object' || parsed === null || (parsed as { format?: unknown }).format !== 'dsh-whale-companion' || (parsed as { version?: unknown }).version !== 1) throw new Error('Invalid or unsupported whale export')
  return whaleStateSchema.parse((parsed as { state: unknown }).state)
}
function unlock(state: WhaleState, event: WhaleObservation): WhaleState['achievements'] {
  const earned = new Set(state.achievements)
  const add = (id: WhaleState['achievements'][number], yes: boolean): void => { if (yes) earned.add(id) }
  add('first-swim', state.sessions >= 1); add('ten-turns', state.turns >= 10); add('century', state.turns >= 100)
  add('week-current', state.streak >= 7); add('month-tide', state.streak >= 30); add('level-five', state.level >= 5); add('level-ten', state.level >= 10)
  const utcHour = new Date(event.at).getUTCHours()
  add('tool-diver', state.tools >= 25); add('early-bird', utcHour < 6); add('night-owl', utcHour >= 20)
  add('steady-fin', state.longestStreak >= 3); add('collector', earned.size >= 8)
  return ACHIEVEMENTS.filter(id => earned.has(id))
}
function utcDayOffset(before: string, after: string): number { return Math.round((Date.parse(`${after}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) / 86_400_000) }
