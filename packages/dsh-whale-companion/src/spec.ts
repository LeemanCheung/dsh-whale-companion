import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const skinSchema = z.enum(['ocean', 'coral', 'midnight', 'aurora', 'sunset', 'nebula'])
export const whalePositionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict()
export type WhalePosition = z.infer<typeof whalePositionSchema>
export const achievementIdSchema = z.enum([
  'first-swim', 'ten-turns', 'century', 'week-current', 'month-tide', 'level-five',
  'level-ten', 'tool-diver', 'early-bird', 'night-owl', 'steady-fin', 'collector',
])
export const whaleStateSchema = z.object({
  version: z.literal(1), xp: count, level: count, turns: count, sessions: count,
  tools: count, streak: count, longestStreak: count, lastActiveDay: day.optional(),
  checkpoints: z.array(z.string().min(1)).max(4096),
  achievements: z.array(achievementIdSchema), skin: skinSchema, position: whalePositionSchema,
  updatedAt: count,
}).superRefine((state, ctx) => {
  if (state.level !== levelForXp(state.xp)) ctx.addIssue({ code: 'custom', path: ['level'], message: 'level must match xp' })
  if (new Set(state.checkpoints).size !== state.checkpoints.length) ctx.addIssue({ code: 'custom', path: ['checkpoints'], message: 'checkpoints must be unique' })
  if (new Set(state.achievements).size !== state.achievements.length) ctx.addIssue({ code: 'custom', path: ['achievements'], message: 'achievements must be unique' })
})
export type WhaleState = z.infer<typeof whaleStateSchema>
export const whaleDomainSpec = defineDomain({
  name: 'whale_companion', version: 1,
  tables: { state: domainTable<string, WhaleState>(whaleStateSchema) },
})
export const initialWhaleState = (): WhaleState => ({ version: 1, xp: 0, level: 1, turns: 0, sessions: 0, tools: 0, streak: 0, longestStreak: 0, checkpoints: [], achievements: [], skin: 'ocean', position: { x: 0.03, y: 0.08 }, updatedAt: 0 })
export function levelForXp(xp: number): number { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1 }
