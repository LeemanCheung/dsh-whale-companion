export const whaleSpeciesId = [
  'common-minke', 'brydes', 'humpback', 'gray', 'beluga',
  'orca', 'sperm', 'pilot', 'narwhal', 'bowhead',
  'fin', 'sei', 'blue', 'southern-right', 'omura',
  'cuviers-beaked', 'north-atlantic-right', 'north-pacific-right', 'rices', 'spade-toothed',
] as const

export type WhaleSpeciesId = typeof whaleSpeciesId[number]
export type WhaleRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR'
export type WhaleAffinity = '启航' | '回声' | '探索' | '专注' | '恢复' | '群游'
export type WhaleEventId = 'session-start' | 'utc-day-session' | 'utc-night-session' | 'user-turn' | 'tool-result' | 'level-up' | 'resonance-star' | 'species-unlock' | 'return'

export type WhaleSpeciesDefinition = Readonly<{
  id: WhaleSpeciesId
  nameZh: string
  nameEn: string
  scientific: string
  rarity: WhaleRarity
  unlockLevel: number
  affinities: readonly WhaleAffinity[]
  ability: string
  story: string
  palette: string
}>

export type WhaleReactionManifestEntry = Readonly<{
  speciesId: WhaleSpeciesId
  families: readonly WhaleAffinity[]
  reactions: readonly Readonly<{
    reactionId: string
    allowedEventIds: readonly WhaleEventId[]
    templateId: string
    visualEffectId: 'ripple' | 'wake' | 'bubble' | 'song' | 'current' | 'glow'
    reducedMotionEffectId: 'mark' | 'label'
  }>[]
  storyOnlyAbility: boolean
  unsupportedReason?: string
}>

export const WHALE_SPECIES: readonly WhaleSpeciesDefinition[] = [
  { id: 'common-minke', nameZh: '小须鲸', nameEn: 'Common Minke Whale', scientific: 'Balaenoptera acutorostrata', rarity: 'N', unlockLevel: 1, affinities: ['启航'], ability: '迅游', story: '灵活、好奇，陪你完成第一次航行。', palette: '#70c5ff' },
  { id: 'brydes', nameZh: '布氏鲸', nameEn: 'Bryde’s Whale', scientific: 'Balaenoptera brydei', rarity: 'N', unlockLevel: 5, affinities: ['探索', '启航'], ability: '暖流觅食', story: '沿温暖海流寻找新的工具与路线。', palette: '#89d7c0' },
  { id: 'humpback', nameZh: '座头鲸', nameEn: 'Humpback Whale', scientific: 'Megaptera novaeangliae', rarity: 'N', unlockLevel: 10, affinities: ['群游', '恢复'], ability: '鲸歌连奏', story: '长鳍与鲸歌记录每一次稳定协作。', palette: '#c7a7ff' },
  { id: 'gray', nameZh: '灰鲸', nameEn: 'Gray Whale', scientific: 'Eschrichtius robustus', rarity: 'N', unlockLevel: 15, affinities: ['探索', '恢复'], ability: '迁徙航线', story: '斑驳皮肤承载漫长而可靠的迁徙记忆。', palette: '#b4bbc8' },
  { id: 'beluga', nameZh: '白鲸', nameEn: 'Beluga Whale', scientific: 'Delphinapterus leucas', rarity: 'R', unlockLevel: 20, affinities: ['回声'], ability: '回声校准', story: '用丰富回声定位问题，再把航线校准。', palette: '#aeeef0' },
  { id: 'orca', nameZh: '虎鲸', nameEn: 'Orca', scientific: 'Orcinus orca', rarity: 'R', unlockLevel: 25, affinities: ['群游'], ability: '群猎阵型', story: '黑白剪影代表默契、策略与协同。', palette: '#6170c7' },
  { id: 'sperm', nameZh: '抹香鲸', nameEn: 'Sperm Whale', scientific: 'Physeter macrocephalus', rarity: 'R', unlockLevel: 30, affinities: ['专注', '回声'], ability: '深潜作业', story: '方形巨头把复杂工作带入更深的海层。', palette: '#a18c78' },
  { id: 'pilot', nameZh: '长肢领航鲸', nameEn: 'Long-finned Pilot Whale', scientific: 'Globicephala melas', rarity: 'R', unlockLevel: 35, affinities: ['群游', '恢复'], ability: '领航节奏', story: '圆润额部与长鳍引导鲸群保持节奏。', palette: '#667699' },
  { id: 'narwhal', nameZh: '一角鲸', nameEn: 'Narwhal', scientific: 'Monodon monoceros', rarity: 'SR', unlockLevel: 40, affinities: ['回声'], ability: '破冰之角', story: '独特长牙把一次恢复变成清晰的突破。', palette: '#91dce6' },
  { id: 'bowhead', nameZh: '弓头鲸', nameEn: 'Bowhead Whale', scientific: 'Balaena mysticetus', rarity: 'SR', unlockLevel: 45, affinities: ['恢复', '专注'], ability: '古海长忆', story: '厚重弓形头部守护跨越时间的记录。', palette: '#7b88a8' },
  { id: 'fin', nameZh: '长须鲸', nameEn: 'Fin Whale', scientific: 'Balaenoptera physalus', rarity: 'SR', unlockLevel: 50, affinities: ['启航'], ability: '极速巡航', story: '修长轮廓把稳定效率化作开阔航迹。', palette: '#6387d4' },
  { id: 'sei', nameZh: '塞鲸', nameEn: 'Sei Whale', scientific: 'Balaenoptera borealis', rarity: 'SR', unlockLevel: 55, affinities: ['启航', '专注'], ability: '精准滤流', story: '克制而高效，奖励清晰完成而非工具堆叠。', palette: '#799abb' },
  { id: 'blue', nameZh: '蓝鲸', nameEn: 'Blue Whale', scientific: 'Balaenoptera musculus', rarity: 'SSR', unlockLevel: 60, affinities: ['专注'], ability: '巨鲸领域', story: '地球最大动物代表任务规模，而不是更强数值。', palette: '#5b87e4' },
  { id: 'southern-right', nameZh: '南露脊鲸', nameEn: 'Southern Right Whale', scientific: 'Eubalaena australis', rarity: 'SSR', unlockLevel: 65, affinities: ['恢复'], ability: '温海庇护', story: '宽阔背影象征温和守护。', palette: '#d58b97' },
  { id: 'omura', nameZh: '大村鲸', nameEn: 'Omura’s Whale', scientific: 'Balaenoptera omurai', rarity: 'SSR', unlockLevel: 70, affinities: ['探索'], ability: '幻纹发现', story: '不对称纹路记录每一次新发现。', palette: '#e1a573' },
  { id: 'cuviers-beaked', nameZh: '柯维氏喙鲸', nameEn: 'Cuvier’s Beaked Whale', scientific: 'Ziphius cavirostris', rarity: 'SSR', unlockLevel: 75, affinities: ['专注', '探索'], ability: '静默深渊', story: '短喙与深潜本领适合安静、持续的复杂任务。', palette: '#8295a4' },
  { id: 'north-atlantic-right', nameZh: '北大西洋露脊鲸', nameEn: 'North Atlantic Right Whale', scientific: 'Eubalaena glacialis', rarity: 'UR', unlockLevel: 82, affinities: ['回声', '恢复'], ability: '幸存者航路', story: '遗世级强调保护与韧性，不把濒危包装成力量。', palette: '#d29d82' },
  { id: 'north-pacific-right', nameZh: '北太平洋露脊鲸', nameEn: 'North Pacific Right Whale', scientific: 'Eubalaena japonica', rarity: 'UR', unlockLevel: 88, affinities: ['恢复'], ability: '孤星守望', story: '低频但长期的陪伴最终连接成星图。', palette: '#b99bdb' },
  { id: 'rices', nameZh: '莱斯鲸', nameEn: 'Rice’s Whale', scientific: 'Balaenoptera ricei', rarity: 'UR', unlockLevel: 94, affinities: ['专注', '恢复'], ability: '秘湾驻守', story: '有限栖息范围被转译为专注与守护。', palette: '#87b67c' },
  { id: 'spade-toothed', nameZh: '铲齿中喙鲸', nameEn: 'Spade-toothed Whale', scientific: 'Mesoplodon traversii', rarity: 'UR', unlockLevel: 100, affinities: ['探索', '专注'], ability: '未知共鸣', story: '未知之鲸代表长期观测、收藏与身份表达。', palette: '#d4b268' },
]

export const WHALE_SPECIES_BY_ID = Object.fromEntries(WHALE_SPECIES.map(species => [species.id, species])) as Record<WhaleSpeciesId, WhaleSpeciesDefinition>
export const RESONANCE_THRESHOLDS = [0, 60, 180, 420, 800] as const

const reactionEffectByAffinity: Record<WhaleAffinity, WhaleReactionManifestEntry['reactions'][number]['visualEffectId']> = {
  '启航': 'wake', '回声': 'song', '探索': 'glow', '专注': 'bubble', '恢复': 'ripple', '群游': 'current',
}
const reactionTemplateByAffinity: Record<WhaleAffinity, string> = {
  '启航': 'launch-tide', '回声': 'echo-tide', '探索': 'explore-tide', '专注': 'focus-tide', '恢复': 'restore-tide', '群游': 'group-tide',
}
const reactionSlugByAffinity: Record<WhaleAffinity, string> = {
  '启航': 'launch', '回声': 'echo', '探索': 'explore', '专注': 'focus', '恢复': 'restore', '群游': 'group',
}

export const WHALE_REACTION_MANIFEST: readonly WhaleReactionManifestEntry[] = WHALE_SPECIES.map(species => ({
  speciesId: species.id,
  families: species.affinities,
  storyOnlyAbility: false,
  reactions: species.affinities.map((affinity, index) => ({
    reactionId: `${species.id}-${index === 0 ? 'tide' : reactionSlugByAffinity[affinity]}`,
    allowedEventIds: index === 0 ? ['session-start', 'user-turn', 'tool-result', 'level-up', 'resonance-star', 'species-unlock', 'return'] : ['session-start', 'user-turn', 'level-up'],
    templateId: reactionTemplateByAffinity[affinity],
    visualEffectId: reactionEffectByAffinity[affinity],
    reducedMotionEffectId: index === 0 ? 'mark' : 'label',
  })),
}))

export function resonanceStars(points: number): number {
  let stars = 1
  for (let index = 1; index < RESONANCE_THRESHOLDS.length; index += 1) if (points >= RESONANCE_THRESHOLDS[index]) stars = index + 1
  return stars
}

export function isSpeciesUnlocked(species: WhaleSpeciesDefinition, level: number): boolean { return level >= species.unlockLevel }

export function levelForXp(xp: number): number {
  let level = 1
  while (level < 100 && xp >= xpFloorForLevel(level + 1)) level += 1
  return level
}

export function xpFloorForLevel(level: number): number {
  const completed = Math.max(0, Math.min(99, Math.floor(level) - 1))
  return 40 * completed + (3 * completed * (completed - 1)) / 2
}

export function xpToNextLevel(level: number): number { return level >= 100 ? 0 : 40 + 3 * Math.max(0, level - 1) }
