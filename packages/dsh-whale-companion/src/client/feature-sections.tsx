import * as React from 'react'
import { WHALE_ALIAS_LABELS, WHALE_COLLECTIBLES, WHALE_SLOT_LABELS, whaleAliasId, whaleRoomSlotId, type WhaleCollectibleId, type WhaleRoomSlotId } from '../catalog.ts'
import type { WhaleState } from '../spec.ts'
import type { WhaleSkin } from '../types.ts'
import { WHALE_SPECIES_BY_ID } from '../species.ts'
import { SKINS } from './catalog.ts'
import { createPostcardSvg, downloadSvg } from './exports.ts'
import { collectibleArtStyle } from './asset-styles.ts'
import type { WhaleApi } from './store.ts'
import { momentDescription } from './view-model.ts'
import styles from './Whale.module.css'

export type WhaleAction = (work: () => Promise<WhaleState>, success: string) => Promise<void>
export type ExportText = (work: () => Promise<string>, write: (value: string) => void, message: string) => Promise<void>

export function TideSection({ api, state, busy, onNotice }: { api: WhaleApi, state: WhaleState, busy: boolean, onNotice: (notice: string) => void }): React.ReactElement {
  const titleId = React.useId()
  const latestDay = state.moments.at(-1)?.progressDay
  const moments = latestDay === undefined ? [] : state.moments.filter(moment => moment.progressDay === latestDay)
  const download = async (): Promise<void> => {
    try {
      const postcard = await api.postcardV5()
      downloadSvg(createPostcardSvg(postcard), `whale-tide-${postcard.day}`)
      onNotice('已下载本地 SVG 潮汐明信片。')
    } catch (reason) { onNotice(reason instanceof Error ? reason.message : String(reason)) }
  }
  return React.createElement('section', { className: `${styles.section} ${styles.tideSection}`, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '今日潮汐'), React.createElement('span', null, latestDay ?? '等待第一段航行')),
    moments.length === 0 ? React.createElement('p', { className: styles.empty }, '海面平静。自然使用 DSH 后，鲸鱼会留下不含工作内容的航行痕迹。') : React.createElement('ol', { className: styles.tideList }, ...moments.map(moment => React.createElement('li', { key: moment.id }, React.createElement('span', { className: styles.tideDot, 'data-category': moment.category, 'aria-hidden': true }), React.createElement('div', null, React.createElement('strong', null, momentDescription(moment)), React.createElement('span', null, `${WHALE_SPECIES_BY_ID[moment.species].nameZh} · ${moment.progressDay}`))))),
    React.createElement('button', { type: 'button', className: styles.postcardButton, disabled: busy || moments.length === 0, onClick: () => void download() }, '下载潮汐明信片（SVG）'),
  )
}

export function RoomSection({ api, state, busy, selectedSlot, setSelectedSlot, action }: { api: WhaleApi, state: WhaleState, busy: boolean, selectedSlot: WhaleRoomSlotId, setSelectedSlot: (slot: WhaleRoomSlotId) => void, action: WhaleAction }): React.ReactElement {
  const titleId = React.useId()
  const current = state.room.slots[selectedSlot]
  const candidates = WHALE_COLLECTIBLES.filter(item => item.slot === selectedSlot && state.collectibles.some(owned => owned.collectibleId === item.id))
  const itemName = (item: WhaleCollectibleId | null): string => item === null ? '空位' : WHALE_COLLECTIBLES.find(candidate => candidate.id === item)?.name ?? item
  return React.createElement('section', { className: styles.section, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '海湾布置'), React.createElement('span', null, `${Object.values(state.room.slots).filter(Boolean).length}/8 已布置`)),
    React.createElement('p', { className: styles.sectionIntro }, '纪念物来自成长，不是货币。场景预览和这些语义插槽使用同一份布置。'),
    React.createElement('div', { className: styles.room }, ...whaleRoomSlotId.map(slot => { const item = state.room.slots[slot]; return React.createElement('button', { key: slot, type: 'button', className: slot === selectedSlot ? styles.roomSlotSelected : styles.roomSlot, 'aria-pressed': slot === selectedSlot, onClick: () => setSelectedSlot(slot) }, item !== null && React.createElement('span', { className: styles.roomSlotArt, style: collectibleArtStyle(item), 'aria-hidden': true }), React.createElement('span', null, WHALE_SLOT_LABELS[slot]), React.createElement('strong', null, itemName(item))) })),
    React.createElement('div', { className: styles.roomControls },
      React.createElement('strong', null, `${WHALE_SLOT_LABELS[selectedSlot]}：${itemName(current)}`),
      React.createElement('div', { className: styles.chips },
        ...candidates.map(item => React.createElement('button', { key: item.id, type: 'button', disabled: busy || current === item.id, onClick: () => void action(() => api.placeCollectibleV5(selectedSlot, item.id), `已把${item.name}放进${WHALE_SLOT_LABELS[selectedSlot]}。`) }, React.createElement('span', { className: styles.chipArt, style: collectibleArtStyle(item.id), 'aria-hidden': true }), React.createElement('span', null, item.name))),
        React.createElement('button', { type: 'button', disabled: busy || current === null, onClick: () => void action(() => api.placeCollectibleV5(selectedSlot, null), `已清空${WHALE_SLOT_LABELS[selectedSlot]}。`) }, '移除'),
      ),
    ),
    React.createElement('div', { className: styles.actions },
      React.createElement('button', { type: 'button', disabled: busy, onClick: () => void action(() => api.saveRoomPresetV5(), '已保存当前小屋方案。') }, '保存方案'),
      ...state.room.presets.map((_, index) => React.createElement('button', { key: index, type: 'button', disabled: busy, onClick: () => void action(() => api.loadRoomPresetV5(index), `已载入方案 ${index + 1}。`) }, `载入方案 ${index + 1}`)),
    ),
    candidates.length === 0 && React.createElement('p', { className: styles.empty }, '这个插槽还没有可放置的纪念物。继续自然航行，它们会逐渐出现。'),
  )
}

export function ExpeditionSection({ api, state, busy, action }: { api: WhaleApi, state: WhaleState, busy: boolean, action: WhaleAction }): React.ReactElement {
  const titleId = React.useId()
  const expedition = state.expedition
  return React.createElement('section', { className: styles.section, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '温柔远征'), React.createElement('span', null, expedition === null ? '不惩罚缺席' : `${expedition.progress}/${expedition.goal}`)),
    expedition === null ? React.createElement(React.Fragment, null,
      React.createElement('p', { className: styles.sectionIntro }, '让当前鲸灵去极光海湾。当天自然开启会话并完成一个回合，故事就会前进一次。'),
      React.createElement('button', { type: 'button', disabled: busy, onClick: () => void action(() => api.startExpeditionV5('aurora-cove', state.species, 7), `已让${WHALE_SPECIES_BY_ID[state.species].nameZh}前往极光海湾。`) }, '开始 7 日远征'),
    ) : React.createElement(React.Fragment, null,
      React.createElement('p', { className: styles.sectionIntro }, `${WHALE_SPECIES_BY_ID[expedition.species].nameZh}正在“${expedition.expeditionId}”航线中。没有倒计时、失败或断签惩罚。`),
      React.createElement('div', { className: styles.progressTrack, role: 'progressbar', 'aria-label': '远征进度', 'aria-valuemin': 0, 'aria-valuemax': expedition.goal, 'aria-valuenow': expedition.progress }, React.createElement('span', { style: { width: `${Math.round((expedition.progress / expedition.goal) * 100)}%` } })),
      React.createElement('div', { className: styles.actions }, React.createElement('button', { type: 'button', disabled: busy || expedition.progress < expedition.goal || expedition.rewardClaimed, onClick: () => void action(() => api.claimExpeditionV5(), '已领取远征故事碎片。') }, expedition.rewardClaimed ? '已领取故事' : expedition.progress < expedition.goal ? '自然航行中' : '领取故事碎片')),
    ),
  )
}

export function SkinSelector({ api, state, busy, action }: { api: WhaleApi, state: WhaleState, busy: boolean, action: WhaleAction }): React.ReactElement {
  const titleId = React.useId()
  const groupName = `whale-skin-${titleId}`
  return React.createElement('section', { className: styles.section, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '海域皮肤'), React.createElement('span', null, '6 款可选')),
    React.createElement('div', { className: styles.skins }, ...Object.entries(SKINS).map(([value, meta]) => React.createElement('label', { key: value, className: state.skin === value ? styles.selected : styles.skin }, React.createElement('input', { type: 'radio', name: groupName, value, checked: state.skin === value, disabled: busy, onChange: () => void action(() => api.setSkin(value as WhaleSkin), `已切换为${meta.name}。`) }), React.createElement('span', { className: styles.swatch, style: { backgroundColor: meta.color }, 'aria-hidden': true }), React.createElement('span', null, meta.name)))),
  )
}

export function CommunitySection({ api, state, busy, community, setCommunity, action, exportText }: { api: WhaleApi, state: WhaleState, busy: boolean, community: string, setCommunity: (value: string) => void, action: WhaleAction, exportText: ExportText }): React.ReactElement {
  const titleId = React.useId()
  const peerItems = state.community.peers.map(peer => React.createElement('li', { key: peer.aliasId },
    React.createElement('span', { className: styles.peerDot, style: { background: SKINS[peer.skin].color }, 'aria-hidden': true }),
    React.createElement('div', null, React.createElement('strong', null, `${WHALE_ALIAS_LABELS[peer.aliasId]} · ${WHALE_SPECIES_BY_ID[peer.species].nameZh}`), React.createElement('span', null, `本周 ${peer.activityBucket} 天 · ${peer.resonanceStars} 星共鸣`)),
    React.createElement('button', { type: 'button', disabled: busy, onClick: () => void action(() => api.removeCommunityPeerV5(peer.aliasId), `已移除${WHALE_ALIAS_LABELS[peer.aliasId]}。`) }, '移除'),
  ))
  return React.createElement('section', { className: styles.section, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '鲸群信标'), React.createElement('span', null, '本地导入 · 无联网')),
    React.createElement('p', { className: styles.sectionIntro }, '主动开启后，只交换预设别名、鲸灵、皮肤和粗粒度里程碑。没有帐号、消息、排行榜或后台同步。'),
    React.createElement('div', { className: styles.communityControls },
      React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: state.community.enabled, disabled: busy, onChange: (event: React.ChangeEvent<HTMLInputElement>) => void action(() => api.setCommunityV5(event.currentTarget.checked, state.community.aliasId), event.currentTarget.checked ? '已开启鲸群本地分享。' : '已关闭鲸群本地分享。') }), ' 主动开启本地鲸群分享'),
      React.createElement('label', null, '我的别名', React.createElement('select', { value: state.community.aliasId, disabled: busy, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void action(() => api.setCommunityV5(state.community.enabled, event.currentTarget.value), '已更新鲸群别名。') }, ...whaleAliasId.map(alias => React.createElement('option', { key: alias, value: alias }, WHALE_ALIAS_LABELS[alias])))),
    ),
    React.createElement('textarea', { value: community, disabled: busy, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setCommunity(event.currentTarget.value), placeholder: '开启后可导出鲸歌，或粘贴朋友的鲸歌。' }),
    React.createElement('div', { className: styles.actions },
      React.createElement('button', { type: 'button', disabled: busy || !state.community.enabled, onClick: () => void exportText(() => api.exportCommunitySongV5(), setCommunity, '已导出最小化鲸歌数据。') }, '导出鲸歌'),
      React.createElement('button', { type: 'button', disabled: busy || !state.community.enabled || community.trim() === '', onClick: () => void action(() => api.importCommunitySongV5(community), '已把鲸歌加入本地鲸群。') }, '导入鲸歌'),
    ),
    peerItems.length === 0 ? React.createElement('p', { className: styles.empty }, '鲸群还没有访客。导入朋友的鲸歌后，这里会出现一片不含工作内容的共同海景。') : React.createElement('ul', { className: styles.peerList }, ...peerItems),
  )
}
