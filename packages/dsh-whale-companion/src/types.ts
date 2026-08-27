import type { z } from 'zod'
import type { achievementIdSchema, skinSchema, whaleStateSchema } from './spec.ts'

export type WhaleSkin = z.infer<typeof skinSchema>
export type WhaleAchievementId = z.infer<typeof achievementIdSchema>
export type WhaleProgress = z.infer<typeof whaleStateSchema>
export type WhaleImport = Readonly<{ payload: string }>
