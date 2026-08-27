import type { WhaleAchievementId, WhaleSkin } from '../types.ts'

export type SkinMeta = Readonly<{
  name: string
  description: string
  color: string
  deep: string
  belly: string
  accent: string
  glow: string
}>
export type AchievementMeta = Readonly<{ mark: WhaleAchievementId, title: string, description: string }>

export const SKINS: Record<WhaleSkin, SkinMeta> = {
  ocean: { name: '蔚蓝海域', description: '清透、平静的默认海色', color: '#51b7ff', deep: '#1768d4', belly: '#dff5ff', accent: '#93ddff', glow: '#47c9ff' },
  coral: { name: '珊瑚暖流', description: '温暖而明亮的珊瑚粉', color: '#ff8e89', deep: '#d85267', belly: '#fff0e9', accent: '#ffc1a8', glow: '#ff7d9d' },
  midnight: { name: '深海午夜', description: '克制、沉静的午夜蓝紫', color: '#7f8dff', deep: '#343e9f', belly: '#d9ddff', accent: '#aeb9ff', glow: '#7b6cff' },
  aurora: { name: '极光海湾', description: '带有冷光的薄荷极光', color: '#54d9ba', deep: '#137f7a', belly: '#ddfff7', accent: '#8af2d3', glow: '#42e6c1' },
  sunset: { name: '落日鲸歌', description: '柔和、松弛的金橙暮色', color: '#ffb15d', deep: '#d96a3a', belly: '#fff2d8', accent: '#ffd18b', glow: '#ff9c4a' },
  nebula: { name: '星云潮汐', description: '梦幻而不失层次的星云紫', color: '#bf8cff', deep: '#6d3cbe', belly: '#f2e5ff', accent: '#ddaaff', glow: '#b16cff' },
}

export const ACHIEVEMENTS: Record<WhaleAchievementId, AchievementMeta> = {
  'first-swim': { mark: 'first-swim', title: '初次畅游', description: '开启 1 次会话' },
  'ten-turns': { mark: 'ten-turns', title: '对话起航', description: '完成 10 个用户回合' },
  century: { mark: 'century', title: '百回合浪潮', description: '完成 100 个用户回合' },
  'week-current': { mark: 'week-current', title: '七日潮汐', description: '连续使用 7 天' },
  'month-tide': { mark: 'month-tide', title: '满月航线', description: '连续使用 30 天' },
  'level-five': { mark: 'level-five', title: '远洋新手', description: '到达 5 级' },
  'level-ten': { mark: 'level-ten', title: '深海专家', description: '到达 10 级' },
  'tool-diver': { mark: 'tool-diver', title: '工具潜航员', description: '获得 25 次工具结果' },
  'early-bird': { mark: 'early-bird', title: '早潮出发', description: '在 UTC 06:00 前活动' },
  'night-owl': { mark: 'night-owl', title: '夜航鲸', description: '在 UTC 20:00 后活动' },
  'steady-fin': { mark: 'steady-fin', title: '稳健鳍迹', description: '最长连续使用 3 天' },
  collector: { mark: 'collector', title: '潮汐收藏家', description: '解锁 8 个成就' },
}

export const PRIVACY_LEDGER = [
  { name: '本地进度', includes: '名字、等级、鲸灵、共鸣、纪念物、小屋与有限潮汐', excludes: '提示词、回答、代码、路径和工具内容' },
  { name: '备份', includes: '伙伴名字、稳定成长、装扮与小屋', excludes: '会话标识、收据、精确活动时间线与潮汐日志' },
  { name: 'PNG 航行名片', includes: '伙伴名字、等级、鲸灵、连续天数与数量型里程碑', excludes: '任务名、工具名、会话内容与账号' },
  { name: '潮汐明信片', includes: '日期、鲸灵、等级与安全模板文案', excludes: '任务名、工具名、会话内容与账号' },
  { name: '鲸群卡片', includes: '预设别名、鲸灵、皮肤和粗粒度里程碑', excludes: '自由文本、精确时间、会话与工作内容' },
] as const
