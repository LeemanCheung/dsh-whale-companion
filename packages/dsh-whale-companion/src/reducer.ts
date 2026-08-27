import { z } from 'zod'
import { WHALE_COLLECTIBLE_BY_ID, WHALE_COLLECTIBLES, whaleCollectibleId, type WhaleAliasId, type WhaleCollectibleId, type WhaleRoomSlotId } from './catalog.ts'
import {
  achievementIdSchema, emptyRoomSlots, initialWhaleState, legacyWhaleStateSchema, whaleAliasIdSchema,
  whaleCollectibleIdSchema, whaleEventIdSchema, whaleRoomSlotIdSchema, whaleStateSchema, type WhaleState,
} from './spec.ts'
import {
  RESONANCE_THRESHOLDS, WHALE_REACTION_MANIFEST, WHALE_SPECIES, WHALE_SPECIES_BY_ID, isSpeciesUnlocked, levelForXp,
  resonanceStars, type WhaleEventId, type WhaleSpeciesId,
} from './species.ts'

export type WhaleObservation = Readonly<{ checkpoint: string, kind: 'turn' | 'tool' | 'session', day: string, at: number }>
export const XP = { turn: 10, tool: 5, session: 20 } as const
export const RESONANCE = { turn: 2, tool: 0, session: 2 } as const
export const ACHIEVEMENTS = achievementIdSchema.options

export const COLLECTIBLES = WHALE_COLLECTIBLES
export const COLLECTIBLE_BY_ID = WHALE_COLLECTIBLE_BY_ID

const reactionText: Record<string, string> = {
  'launch-tide': '鲸尾划开一条新的航线。', 'echo-tide': '一圈回声从深海回到海面。', 'explore-tide': '远处浮起一束陌生的光。',
  'focus-tide': '鲸鱼安静下潜，海面只留微光。', 'restore-tide': '柔和的潮水托住了这次回归。', 'group-tide': '几道海流靠近，形成短暂的编队。',
}

const communitySongSchema = z.object({
  format: z.literal('dsh-whale-song'), version: z.literal(1), member: z.object({
    aliasId: whaleAliasIdSchema, species: z.enum(WHALE_SPECIES.map(species => species.id) as [WhaleSpeciesId, ...WhaleSpeciesId[]]), skin: z.enum(['ocean', 'coral', 'midnight', 'aurora', 'sunset', 'nebula']),
    activityBucket: z.enum(['0', '1', '2-4', '5+']), observedBucket: z.enum(['1-4', '5-9', '10-14', '15-20']), resonanceStars: z.number().int().min(1).max(5), seed: z.number().int().nonnegative().max(0xffff_ffff),
  }).strict(),
}).strict()
const visitorBottleSchema = z.object({
  format: z.literal('dsh-whale-visitor-bottle'), version: z.literal(1), room: z.object({
    skin: z.enum(['ocean', 'coral', 'midnight', 'aurora', 'sunset', 'nebula']), species: z.enum(WHALE_SPECIES.map(species => species.id) as [WhaleSpeciesId, ...WhaleSpeciesId[]]),
    slots: z.object({ backdrop: whaleCollectibleIdSchema.nullable(), seafloor: whaleCollectibleIdSchema.nullable(), lighting: whaleCollectibleIdSchema.nullable(), hanging: whaleCollectibleIdSchema.nullable(), habitatLeft: whaleCollectibleIdSchema.nullable(), habitatRight: whaleCollectibleIdSchema.nullable(), foreground: whaleCollectibleIdSchema.nullable(), soundscape: whaleCollectibleIdSchema.nullable() }).strict(),
  }).strict(),
}).strict()
export type WhaleVisitorBottle = z.infer<typeof visitorBottleSchema>
export type WhalePostcard = Readonly<{ day: string, species: WhaleSpeciesId, skin: WhaleState['skin'], level: number, moments: readonly WhaleState['moments'][number][], message: string }>

/** Reduces one allowlisted, HMAC-normalized live session observation. */
export function reduceWhale(state: WhaleState, event: WhaleObservation): WhaleState {
  if (state.checkpoints.includes(event.checkpoint)) return state
  const beforeLevel = state.level
  const beforeStars = resonanceStars(state.resonance[state.species] ?? 0)
  const xp = state.xp + XP[event.kind]
  const active = state.lastActiveDay === event.day
  const previous = state.lastActiveDay
  const adjacent = previous !== undefined && utcDayOffset(previous, event.day) === 1
  const streak = event.kind === 'session' && !active ? (adjacent ? state.streak + 1 : 1) : state.streak
  const resonanceGain = RESONANCE[event.kind]
  const resonance = resonanceGain === 0 ? state.resonance : { ...state.resonance, [state.species]: Math.min(800, (state.resonance[state.species] ?? 0) + resonanceGain) }
  const base: WhaleState = {
    ...state, xp, level: levelForXp(xp), turns: state.turns + Number(event.kind === 'turn'), tools: state.tools + Number(event.kind === 'tool'),
    sessions: state.sessions + Number(event.kind === 'session'), streak, longestStreak: Math.max(state.longestStreak, streak),
    lastActiveDay: event.kind === 'session' ? event.day : state.lastActiveDay, checkpoints: [...state.checkpoints, event.checkpoint].slice(-4096), resonance,
    updatedAt: Math.max(state.updatedAt, event.at),
  }
  const withAchievements = { ...base, achievements: unlock(base, event) }
  const candidates = reactionEvents(state, withAchievements, event, beforeLevel, beforeStars, previous)
  const withReaction = recordReaction(withAchievements, candidates, event)
  const withCollectibles = refreshCollectibles(withReaction, event.day)
  return advanceExpedition(withCollectibles, event)
}

/** Equips an already unlocked whale species. */
export function equipSpecies(state: WhaleState, species: WhaleSpeciesId, at = Date.now()): WhaleState {
  const definition = WHALE_SPECIES_BY_ID[species]
  if (state.level < definition.unlockLevel) throw new Error(`${definition.nameZh}将在海洋等级 ${definition.unlockLevel} 解锁`)
  return state.species === species ? state : { ...state, species, updatedAt: Math.max(state.updatedAt, at) }
}

/** Saves one collectible into a compatible fixed room slot. */
export function placeCollectible(state: WhaleState, slot: WhaleRoomSlotId, collectible: WhaleCollectibleId | null, at = Date.now()): WhaleState {
  if (collectible !== null) {
    if (!state.collectibles.some(item => item.collectibleId === collectible)) throw new Error('该纪念物尚未获得')
    if (COLLECTIBLE_BY_ID[collectible].slot !== slot) throw new Error('该纪念物不适合这个位置')
  }
  const slots = { ...state.room.slots }
  for (const key of Object.keys(slots) as WhaleRoomSlotId[]) if (slots[key] === collectible && key !== slot) slots[key] = null
  slots[slot] = collectible
  return { ...state, room: { ...state.room, slots }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Stores up to three local room configurations. */
export function saveRoomPreset(state: WhaleState, at = Date.now()): WhaleState {
  const next = [...state.room.presets, { ...state.room.slots }].slice(-3)
  return { ...state, room: { ...state.room, presets: next }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Restores a previously saved local room configuration. */
export function loadRoomPreset(state: WhaleState, index: number, at = Date.now()): WhaleState {
  const slots = state.room.presets[index]
  if (slots === undefined) throw new Error('找不到这个小屋方案')
  return { ...state, room: { ...state.room, slots: { ...slots } }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Starts an optional, non-punitive local expedition. */
export function startExpedition(state: WhaleState, expeditionId: string, species: WhaleSpeciesId, goal = 7, at = Date.now()): WhaleState {
  if (!isSpeciesUnlocked(WHALE_SPECIES_BY_ID[species], state.level)) throw new Error('这位鲸灵尚未解锁')
  if (state.expedition !== null && !state.expedition.rewardClaimed) throw new Error('先完成当前远征')
  const day = dayOf(at)
  return { ...state, expedition: { expeditionId: normalizeId(expeditionId), species, startedProgressDay: day, progress: 0, goal: Math.max(1, Math.min(30, Math.floor(goal))), rewardClaimed: false }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Claims the completed expedition story without consuming any progress. */
export function claimExpedition(state: WhaleState, at = Date.now()): WhaleState {
  const expedition = state.expedition
  if (expedition === null || expedition.progress < expedition.goal || expedition.rewardClaimed) throw new Error('远征尚未完成')
  const fragment = `story-${expedition.expeditionId}`
  return { ...state, expedition: { ...expedition, rewardClaimed: true }, storyFragments: unique([...state.storyFragments, fragment]).slice(-64), updatedAt: Math.max(state.updatedAt, at) }
}

/** Enables local-only community sharing and chooses a preset alias. */
export function setCommunity(state: WhaleState, enabled: boolean, aliasId: WhaleAliasId, at = Date.now()): WhaleState {
  return { ...state, community: { ...state.community, enabled, aliasId, peers: state.community.peers.filter(peer => peer.aliasId !== aliasId) }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Imports a safe community summary into the local trusted-peers list. */
export function importCommunitySong(state: WhaleState, raw: unknown, at = Date.now()): WhaleState {
  if (!state.community.enabled) throw new Error('请先主动开启鲸群分享')
  const song = communitySongSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
  if (song.member.aliasId === state.community.aliasId) throw new Error('不能导入自己的鲸歌')
  const peer = { ...song.member, importedAt: at }
  return { ...state, community: { ...state.community, peers: [...state.community.peers.filter(candidate => candidate.aliasId !== peer.aliasId), peer].slice(-7) }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Removes one local trusted peer without contacting any service. */
export function removeCommunityPeer(state: WhaleState, aliasId: WhaleAliasId, at = Date.now()): WhaleState {
  return { ...state, community: { ...state.community, peers: state.community.peers.filter(peer => peer.aliasId !== aliasId) }, updatedAt: Math.max(state.updatedAt, at) }
}

/** Produces the smallest opt-in community payload without session, tool, or text data. */
export function exportCommunitySong(state: WhaleState): string {
  if (!state.community.enabled) throw new Error('请先主动开启鲸群分享')
  const activeDays = new Set(state.moments.map(moment => moment.progressDay)).size
  const observed = WHALE_SPECIES.filter(species => isSpeciesUnlocked(species, state.level)).length
  const seed = stableSeed(`${state.community.aliasId}:${state.species}:${state.level}:${state.updatedAt}`)
  return JSON.stringify({ format: 'dsh-whale-song', version: 1, member: {
    aliasId: state.community.aliasId, species: state.species, skin: state.skin, activityBucket: bucket(activeDays, [0, 1, 4]),
    observedBucket: observed <= 4 ? '1-4' : observed <= 9 ? '5-9' : observed <= 14 ? '10-14' : '15-20', resonanceStars: resonanceStars(state.resonance[state.species] ?? 0), seed,
  } })
}

/** Exports a read-only visitor bottle that cannot alter a receiving user's progress. */
export function exportVisitorBottle(state: WhaleState): string {
  return JSON.stringify({ format: 'dsh-whale-visitor-bottle', version: 1, room: { skin: state.skin, species: state.species, slots: state.room.slots } })
}

/** Validates a visitor bottle for isolated preview. */
export function importVisitorBottle(raw: unknown): WhaleVisitorBottle { return visitorBottleSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw) }

/** Resets all local whale data. */
export function resetWhale(): WhaleState { return initialWhaleState() }

/** Exports a portable backup without Session-derived checkpoint data. */
export function exportWhale(state: WhaleState): string {
  const { lastActiveDay: _lastActiveDay, updatedAt: _updatedAt, checkpoints: _checkpoints, moments: _moments, monthlyTides: _monthlyTides, reactionCooldowns: _reactionCooldowns, ...stable } = state
  const backup: WhaleState = {
    ...stable, checkpoints: [], moments: [], monthlyTides: [], reactionCooldowns: [], updatedAt: 0,
    collectibles: state.collectibles.map(item => ({ ...item, earnedProgressDay: '1970-01-01' })),
    expedition: state.expedition === null ? null : { ...state.expedition, startedProgressDay: '1970-01-01', lastAdvancedProgressDay: undefined },
    community: { ...state.community, peers: state.community.peers.map(peer => ({ ...peer, importedAt: 0 })) },
  }
  const payload = JSON.stringify({ format: 'dsh-whale-companion', version: 5, state: backup })
  if (new TextEncoder().encode(payload).byteLength > 512 * 1024) throw new Error('备份超出 512 KiB 限制')
  return payload
}

/** Imports and migrates every supported whale backup version. */
export function importWhale(raw: unknown): WhaleState {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (typeof parsed !== 'object' || parsed === null || (parsed as { format?: unknown }).format !== 'dsh-whale-companion') throw new Error('Invalid whale export')
  const version = (parsed as { version?: unknown }).version
  if (![1, 2, 3, 4, 5].includes(version as number)) throw new Error('Invalid or unsupported whale export')
  const state = (parsed as { state?: unknown }).state
  if (typeof state !== 'object' || state === null || (state as { version?: unknown }).version !== version) throw new Error('Whale export versions do not match')
  return whaleStateSchema.parse(state)
}

/** Projects the current local state into a non-sensitive SVG card view model. */
export function postcardView(state: WhaleState): WhalePostcard {
  const latest = state.moments.slice(-3)
  return { day: latest.at(-1)?.progressDay ?? dayOf(state.updatedAt), species: state.species, skin: state.skin, level: state.level, moments: latest, message: latest.at(-1) === undefined ? '海面平静，下一次航行正在等待。' : reactionMessage(latest.at(-1)!.templateId) }
}

function reactionEvents(before: WhaleState, after: WhaleState, observation: WhaleObservation, beforeLevel: number, beforeStars: number, previousDay: string | undefined): WhaleEventId[] {
  const events: WhaleEventId[] = []
  if (after.level > beforeLevel) events.push('level-up')
  if (resonanceStars(after.resonance[after.species] ?? 0) > beforeStars) events.push('resonance-star')
  if (WHALE_SPECIES.some(species => species.unlockLevel > beforeLevel && species.unlockLevel <= after.level)) events.push('species-unlock')
  if (observation.kind === 'session' && previousDay !== undefined && utcDayOffset(previousDay, observation.day) >= 3) events.push('return')
  if (observation.kind === 'session') {
    events.push('session-start')
    events.push(new Date(observation.at).getUTCHours() >= 18 || new Date(observation.at).getUTCHours() < 6 ? 'utc-night-session' : 'utc-day-session')
  }
  if (observation.kind === 'turn') events.push('user-turn')
  if (observation.kind === 'tool') events.push('tool-result')
  return events
}

function recordReaction(state: WhaleState, events: WhaleEventId[], observation: WhaleObservation): WhaleState {
  const priority: WhaleEventId[] = ['species-unlock', 'resonance-star', 'level-up', 'return', 'session-start', 'tool-result', 'user-turn']
  const primary = priority.find(event => events.includes(event))
  if (primary === undefined) return state
  const manifest = WHALE_REACTION_MANIFEST.find(item => item.speciesId === state.species)
  const reaction = manifest?.reactions.filter(item => item.allowedEventIds.includes(primary)).sort((left, right) => left.reactionId.localeCompare(right.reactionId))[0]
  if (reaction === undefined) return state
  const cooldown = state.reactionCooldowns.find(item => item.reactionId === reaction.reactionId)
  const highPriority = primary === 'species-unlock' || primary === 'resonance-star' || primary === 'level-up' || primary === 'return'
  if (!highPriority && cooldown !== undefined && observation.at - cooldown.lastAt < 30 * 60_000) return state
  const dailyCount = state.moments.filter(moment => moment.progressDay === observation.day).length
  if (dailyCount >= 5) return state
  const moment: WhaleState['moments'][number] = {
    id: `moment-${stableSeed(observation.checkpoint).toString(36)}-${reaction.reactionId}`, progressDay: observation.day, at: observation.at, category: primary, species: state.species,
    reactionId: reaction.reactionId, templateId: reaction.templateId, visualSeed: stableSeed(`${observation.checkpoint}:${reaction.reactionId}`),
  }
  const moments = [...state.moments.filter(item => item.id !== moment.id), moment]
  const { kept, removed } = compactMoments(moments)
  const monthlyTides = mergeMonthly(state.monthlyTides, removed)
  const reactionCooldowns = [...state.reactionCooldowns.filter(item => item.reactionId !== reaction.reactionId), { reactionId: reaction.reactionId, lastAt: observation.at }].sort((left, right) => left.lastAt - right.lastAt || left.reactionId.localeCompare(right.reactionId)).slice(-256)
  return { ...state, moments: kept, monthlyTides, reactionCooldowns }
}

function refreshCollectibles(state: WhaleState, day: string): WhaleState {
  const thresholds = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 82, 88, 94, 100]
  const earned = new Set(state.collectibles.map(item => item.collectibleId))
  for (const [index, threshold] of thresholds.entries()) if (state.level >= threshold) earned.add(whaleCollectibleId[index]!)
  if (state.achievements.includes('week-current')) earned.add('tidal-garden')
  if (state.achievements.includes('month-tide')) earned.add('whale-stone')
  if (resonanceStars(state.resonance[state.species] ?? 0) >= 5) earned.add('unknown-spire')
  const collectibles = whaleCollectibleId.filter(collectibleId => earned.has(collectibleId)).map(collectibleId => ({ collectibleId, variant: 0, earnedProgressDay: day }))
  return { ...state, collectibles }
}

function advanceExpedition(state: WhaleState, observation: WhaleObservation): WhaleState {
  const expedition = state.expedition
  if (expedition === null || expedition.rewardClaimed || observation.kind !== 'turn' || state.lastActiveDay !== observation.day || expedition.lastAdvancedProgressDay === observation.day) return state
  return { ...state, expedition: { ...expedition, progress: Math.min(expedition.goal, expedition.progress + 1), lastAdvancedProgressDay: observation.day } }
}

function unlock(state: WhaleState, event: WhaleObservation): WhaleState['achievements'] {
  const earned = new Set(state.achievements)
  const add = (achievement: WhaleState['achievements'][number], yes: boolean): void => { if (yes) earned.add(achievement) }
  add('first-swim', state.sessions >= 1); add('ten-turns', state.turns >= 10); add('century', state.turns >= 100)
  add('week-current', state.streak >= 7); add('month-tide', state.streak >= 30); add('level-five', state.level >= 5); add('level-ten', state.level >= 10)
  const hour = new Date(event.at).getUTCHours()
  add('tool-diver', state.tools >= 25); add('early-bird', hour < 6); add('night-owl', hour >= 20); add('steady-fin', state.longestStreak >= 3)
  if (earned.size >= 8) earned.add('collector')
  return ACHIEVEMENTS.filter(achievement => earned.has(achievement))
}

function compactMoments(moments: WhaleState['moments']): Readonly<{ kept: WhaleState['moments'], removed: WhaleState['moments'] }> {
  const ordered = [...moments].sort((left, right) => left.at - right.at || left.id.localeCompare(right.id))
  const dayLimit = new Set([...new Set(ordered.map(moment => moment.progressDay))].slice(-30))
  const recent = ordered.filter(moment => dayLimit.has(moment.progressDay))
  const kept = recent.slice(-150)
  return { kept, removed: ordered.filter(moment => !kept.some(current => current.id === moment.id)) }
}
function mergeMonthly(current: WhaleState['monthlyTides'], moments: WhaleState['moments']): WhaleState['monthlyTides'] {
  type Aggregate = { month: string, categoryCounts: Partial<Record<WhaleEventId, number>>, speciesSeen: WhaleSpeciesId[] }
  const byMonth = new Map<string, Aggregate>(current.map(tide => [tide.month, { month: tide.month, categoryCounts: { ...tide.categoryCounts }, speciesSeen: [...tide.speciesSeen] }]))
  for (const moment of moments) {
    const value: Aggregate = byMonth.get(moment.progressDay.slice(0, 7)) ?? { month: moment.progressDay.slice(0, 7), categoryCounts: {}, speciesSeen: [] }
    value.categoryCounts[moment.category] = Math.min(1_000_000, (value.categoryCounts[moment.category] ?? 0) + 1)
    if (!value.speciesSeen.includes(moment.species)) value.speciesSeen.push(moment.species)
    byMonth.set(value.month, value)
  }
  return [...byMonth.values()].map(tide => ({ ...tide, speciesSeen: tide.speciesSeen.sort() })).sort((left, right) => left.month.localeCompare(right.month)).slice(-24) as WhaleState['monthlyTides']
}
function reactionMessage(templateId: string): string { return reactionText[templateId] ?? '鲸鱼在海面留下了一段轻柔的潮汐。' }
function bucket(value: number, boundaries: readonly [number, number, number]): '0' | '1' | '2-4' | '5+' { return value <= boundaries[0] ? '0' : value <= boundaries[1] ? '1' : value <= boundaries[2] ? '2-4' : '5+' }
function normalizeId(value: string): string { const next = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); return next === '' ? 'open-sea' : next.slice(0, 80) }
function stableSeed(value: string): number { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619); return hash >>> 0 }
function unique<T>(values: readonly T[]): T[] { return [...new Set(values)] }
function dayOf(time: number): string { return new Date(time).toISOString().slice(0, 10) }
function utcDayOffset(before: string, after: string): number { return Math.round((Date.parse(`${after}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) / 86_400_000) }
