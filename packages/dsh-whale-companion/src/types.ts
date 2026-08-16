import type { z } from 'zod'
import type { achievementIdSchema, skinSchema } from './spec.ts'

export type WhaleSkin = z.infer<typeof skinSchema>
export type WhaleAchievementId = z.infer<typeof achievementIdSchema>
export type WhaleImport = Readonly<{ payload: string }>
