import { WHALE_COLLECTIBLE_BY_ID, WHALE_SLOT_LABELS, whaleRoomSlotId, type WhaleRoomSlotId } from '../catalog.ts'
import type { WhaleState } from '../spec.ts'
import type { PresentationMode } from './preferences.ts'
import { WHALE_SPECIES_BY_ID, RESONANCE_THRESHOLDS, resonanceStars, type WhaleEventId } from '../species.ts'

export type JournalDay = Readonly<{ day: string, count: number, primary?: WhaleEventId, speciesName?: string }>
export type ReactionPresentation = Readonly<{ id: string, message: string, priority: 'high' | 'low', category: WhaleEventId }>
export type StoryBeat = Readonly<{ star: number, title: string, body: string, nextAt?: number }>
export type CoveItem = Readonly<{ slot: WhaleRoomSlotId, slotLabel: string, collectibleId?: keyof typeof WHALE_COLLECTIBLE_BY_ID, itemName?: string, occupied: boolean }>

const reactionCopy: Record<WhaleEventId, string> = {
  'species-unlock': '新的鲸灵在海面现身。', 'resonance-star': '共鸣升起一颗新星。', 'level-up': '海洋等级向前推进。', return: '鲸鱼轻轻欢迎你回来。',
  'session-start': '鲸鱼划开了新的航线。', 'tool-result': '海面泛起一圈协作回声。', 'user-turn': '鲸鱼听见了新的航行方向。',
  'utc-day-session': '晨潮照亮了海湾。', 'utc-night-session': '夜航微光浮在水面。',
}
const priority: WhaleEventId[] = ['species-unlock', 'resonance-star', 'level-up', 'return', 'session-start', 'tool-result', 'user-turn', 'utc-day-session', 'utc-night-session']
const highPriority = new Set<WhaleEventId>(['species-unlock', 'resonance-star', 'level-up', 'return'])

export function momentDescription(moment: WhaleState['moments'][number]): string { return reactionCopy[moment.category] }

export function reactionPresentation(moment: WhaleState['moments'][number] | undefined): ReactionPresentation | undefined {
  if (moment === undefined) return undefined
  return { id: moment.id, message: momentDescription(moment), priority: highPriority.has(moment.category) ? 'high' : 'low', category: moment.category }
}

export function shouldPresentReaction(input: Readonly<{ reaction: ReactionPresentation, previousId?: string, occurredAt: number, now: number, hidden: boolean, mode: PresentationMode }>): boolean {
  if (input.hidden || input.previousId === input.reaction.id || input.now - input.occurredAt > 60_000 || input.occurredAt > input.now + 5_000) return false
  return input.mode !== 'quiet' || input.reaction.priority === 'high'
}

export function reactionDuration(mode: PresentationMode): number { return mode === 'lively' ? 10_000 : mode === 'quiet' ? 4_000 : 7_000 }

export function sevenDayJournal(state: Pick<WhaleState, 'moments'>): JournalDay[] {
  const latest = state.moments.at(-1)?.progressDay
  if (latest === undefined) return []
  const end = Date.parse(`${latest}T00:00:00Z`)
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(end - (6 - offset) * 86_400_000).toISOString().slice(0, 10)
    const moments = state.moments.filter(moment => moment.progressDay === day)
    const primary = priority.find(category => moments.some(moment => moment.category === category))
    const species = moments.find(moment => moment.category === primary)?.species ?? moments.at(-1)?.species
    return { day, count: moments.length, ...(primary === undefined ? {} : { primary }), ...(species === undefined ? {} : { speciesName: WHALE_SPECIES_BY_ID[species].nameZh }) }
  })
}

export function currentStoryBeat(state: Pick<WhaleState, 'species' | 'resonance'>): StoryBeat {
  const species = WHALE_SPECIES_BY_ID[state.species]
  const points = state.resonance[state.species] ?? 0
  const star = resonanceStars(points)
  const chapters = [
    { title: '第一次相遇', body: species.story },
    { title: '辨认潮声', body: `${species.nameZh}开始用“${species.ability}”回应这段稳定航行。` },
    { title: '并肩深潜', body: `${species.nameZh}已经熟悉你的出现。它不催促，只在潮水转向时留下记号。` },
    { title: '海湾归途', body: `长久共鸣让${species.nameZh}把这间海湾认作可以返回的地方。` },
    { title: '完整鲸歌', body: `${species.nameZh}的鲸歌已经完整。收藏在这里代表陪伴，不代表现实物种的强弱。` },
  ] as const
  const chapter = chapters[star - 1]!
  return { star, ...chapter, ...(star >= 5 ? {} : { nextAt: RESONANCE_THRESHOLDS[star] }) }
}

export function coveItems(state: Pick<WhaleState, 'room'>): CoveItem[] {
  return whaleRoomSlotId.map(slot => {
    const item = state.room.slots[slot]
    return { slot, slotLabel: WHALE_SLOT_LABELS[slot], occupied: item !== null, ...(item === null ? {} : { collectibleId: item, itemName: WHALE_COLLECTIBLE_BY_ID[item].name }) }
  })
}
