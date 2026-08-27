export const whaleCollectibleId = [
  'first-wake', 'blue-current-lamp', 'warm-coral', 'echo-shell', 'tide-map', 'song-chime',
  'moon-pearl', 'dawn-reed', 'night-reef', 'sunken-compass', 'glow-algae', 'kelp-cushion',
  'ice-fragment', 'star-lantern', 'deep-bell', 'migration-banner', 'quiet-cove', 'memory-orb',
  'aurora-arch', 'ancient-anchor', 'horizon-window', 'tidal-garden', 'whale-stone', 'unknown-spire',
] as const
export type WhaleCollectibleId = typeof whaleCollectibleId[number]

export const whaleRoomSlotId = ['backdrop', 'seafloor', 'lighting', 'hanging', 'habitatLeft', 'habitatRight', 'foreground', 'soundscape'] as const
export type WhaleRoomSlotId = typeof whaleRoomSlotId[number]

export const whaleAliasId = ['blue-current', 'sea-salt', 'north-wind', 'moon-reef', 'quiet-kelp', 'warm-sand', 'far-song', 'ice-lantern', 'tide-glass', 'coral-dawn', 'deep-star', 'open-horizon'] as const
export type WhaleAliasId = typeof whaleAliasId[number]

export const WHALE_COLLECTIBLES: readonly Readonly<{ id: WhaleCollectibleId, name: string, slot: WhaleRoomSlotId, description: string }>[] = whaleCollectibleId.map((id, index) => ({
  id,
  name: ['初醒尾流', '蓝潮灯', '暖流珊瑚', '回声贝', '迁徙海图', '鲸歌风铃', '月光珍珠', '晨潮芦苇', '夜航礁', '沉没罗盘', '荧光藻', '海带软垫', '破冰碎片', '星海灯笼', '深潜铜铃', '迁徙旗', '静湾石', '记忆珠', '极光拱门', '远古锚', '地平窗', '潮汐花园', '鲸石', '未知尖塔'][index]!,
  slot: (['foreground', 'lighting', 'habitatLeft', 'hanging', 'backdrop', 'soundscape', 'foreground', 'habitatRight', 'seafloor', 'hanging', 'lighting', 'seafloor', 'foreground', 'lighting', 'soundscape', 'backdrop', 'habitatLeft', 'hanging', 'backdrop', 'seafloor', 'backdrop', 'habitatRight', 'foreground', 'backdrop'] as const)[index]!,
  description: '由一段真实且不含工作内容的航行痕迹留下。',
}))

export const WHALE_COLLECTIBLE_BY_ID = Object.fromEntries(WHALE_COLLECTIBLES.map(item => [item.id, item])) as Record<WhaleCollectibleId, typeof WHALE_COLLECTIBLES[number]>

export const WHALE_SLOT_LABELS: Record<WhaleRoomSlotId, string> = {
  backdrop: '背景', seafloor: '海床', lighting: '灯光', hanging: '悬挂', habitatLeft: '左栖息', habitatRight: '右栖息', foreground: '前景', soundscape: '声景',
}

export const WHALE_ALIAS_LABELS: Record<WhaleAliasId, string> = {
  'blue-current': '蓝潮', 'sea-salt': '海盐', 'north-wind': '北风', 'moon-reef': '月礁', 'quiet-kelp': '静海带', 'warm-sand': '暖沙',
  'far-song': '远歌', 'ice-lantern': '冰灯', 'tide-glass': '潮玻璃', 'coral-dawn': '珊瑚黎明', 'deep-star': '深海星', 'open-horizon': '开阔地平线',
}
