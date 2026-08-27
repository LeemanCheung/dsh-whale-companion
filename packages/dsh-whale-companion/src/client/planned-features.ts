import type { WhaleState } from '../spec.ts'
import { WHALE_SPECIES, WHALE_SPECIES_BY_ID, xpFloorForLevel, xpToNextLevel, type WhaleSpeciesDefinition } from '../species.ts'

export type VoyageGoal = Readonly<{
  id: 'level' | 'turns' | 'tools' | 'streak'
  title: string
  description: string
  current: number
  target: number
  suffix: string
  percent: number
}>

export type LevelProgress = Readonly<{
  current: number
  target: number
  percent: number
  remaining: number
}>

const milestones = {
  turns: [10, 25, 50, 100, 250, 500, 1_000, 2_000],
  tools: [10, 25, 50, 100, 250, 500, 1_000],
  streak: [3, 7, 14, 30, 60, 100, 180, 365],
} as const

export function companionName(state: Pick<WhaleState, 'name'>): string {
  return state.name?.trim() || '小蓝'
}

export function levelProgress(state: Pick<WhaleState, 'level' | 'xp'>): LevelProgress {
  if (state.level >= 100) return { current: 1, target: 1, percent: 100, remaining: 0 }
  const floor = xpFloorForLevel(state.level)
  const target = xpToNextLevel(state.level)
  const current = Math.max(0, Math.min(target, state.xp - floor))
  return {
    current,
    target,
    percent: Math.min(100, Math.round((current / Math.max(1, target)) * 100)),
    remaining: Math.max(0, target - current),
  }
}

export function unlockedSpeciesCount(level: number): number {
  return WHALE_SPECIES.filter(species => species.unlockLevel <= level).length
}

export function nextSpeciesForLevel(level: number): WhaleSpeciesDefinition | undefined {
  return WHALE_SPECIES.find(species => species.unlockLevel > level)
}

export function voyageGoals(state: WhaleState): readonly VoyageGoal[] {
  const level = levelProgress(state)
  const turnsTarget = nextMilestone(state.turns, milestones.turns)
  const toolsTarget = nextMilestone(state.tools, milestones.tools)
  const streakTarget = nextMilestone(state.streak, milestones.streak)
  return [
    {
      id: 'level',
      title: state.level >= 100 ? '守望未知海域' : `抵达海洋等级 ${state.level + 1}`,
      description: state.level >= 100 ? '等级已满，继续航行会积累鲸歌与潮汐。' : '自然使用 DSH 即可积累经验，不增加任何模型负担。',
      current: level.current,
      target: level.target,
      suffix: ' XP',
      percent: level.percent,
    },
    {
      id: 'turns',
      title: `收集 ${turnsTarget} 次回声`,
      description: '用户回合会变成航线坐标，但消息正文永远不会进入插件。',
      current: state.turns,
      target: turnsTarget,
      suffix: ' 回合',
      percent: percentage(state.turns, turnsTarget),
    },
    {
      id: 'tools',
      title: `完成 ${toolsTarget} 次深潜`,
      description: '工具结果只按事件类型计数，不读取工具名称、参数或返回内容。',
      current: state.tools,
      target: toolsTarget,
      suffix: ' 次',
      percent: percentage(state.tools, toolsTarget),
    },
    {
      id: 'streak',
      title: `保持 ${streakTarget} 天潮汐`,
      description: '连续天数按会话创建日期计算，迟到事件不会把当前航线回滚。',
      current: state.streak,
      target: streakTarget,
      suffix: ' 天',
      percent: percentage(state.streak, streakTarget),
    },
  ]
}

export function shareSummary(state: WhaleState): string {
  const species = WHALE_SPECIES_BY_ID[state.species]
  return `${companionName(state)} · 海洋等级 ${state.level} · ${species.nameZh}｜连续航行 ${state.streak} 天｜解锁 ${state.achievements.length}/12 成就、${unlockedSpeciesCount(state.level)}/20 鲸灵与 ${state.collectibles.length}/24 纪念物。全部数据来自本地、安全的活动元数据，不包含提示词、回复、代码、路径或工具内容。`
}

function nextMilestone(value: number, targets: readonly number[]): number {
  return targets.find(target => value < target) ?? Math.ceil((value + 1) / 250) * 250
}

function percentage(current: number, target: number): number {
  return Math.min(100, Math.round((Math.max(0, current) / Math.max(1, target)) * 100))
}
