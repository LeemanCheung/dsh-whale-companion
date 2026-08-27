import * as React from 'react'
import type { WhaleSkin } from '../types.ts'
import type { WhaleSpeciesDefinition } from '../species.ts'
import { PRIVACY_LEDGER, SKINS } from './catalog.ts'
import { presentationStore, usePresentation } from './presentation-store.ts'
import { coveItems, currentStoryBeat, sevenDayJournal } from './view-model.ts'
import { collectibleArtStyle, speciesArtStyle } from './asset-styles.ts'
import { WHALE_COVE_BACKGROUND } from './visual-assets.ts'
import styles from './Whale.module.css'

export function WeeklyJournal({ journal }: { journal: ReturnType<typeof sevenDayJournal> }): React.ReactElement {
  const titleId = React.useId()
  const labels: Record<string, string> = { 'species-unlock': '新鲸灵', 'resonance-star': '共鸣', 'level-up': '升级', return: '回归', 'session-start': '启航', 'tool-result': '协作', 'user-turn': '航向' }
  return React.createElement('section', { className: `${styles.section} ${styles.journalSection}`, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '这周的海'), React.createElement('span', null, '最近 7 个 UTC 自然日')),
    journal.length === 0 ? React.createElement('p', { className: styles.empty }, '第一段潮汐出现后，这里会长出一条安静的七日航线。') : React.createElement('ol', { className: styles.journal }, ...journal.map(day => React.createElement('li', { key: day.day, className: day.count === 0 ? styles.journalQuiet : styles.journalActive }, React.createElement('span', { className: styles.journalDate }, day.day.slice(5)), React.createElement('span', { className: styles.journalBar, style: { '--journal-level': Math.min(5, day.count) } as React.CSSProperties, 'aria-hidden': true }), React.createElement('span', { className: styles.visuallyHidden }, `${day.day} 有 ${day.count} 段潮汐`), React.createElement('strong', null, day.count === 0 ? '平静' : labels[day.primary ?? ''] ?? '潮汐'), React.createElement('small', null, day.speciesName ?? '海面')))),
  )
}

export function CoveOverview({ cove, species, skin }: { cove: ReturnType<typeof coveItems>, species: WhaleSpeciesDefinition, skin: WhaleSkin }): React.ReactElement {
  const titleId = React.useId()
  return React.createElement('section', { className: `${styles.section} ${styles.coveSection}`, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '此刻的海湾'), React.createElement('span', null, `${species.nameZh} · ${SKINS[skin].name}`)),
    React.createElement('div', { className: styles.coveScene, style: { '--cove-color': SKINS[skin].color, '--cove-image': `url(${WHALE_COVE_BACKGROUND})` } as React.CSSProperties, role: 'img', 'aria-label': `${species.nameZh}的海湾，已布置 ${cove.filter(item => item.occupied).length} 件纪念物` },
      React.createElement('span', { className: styles.coveWhale, style: speciesArtStyle(species), 'aria-hidden': true }),
      ...cove.map(item => React.createElement('span', { key: item.slot, className: `${styles.coveItem} ${styles[`cove_${item.slot}`]}`, 'data-occupied': item.occupied ? 'true' : 'false' }, item.collectibleId !== undefined && React.createElement('span', { className: styles.coveItemArt, style: collectibleArtStyle(item.collectibleId), 'aria-hidden': true }), React.createElement('span', null, item.itemName ?? item.slotLabel))),
    ),
    React.createElement('p', { className: styles.sceneHint }, '这是当前布置的只读预览。下方“海湾布置”保留完整键盘编辑。'),
  )
}

export function StoryBeatSection({ story, speciesName }: { story: ReturnType<typeof currentStoryBeat>, speciesName: string }): React.ReactElement {
  const titleId = React.useId()
  return React.createElement('section', { className: `${styles.section} ${styles.storySection}`, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, `${speciesName}的鲸歌`), React.createElement('span', null, `${story.star} 星共鸣`)),
    React.createElement('div', { className: styles.storyBeat }, React.createElement('span', { className: styles.storyNumber, 'aria-hidden': true }, String(story.star).padStart(2, '0')), React.createElement('div', null, React.createElement('strong', null, story.title), React.createElement('p', null, story.body), story.nextAt !== undefined && React.createElement('small', null, `下一段鲸歌将在 ${story.nextAt} 共鸣时显现。`))),
  )
}

export function PresentationSection({ presentation, onNotice }: { presentation: ReturnType<typeof usePresentation>, onNotice: (notice: string) => void }): React.ReactElement {
  const titleId = React.useId()
  const radioName = `whale-presentation-${titleId}`
  const update = (value: typeof presentation.value): void => { const saved = presentationStore.set(value); onNotice(saved ? '已更新本地陪伴偏好。' : '偏好已在本次页面生效，但浏览器拒绝持久保存。') }
  return React.createElement('section', { className: `${styles.section} ${styles.preferenceSection}`, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '陪伴强度'), React.createElement('span', null, '只保存在此浏览器')),
    React.createElement('div', { className: styles.preferenceOptions }, ...(['quiet', 'standard', 'lively'] as const).map(mode => React.createElement('label', { key: mode }, React.createElement('input', { type: 'radio', name: radioName, value: mode, checked: presentation.value.mode === mode, onChange: () => update({ ...presentation.value, mode }) }), mode === 'quiet' ? '安静' : mode === 'standard' ? '标准' : '热闹'))),
    React.createElement('label', { className: styles.motionToggle }, React.createElement('input', { type: 'checkbox', checked: presentation.systemReducedMotion || presentation.value.reduceMotion, disabled: presentation.systemReducedMotion, onChange: event => update({ ...presentation.value, reduceMotion: event.currentTarget.checked }) }), presentation.systemReducedMotion ? '系统已要求减少动画' : '减少视觉动效'),
    !presentation.storageAvailable && React.createElement('p', { className: styles.preferenceWarning }, '浏览器未开放本地偏好存储。本次页面仍可使用默认设置，鲸鱼进度不受影响。'),
  )
}

export function PrivacyLedgerSection(): React.ReactElement {
  const titleId = React.useId()
  return React.createElement('section', { className: styles.section, 'aria-labelledby': titleId },
    React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: titleId }, '隐私账本'), React.createElement('span', null, '每个出口都说清楚')),
    React.createElement('dl', { className: styles.privacyLedger }, ...PRIVACY_LEDGER.flatMap(item => [React.createElement('dt', { key: `${item.name}-term` }, item.name), React.createElement('dd', { key: `${item.name}-detail` }, React.createElement('strong', null, '包含：'), item.includes, React.createElement('br'), React.createElement('strong', null, '不包含：'), item.excludes)])),
  )
}
