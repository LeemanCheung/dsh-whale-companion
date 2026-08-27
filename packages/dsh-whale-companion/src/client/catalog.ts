import type { WhaleAchievementId, WhaleSkin } from '../types.ts'

export type SkinMeta = Readonly<{ name: string, color: string }>
export type AchievementMeta = Readonly<{ mark: WhaleAchievementId, title: string, description: string }>

export const SKINS: Record<WhaleSkin, SkinMeta> = {
  ocean: { name: '蔚蓝海域', color: '#2c9cff' }, coral: { name: '珊瑚暖流', color: '#ed6f61' }, midnight: { name: '深海午夜', color: '#5d68d9' },
  aurora: { name: '极光海湾', color: '#35c894' }, sunset: { name: '落日鲸歌', color: '#f49a3d' }, nebula: { name: '星云潮汐', color: '#a976eb' },
}

export const ACHIEVEMENTS: Record<WhaleAchievementId, AchievementMeta> = {
  'first-swim': { mark: 'first-swim', title: '初次畅游', description: '开启 1 次会话' }, 'ten-turns': { mark: 'ten-turns', title: '对话起航', description: '完成 10 个用户回合' },
  century: { mark: 'century', title: '百回合浪潮', description: '完成 100 个用户回合' }, 'week-current': { mark: 'week-current', title: '七日潮汐', description: '连续使用 7 天' },
  'month-tide': { mark: 'month-tide', title: '满月航线', description: '连续使用 30 天' }, 'level-five': { mark: 'level-five', title: '远洋新手', description: '到达 5 级' },
  'level-ten': { mark: 'level-ten', title: '深海专家', description: '到达 10 级' }, 'tool-diver': { mark: 'tool-diver', title: '工具潜航员', description: '获得 25 次工具结果' },
  'early-bird': { mark: 'early-bird', title: '早潮出发', description: '在 UTC 06:00 前活动' }, 'night-owl': { mark: 'night-owl', title: '夜航鲸', description: '在 UTC 20:00 后活动' },
  'steady-fin': { mark: 'steady-fin', title: '稳健鳍迹', description: '最长连续使用 3 天' }, collector: { mark: 'collector', title: '潮汐收藏家', description: '解锁 8 个成就' },
}

export const PRIVACY_LEDGER = [
  { name: '本地进度', includes: '等级、鲸灵、共鸣、纪念物、小屋与有限潮汐', excludes: '提示词、回答、代码、路径和工具内容' },
  { name: '备份', includes: '稳定成长、装扮与小屋', excludes: '会话标识、收据、精确活动时间线与潮汐日志' },
  { name: '潮汐明信片', includes: '日期、鲸灵、等级与安全模板文案', excludes: '任务名、工具名、会话内容与账号' },
  { name: '鲸群卡片', includes: '预设别名、鲸灵、皮肤和粗粒度里程碑', excludes: '自由文本、精确时间、会话与工作内容' },
] as const
