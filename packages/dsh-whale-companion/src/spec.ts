import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { whaleAliasId, whaleCollectibleId, whaleRoomSlotId, type WhaleAliasId, type WhaleCollectibleId, type WhaleRoomSlotId } from './catalog.ts'
import { WHALE_SPECIES_BY_ID, levelForXp, whaleSpeciesId, type WhaleEventId, type WhaleSpeciesId } from './species.ts'

export { whaleAliasId, whaleCollectibleId, whaleRoomSlotId }
export type { WhaleAliasId, WhaleCollectibleId, WhaleRoomSlotId }

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const smallCount = z.number().int().nonnegative().max(1_000_000)
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = z.string().regex(/^\d{4}-\d{2}$/)
const id = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/)

export const skinSchema = z.enum(['ocean', 'coral', 'midnight', 'aurora', 'sunset', 'nebula'])
export const whaleSpeciesIdSchema = z.enum(whaleSpeciesId)
export const whalePositionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict()
export type WhalePosition = z.infer<typeof whalePositionSchema>
export const achievementIdSchema = z.enum([
  'first-swim', 'ten-turns', 'century', 'week-current', 'month-tide', 'level-five',
  'level-ten', 'tool-diver', 'early-bird', 'night-owl', 'steady-fin', 'collector',
])

export const whaleEventIdSchema = z.enum([
  'session-start', 'utc-day-session', 'utc-night-session', 'user-turn', 'tool-result',
  'level-up', 'resonance-star', 'species-unlock', 'return',
] satisfies readonly WhaleEventId[])

export const whaleCollectibleIdSchema = z.enum(whaleCollectibleId)
export const whaleRoomSlotIdSchema = z.enum(whaleRoomSlotId)
export const whaleAliasIdSchema = z.enum(whaleAliasId)

const roomSlotsSchema = z.object({
  backdrop: whaleCollectibleIdSchema.nullable(), seafloor: whaleCollectibleIdSchema.nullable(),
  lighting: whaleCollectibleIdSchema.nullable(), hanging: whaleCollectibleIdSchema.nullable(),
  habitatLeft: whaleCollectibleIdSchema.nullable(), habitatRight: whaleCollectibleIdSchema.nullable(),
  foreground: whaleCollectibleIdSchema.nullable(), soundscape: whaleCollectibleIdSchema.nullable(),
}).strict()

const roomSchema = z.object({ slots: roomSlotsSchema, presets: z.array(roomSlotsSchema).max(3) }).strict()
const momentSchema = z.object({
  id, progressDay: day, at: timestamp, category: whaleEventIdSchema, species: whaleSpeciesIdSchema,
  reactionId: id, templateId: id, visualSeed: z.number().int().nonnegative().max(0xffff_ffff),
}).strict()
const monthlyTideSchema = z.object({
  month,
  categoryCounts: z.partialRecord(whaleEventIdSchema, smallCount),
  speciesSeen: z.array(whaleSpeciesIdSchema).max(20),
}).strict()
const cooldownSchema = z.object({ reactionId: id, lastAt: timestamp }).strict()
const collectibleSchema = z.object({ collectibleId: whaleCollectibleIdSchema, variant: z.number().int().min(0).max(9), earnedProgressDay: day }).strict()
const expeditionSchema = z.object({
  expeditionId: id, species: whaleSpeciesIdSchema, startedProgressDay: day, lastAdvancedProgressDay: day.optional(),
  progress: z.number().int().nonnegative().max(30), goal: z.number().int().min(1).max(30), rewardClaimed: z.boolean(),
}).strict().superRefine((value, ctx) => { if (value.progress > value.goal) ctx.addIssue({ code: 'custom', path: ['progress'], message: 'progress must not exceed goal' }) })
const communityPeerSchema = z.object({
  aliasId: whaleAliasIdSchema, species: whaleSpeciesIdSchema, skin: skinSchema,
  activityBucket: z.enum(['0', '1', '2-4', '5+']), observedBucket: z.enum(['1-4', '5-9', '10-14', '15-20']),
  resonanceStars: z.number().int().min(1).max(5), seed: z.number().int().nonnegative().max(0xffff_ffff), importedAt: timestamp,
}).strict()
const communitySchema = z.object({ enabled: z.boolean(), aliasId: whaleAliasIdSchema, peers: z.array(communityPeerSchema).max(7) }).strict()

const sharedState = {
  xp: count, level: count, turns: count, sessions: count, tools: count, streak: count, longestStreak: count,
  lastActiveDay: day.optional(), checkpoints: z.array(z.string().min(1).max(64)).max(4096),
  achievements: z.array(achievementIdSchema), skin: skinSchema, position: whalePositionSchema, updatedAt: timestamp,
} as const

export const legacyWhaleStateSchema = z.object({ version: z.literal(1), ...sharedState }).strict().superRefine((state, ctx) => {
  if (state.level !== legacyLevelForXp(state.xp)) ctx.addIssue({ code: 'custom', path: ['level'], message: 'level must match legacy xp' })
  validateCollections(state, ctx)
})
export type LegacyWhaleState = z.infer<typeof legacyWhaleStateSchema>

const v2WhaleStateSchema = z.object({
  version: z.literal(2), ...sharedState, species: whaleSpeciesIdSchema,
  resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
}).strict().superRefine((state, ctx) => validateV2(state, ctx))

const v3WhaleStateSchema = z.object({
  version: z.literal(3), ...sharedState, species: whaleSpeciesIdSchema,
  resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
  moments: z.array(momentSchema).max(150), monthlyTides: z.array(monthlyTideSchema).max(24),
  reactionCooldowns: z.array(cooldownSchema).max(256),
}).strict().superRefine((state, ctx) => validateV3(state, ctx))

const v4WhaleStateSchema = z.object({
  version: z.literal(4), ...sharedState, species: whaleSpeciesIdSchema,
  resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
  moments: z.array(momentSchema).max(150), monthlyTides: z.array(monthlyTideSchema).max(24),
  reactionCooldowns: z.array(cooldownSchema).max(256), collectibles: z.array(collectibleSchema).max(128), room: roomSchema,
}).strict().superRefine((state, ctx) => validateV4(state, ctx))

const currentWhaleStateSchema = z.object({
  version: z.literal(5), ...sharedState, species: whaleSpeciesIdSchema,
  resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
  moments: z.array(momentSchema).max(150), monthlyTides: z.array(monthlyTideSchema).max(24),
  reactionCooldowns: z.array(cooldownSchema).max(256), collectibles: z.array(collectibleSchema).max(128), room: roomSchema,
  expedition: expeditionSchema.nullable(), storyFragments: z.array(id).max(64), community: communitySchema,
}).strict().superRefine((state, ctx) => validateV5(state, ctx))

export type WhaleState = z.infer<typeof currentWhaleStateSchema>
export const whaleStateSchema = z.union([
  currentWhaleStateSchema,
  v4WhaleStateSchema.transform(migrateV4),
  v3WhaleStateSchema.transform(migrateV3),
  v2WhaleStateSchema.transform(migrateV2),
  legacyWhaleStateSchema.transform(migrateLegacyWhaleState),
])

export const whaleDomainSpec = defineDomain({ name: 'whale_companion', version: 1, tables: { state: domainTable<string, WhaleState>(whaleStateSchema) } })

export const emptyRoomSlots = (): WhaleState['room']['slots'] => ({ backdrop: null, seafloor: null, lighting: null, hanging: null, habitatLeft: null, habitatRight: null, foreground: null, soundscape: null })

export const initialWhaleState = (): WhaleState => ({
  version: 5, xp: 0, level: 1, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0,
  checkpoints: [], achievements: [], skin: 'ocean', species: 'common-minke', resonance: {}, position: { x: 0.03, y: 0.08 }, updatedAt: 0,
  moments: [], monthlyTides: [], reactionCooldowns: [], collectibles: [], room: { slots: emptyRoomSlots(), presets: [] },
  expedition: null, storyFragments: [], community: { enabled: false, aliasId: 'blue-current', peers: [] },
})

export function legacyLevelForXp(xp: number): number { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1 }

function migrateLegacyWhaleState(state: LegacyWhaleState): WhaleState {
  return canonicalV5({
    ...state, level: levelForXp(state.xp), checkpoints: state.checkpoints.map(legacyCheckpoint), species: 'common-minke', resonance: {},
  } as Record<string, unknown>)
}

function migrateV2(state: z.infer<typeof v2WhaleStateSchema>): WhaleState { return canonicalV5({ ...state, checkpoints: state.checkpoints.map(legacyCheckpoint) } as Record<string, unknown>) }
function migrateV3(state: z.infer<typeof v3WhaleStateSchema>): WhaleState { return canonicalV5({ ...state, checkpoints: state.checkpoints.map(legacyCheckpoint) } as Record<string, unknown>) }
function migrateV4(state: z.infer<typeof v4WhaleStateSchema>): WhaleState { return canonicalV5({ ...state, checkpoints: state.checkpoints.map(legacyCheckpoint) } as Record<string, unknown>) }

function canonicalV5(state: Record<string, unknown>): WhaleState {
  const legacy = { ...initialWhaleState(), ...state } as WhaleState
  const level = levelForXp(legacy.xp)
  const gained = new Set(legacy.achievements)
  if (level >= 5) gained.add('level-five')
  if (level >= 10) gained.add('level-ten')
  if (gained.size >= 8) gained.add('collector')
  const unlockedResonance = Object.fromEntries(Object.entries(legacy.resonance).filter(([species]) => level >= WHALE_SPECIES_BY_ID[species as WhaleSpeciesId].unlockLevel)) as WhaleState['resonance']
  const species = level >= WHALE_SPECIES_BY_ID[legacy.species].unlockLevel ? legacy.species : 'common-minke'
  return {
    ...legacy, version: 5, level, species, resonance: unlockedResonance,
    checkpoints: unique(legacy.checkpoints).slice(-4096), achievements: achievementIdSchema.options.filter(achievement => gained.has(achievement)),
    moments: canonicalMoments(legacy.moments), monthlyTides: canonicalMonthlyTides(legacy.monthlyTides), reactionCooldowns: canonicalCooldowns(legacy.reactionCooldowns),
    collectibles: canonicalCollectibles(legacy.collectibles ?? []), room: canonicalRoom(legacy.room), expedition: legacy.expedition ?? null,
    storyFragments: unique(legacy.storyFragments ?? []).slice(-64), community: canonicalCommunity(legacy.community),
  }
}

function validateV2(state: z.infer<typeof v2WhaleStateSchema>, ctx: z.RefinementCtx): void {
  if (state.level !== levelForXp(state.xp)) ctx.addIssue({ code: 'custom', path: ['level'], message: 'level must match xp' })
  if (state.level < WHALE_SPECIES_BY_ID[state.species].unlockLevel) ctx.addIssue({ code: 'custom', path: ['species'], message: 'equipped species must be unlocked' })
  for (const species of Object.keys(state.resonance) as WhaleSpeciesId[]) if (state.level < WHALE_SPECIES_BY_ID[species].unlockLevel) ctx.addIssue({ code: 'custom', path: ['resonance', species], message: 'resonance species must be unlocked' })
  validateCollections(state, ctx)
}
function validateV3(state: z.infer<typeof v3WhaleStateSchema>, ctx: z.RefinementCtx): void { validateV2(state as unknown as z.infer<typeof v2WhaleStateSchema>, ctx); validateMomentCollections(state as unknown as WhaleState, ctx) }
function validateV4(state: z.infer<typeof v4WhaleStateSchema>, ctx: z.RefinementCtx): void { validateV3(state as unknown as z.infer<typeof v3WhaleStateSchema>, ctx); validateRoom(state as unknown as WhaleState, ctx) }
function validateV5(state: WhaleState, ctx: z.RefinementCtx): void {
  validateV4(state as unknown as z.infer<typeof v4WhaleStateSchema>, ctx)
  if (new Set(state.storyFragments).size !== state.storyFragments.length) ctx.addIssue({ code: 'custom', path: ['storyFragments'], message: 'story fragments must be unique' })
  if (new Set(state.community.peers.map(peer => peer.aliasId)).size !== state.community.peers.length) ctx.addIssue({ code: 'custom', path: ['community', 'peers'], message: 'peer aliases must be unique' })
  if (state.community.peers.some(peer => peer.aliasId === state.community.aliasId)) ctx.addIssue({ code: 'custom', path: ['community', 'peers'], message: 'peer alias cannot match self' })
}
function validateCollections(state: Pick<WhaleState, 'checkpoints' | 'achievements'>, ctx: z.RefinementCtx): void {
  if (new Set(state.checkpoints).size !== state.checkpoints.length) ctx.addIssue({ code: 'custom', path: ['checkpoints'], message: 'checkpoints must be unique' })
  if (new Set(state.achievements).size !== state.achievements.length) ctx.addIssue({ code: 'custom', path: ['achievements'], message: 'achievements must be unique' })
}
function validateMomentCollections(state: Pick<WhaleState, 'moments' | 'monthlyTides' | 'reactionCooldowns'>, ctx: z.RefinementCtx): void {
  if (new Set(state.moments.map(moment => moment.id)).size !== state.moments.length) ctx.addIssue({ code: 'custom', path: ['moments'], message: 'moments must be unique' })
  if (new Set(state.monthlyTides.map(tide => tide.month)).size !== state.monthlyTides.length) ctx.addIssue({ code: 'custom', path: ['monthlyTides'], message: 'months must be unique' })
  if (new Set(state.reactionCooldowns.map(cooldown => cooldown.reactionId)).size !== state.reactionCooldowns.length) ctx.addIssue({ code: 'custom', path: ['reactionCooldowns'], message: 'reaction cooldowns must be unique' })
}
function validateRoom(state: Pick<WhaleState, 'collectibles' | 'room'>, ctx: z.RefinementCtx): void {
  const collected = new Set(state.collectibles.map(item => item.collectibleId))
  const placed = Object.values(state.room.slots).filter((item): item is WhaleCollectibleId => item !== null)
  if (new Set(placed).size !== placed.length) ctx.addIssue({ code: 'custom', path: ['room', 'slots'], message: 'a collectible can occupy only one slot' })
  if (placed.some(item => !collected.has(item))) ctx.addIssue({ code: 'custom', path: ['room', 'slots'], message: 'room item must be collected' })
}
function canonicalMoments(moments: WhaleState['moments']): WhaleState['moments'] { return uniqueBy(moments, moment => moment.id).sort((left, right) => left.at - right.at || left.id.localeCompare(right.id)).slice(-150) }
function canonicalMonthlyTides(tides: WhaleState['monthlyTides']): WhaleState['monthlyTides'] { return uniqueBy(tides, tide => tide.month).sort((left, right) => left.month.localeCompare(right.month)).slice(-24) }
function canonicalCooldowns(cooldowns: WhaleState['reactionCooldowns']): WhaleState['reactionCooldowns'] { return uniqueBy(cooldowns, cooldown => cooldown.reactionId).sort((left, right) => left.lastAt - right.lastAt || left.reactionId.localeCompare(right.reactionId)).slice(-256) }
function canonicalCollectibles(items: WhaleState['collectibles']): WhaleState['collectibles'] { return uniqueBy(items, item => item.collectibleId).slice(-128) }
function canonicalRoom(room: WhaleState['room'] | undefined): WhaleState['room'] { return room === undefined ? { slots: emptyRoomSlots(), presets: [] } : { slots: { ...emptyRoomSlots(), ...room.slots }, presets: room.presets.slice(0, 3).map(slots => ({ ...emptyRoomSlots(), ...slots })) } }
function canonicalCommunity(community: WhaleState['community'] | undefined): WhaleState['community'] { return community === undefined ? initialWhaleState().community : { ...community, peers: uniqueBy(community.peers, peer => peer.aliasId).filter(peer => peer.aliasId !== community.aliasId).slice(-7) } }
function unique<T>(items: readonly T[]): T[] { return [...new Set(items)] }
function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] { const seen = new Set<string>(); return items.filter(item => { const next = key(item); if (seen.has(next)) return false; seen.add(next); return true }) }
function legacyCheckpoint(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619); return `legacy-${(hash >>> 0).toString(36)}` }
