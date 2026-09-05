import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import whaleRemote from 'dsh-whale-companion/remote'
import { WHALE_COLLECTIBLES as COLLECTIBLES, WHALE_SLOT_LABELS as SLOT_LABELS, whaleRoomSlotId } from '../catalog.ts'
import type { WhaleCollectibleId, WhaleRoomSlotId, WhaleState } from '../spec.ts'
import type { WhaleVisitorBottle } from '../reducer.ts'
import { WHALE_SPECIES, WHALE_SPECIES_BY_ID, isSpeciesUnlocked, resonanceStars, xpFloorForLevel, xpToNextLevel } from '../species.ts'
import type { WhaleAchievementId } from '../types.ts'
import { ACHIEVEMENTS, SKINS } from './catalog.ts'
import { CoveOverview, PresentationSection, PrivacyLedgerSection, StoryBeatSection, WeeklyJournal } from './enrichment.tsx'
import { CommunitySection as CommunitySectionV21, ExpeditionSection as ExpeditionSectionV21, RoomSection as RoomSectionV21, TideSection as TideSectionV21 } from './feature-sections.tsx'
import { WhaleArt, skinPaletteStyle } from './WhaleArt.tsx'
import { CompanionPlanSection, SkinPaletteSection, WhaleOverlayExtras } from './planned-sections.tsx'
import { usePresentation } from './presentation-store.ts'
import { speciesArtStyle } from './asset-styles.ts'
import { SpeciesMotionCard } from './SpeciesMotionCard.tsx'
import { apiFrom, storeFor, useWhale, type RawWhaleApi, type WhaleApi } from './store.ts'
import { coveItems, currentStoryBeat, reactionDuration, reactionPresentation, sevenDayJournal, shouldPresentReaction } from './view-model.ts'
import styles from './Whale.module.css'

export const inject = ['remote', 'slots']

const DRAG_THRESHOLD = 5

/** Mounts the Whale Remote namespace and both browser surfaces. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(whaleRemote)
  const raw = ctx.get('remote.whaleCompanion') as RawWhaleApi | undefined
  if (raw === undefined) { await disposeRemote(); throw new Error('Whale Companion Remote namespace did not mount') }
  const api = apiFrom(raw)
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'whale-companion', order: 30, inject: () => ({ api }) }, WhaleOverlay))
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'whale-home', order: 70, label: () => '鲸鱼小屋', inject: () => ({ api }) }, WhaleSettings))
  return disposeRemote
}

function WhaleOverlay({ api }: { api: WhaleApi }): React.ReactElement {
  const { state, error } = useWhale(api)
  const [position, setPosition] = React.useState({ x: 24, y: 24 })
  const [homeOpen, setHomeOpen] = React.useState(false)
  const [quickOpen, setQuickOpen] = React.useState(false)
  const [xpGain, setXpGain] = React.useState<number>()
  const previousXp = React.useRef<number>()
  const positionRef = React.useRef(position)
  const drag = React.useRef<{ x: number, y: number, startX: number, startY: number, moved: boolean }>()
  const clickEligible = React.useRef(false)
  const whale = React.useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const presentation = usePresentation()
  const latestMoment = state?.moments.at(-1)
  const latestReaction = reactionPresentation(latestMoment)
  const firstMoment = React.useRef<string>()
  const [visibleReaction, setVisibleReaction] = React.useState<typeof latestReaction>()
  React.useEffect(() => {
    if (state === undefined) return
    const previous = previousXp.current
    previousXp.current = state.xp
    if (previous === undefined || state.xp <= previous) return
    setXpGain(state.xp - previous)
    const timer = window.setTimeout(() => setXpGain(undefined), 1_900)
    return () => window.clearTimeout(timer)
  }, [state?.xp])
  React.useEffect(() => {
    if (latestReaction === undefined) { setVisibleReaction(undefined); return }
    if (firstMoment.current === undefined) { firstMoment.current = latestReaction.id; setVisibleReaction(undefined); return }
    if (!shouldPresentReaction({ reaction: latestReaction, previousId: firstMoment.current, occurredAt: latestMoment?.at ?? 0, now: Date.now(), hidden: document.hidden, mode: presentation.value.mode })) { firstMoment.current = latestReaction.id; setVisibleReaction(undefined); return }
    firstMoment.current = latestReaction.id
    setVisibleReaction(latestReaction)
    const duration = reactionDuration(presentation.value.mode)
    const timer = window.setTimeout(() => setVisibleReaction(undefined), duration)
    return () => window.clearTimeout(timer)
  }, [latestMoment?.at, latestReaction?.id, presentation.value.mode])
  const place = React.useCallback((next: { x: number, y: number }): void => { positionRef.current = next; setPosition(next) }, [])
  React.useEffect(() => {
    if (state !== undefined && drag.current === undefined) {
      const desired = { x: state.position.x * window.innerWidth, y: state.position.y * window.innerHeight }
      place(whale.current === null ? desired : clampPosition(desired, whale.current.offsetWidth, whale.current.offsetHeight))
    }
  }, [place, state?.position.x, state?.position.y])
  React.useEffect(() => { const keepVisible = (): void => { if (whale.current !== null) place(clampPosition(positionRef.current, whale.current.offsetWidth, whale.current.offsetHeight)) }; window.addEventListener('resize', keepVisible); return () => window.removeEventListener('resize', keepVisible) }, [place])
  const persist = (next: { x: number, y: number }, target: HTMLButtonElement): void => {
    const snapped = clampPosition(next, target.offsetWidth, target.offsetHeight); place(snapped)
    void storeFor(api).mutate(() => api.setPosition({ x: Math.min(1, Math.max(0, snapped.x / Math.max(1, window.innerWidth))), y: Math.min(1, Math.max(0, snapped.y / Math.max(1, window.innerHeight))) })).catch(() => undefined)
  }
  const move = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const current = drag.current
    if (current === undefined) return
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD) return
    if (!current.moved) { current.moved = true; clickEligible.current = false; setQuickOpen(false); setDragging(true) }
    place(clampPosition({ x: event.clientX - current.x, y: event.clientY - current.y }, event.currentTarget.offsetWidth, event.currentTarget.offsetHeight))
  }
  const end = (event: React.PointerEvent<HTMLButtonElement>, snap = true): void => {
    const current = drag.current
    if (current === undefined) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = undefined; setDragging(false)
    if (!current.moved || !snap) return
    const edge = positionRef.current.x + event.currentTarget.offsetWidth / 2 < window.innerWidth / 2 ? 8 : Math.max(8, window.innerWidth - event.currentTarget.offsetWidth - 8)
    persist({ ...positionRef.current, x: edge }, event.currentTarget)
  }
  const keyMove = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') { setQuickOpen(false); return }
    const step = event.shiftKey ? 32 : 12; const target = event.currentTarget; let next = positionRef.current
    if (event.key === 'ArrowLeft') next = { ...next, x: next.x - step }; else if (event.key === 'ArrowRight') next = { ...next, x: next.x + step }
    else if (event.key === 'ArrowUp') next = { ...next, y: next.y - step }; else if (event.key === 'ArrowDown') next = { ...next, y: next.y + step }
    else if (event.key === 'Home') next = { x: 8, y: 8 }; else if (event.key === 'End') next = { x: window.innerWidth - target.offsetWidth - 8, y: window.innerHeight - target.offsetHeight - 8 }; else return
    event.preventDefault(); persist(next, target)
  }
  const species = WHALE_SPECIES_BY_ID[state?.species ?? 'common-minke']
  const skin = state?.skin ?? 'ocean'
  const reduced = presentation.systemReducedMotion || presentation.value.reduceMotion
  return React.createElement('div', { className: styles.overlay, 'data-mode': presentation.value.mode, 'data-reduced': reduced ? 'true' : 'false' },
    React.createElement('button', {
      ref: whale, type: 'button', className: styles.whale, style: { ...skinPaletteStyle(skin), transform: `translate(${position.x}px, ${position.y}px)`, '--species-color': species.palette } as React.CSSProperties,
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX - positionRef.current.x, y: event.clientY - positionRef.current.y, startX: event.clientX, startY: event.clientY, moved: false }; clickEligible.current = true },
      onPointerMove: move, onPointerUp: end, onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => { clickEligible.current = false; end(event, false) }, onClick: (event: React.MouseEvent<HTMLButtonElement>) => { if (event.detail !== 0 && !clickEligible.current) return; clickEligible.current = false; setQuickOpen(value => !value) }, onKeyDown: keyMove,
      'data-skin': skin, 'aria-label': `${state?.name ?? '小蓝'}，${species.nameZh}鲸鱼伙伴，海洋等级 ${state?.level ?? 1}。点击打开快速航行卡；可拖动；使用方向键移动。`, 'aria-describedby': 'whale-move-help', 'aria-expanded': quickOpen, 'aria-controls': 'whale-quick-card',
    }, React.createElement(WhaleArt, { species, skin, compact: true, title: `${species.nameZh}鲸鱼伙伴` }), React.createElement('span', { className: styles.badge }, `Lv ${state?.level ?? 1} · ${species.nameZh}`)),
    visibleReaction && React.createElement('div', { className: visibleReaction.priority === 'high' ? `${styles.reactionBubble} ${styles.reactionHigh}` : styles.reactionBubble, style: { transform: `translate(${position.x + 76}px, ${Math.max(8, position.y - 4)}px)` }, role: visibleReaction.priority === 'high' ? 'status' : undefined, 'aria-live': visibleReaction.priority === 'high' ? 'polite' : undefined }, React.createElement('strong', null, species.nameZh), React.createElement('span', null, visibleReaction.message)),
    state && React.createElement(WhaleOverlayExtras, { state, position, open: quickOpen, xpGain, onClose: () => setQuickOpen(false), onOpenHome: () => { setQuickOpen(false); setHomeOpen(true) } }),
    React.createElement('span', { id: 'whale-move-help', className: styles.visuallyHidden }, '点击打开快速航行卡，再进入完整鲸鱼小屋。拖动后自动吸附到屏幕左右边缘。按方向键移动，按 Shift 加方向键可快速移动；按 Escape 关闭快速卡。'),
    React.createElement('span', { className: styles.overlayStatus, role: 'status', 'aria-live': 'polite' }, error ?? (dragging ? '正在移动鲸鱼' : '')),
    homeOpen && React.createElement(WhaleHut, { api, onClose: () => setHomeOpen(false), returnFocus: () => window.setTimeout(() => whale.current?.focus(), 0) }),
  )
}

function WhaleHut({ api, onClose, returnFocus }: { api: WhaleApi, onClose: () => void, returnFocus: () => void }): React.ReactElement {
  const closeButton = React.useRef<HTMLButtonElement>(null)
  const dialog = React.useRef<HTMLElement>(null)
  const close = React.useCallback((): void => { onClose(); returnFocus() }, [onClose, returnFocus])
  React.useEffect(() => { closeButton.current?.focus(); const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') { event.preventDefault(); close() } }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape) }, [close])
  const trapFocus = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Tab' || dialog.current === null) return
    const controls = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), select:not([disabled]), input:not([disabled]), [href]')].filter(control => control.offsetParent !== null)
    if (controls.length === 0) { event.preventDefault(); return }
    const first = controls[0]!; const last = controls.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return React.createElement('div', { className: styles.hutBackdrop, onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) close() } },
    React.createElement('section', { ref: dialog, className: styles.hut, role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'whale-hut-title', onKeyDown: trapFocus },
      React.createElement('button', { ref: closeButton, type: 'button', className: styles.hutClose, onClick: close, 'aria-label': '关闭鲸鱼小屋' }, '×'),
      React.createElement(WhaleSettings, { api, headingId: 'whale-hut-title' }),
    ),
  )
}

function WhaleSettings({ api, headingId }: { api: WhaleApi, headingId?: string }): React.ReactElement {
  const { state, error, refreshing } = useWhale(api)
  const presentation = usePresentation()
  const instanceId = React.useId()
  const sectionIds = { species: `${instanceId}-species`, visitor: `${instanceId}-visitor`, achievements: `${instanceId}-achievements`, backup: `${instanceId}-backup` }
  const [transfer, setTransfer] = React.useState('')
  const [visitor, setVisitor] = React.useState('')
  const [community, setCommunity] = React.useState('')
  const [visitorPreview, setVisitorPreview] = React.useState<WhaleVisitorBottle>()
  const [notice, setNotice] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [selectedSlot, setSelectedSlot] = React.useState<WhaleRoomSlotId>('foreground')
  const [confirmReset, setConfirmReset] = React.useState(false)
  const action = async (work: () => Promise<WhaleState>, success: string): Promise<void> => { setBusy(true); setNotice(''); try { await storeFor(api).mutate(work); setConfirmReset(false); setNotice(success) } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) } }
  const exportText = async (work: () => Promise<string>, write: (value: string) => void, message: string): Promise<void> => { setBusy(true); setNotice(''); try { write(await work()); setNotice(message) } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) } }
  if (state === undefined) return React.createElement('section', { className: styles.home, 'aria-busy': refreshing }, React.createElement('p', { className: error === undefined ? styles.loading : styles.error, role: error === undefined ? 'status' : 'alert' }, error ?? '正在加载你的鲸鱼小屋…本地进度不会受影响。'), error && React.createElement('button', { type: 'button', className: styles.retryButton, onClick: () => storeFor(api).retry() }, '重试读取'))
  const species = WHALE_SPECIES_BY_ID[state.species]; const levelFloor = xpFloorForLevel(state.level); const span = xpToNextLevel(state.level); const progress = state.level >= 100 ? 100 : Math.min(100, Math.round(((state.xp - levelFloor) / Math.max(1, span)) * 100)); const stars = resonanceStars(state.resonance[state.species] ?? 0)
  const journal = sevenDayJournal(state)
  const story = currentStoryBeat(state)
  const cove = coveItems(state)
  const currentSlotItem = state.room.slots[selectedSlot]
  const slotItems = COLLECTIBLES.filter(item => item.slot === selectedSlot && state.collectibles.some(owned => owned.collectibleId === item.id))
  return React.createElement('section', { className: styles.home, 'aria-busy': busy || refreshing, 'data-presentation': presentation.value.mode, 'data-reduced': presentation.systemReducedMotion || presentation.value.reduceMotion ? 'true' : 'false' },
    React.createElement('header', { className: styles.hero },
      React.createElement('div', null, React.createElement('p', { className: styles.eyebrow }, '本地鲸鱼伙伴 · OCEAN TIDES'), React.createElement('h2', { id: headingId }, '鲸鱼小屋'), React.createElement('p', { className: styles.intro }, '鲸鱼会把安全的工作节奏化成潮汐、纪念物与一间只属于你的海湾。')),
      React.createElement('span', { className: styles.heroWhale, style: { '--species-color': species.palette, ...skinPaletteStyle(state.skin) } as React.CSSProperties, 'aria-hidden': true }, React.createElement(WhaleArt, { species, skin: state.skin })),
    ),
    React.createElement('div', { className: styles.progressCard }, React.createElement('div', { className: styles.progressHeading }, React.createElement('strong', null, `海洋等级 ${state.level}`), React.createElement('span', null, `${state.xp} XP`)), React.createElement('div', { className: styles.progressTrack, role: 'progressbar', 'aria-label': '距下一等级的经验进度', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress }, React.createElement('span', { style: { width: `${progress}%` } })), React.createElement('p', null, state.level >= 100 ? '已抵达等级 100 · 未知之鲸正在聆听。' : `${progress}% 前往等级 ${state.level + 1} · 还需 ${levelFloor + span - state.xp} XP`)),
    React.createElement('p', { className: styles.privacy }, '隐私承诺：只使用事件类型、序号与时间产生本地进度。不会读取、保存、导出或分享提示词、消息、代码、路径、工具参数或工具结果。'),
    error && React.createElement('div', { className: styles.error, role: 'alert' }, React.createElement('span', null, `${error}，已保留上次读取的本地进度。`), React.createElement('button', { type: 'button', onClick: () => storeFor(api).retry() }, '重试')), notice && React.createElement('p', { className: notice.startsWith('已') ? styles.success : styles.error, role: notice.startsWith('已') ? 'status' : 'alert', 'aria-live': 'polite' }, notice),
    React.createElement('div', { className: styles.stats, 'aria-label': '进度统计' }, stat('海洋等级', state.level), stat('已观测鲸灵', `${WHALE_SPECIES.filter(candidate => isSpeciesUnlocked(candidate, state.level)).length}/20`), stat('当前共鸣', `${stars} 星`), stat('连续使用', `${state.streak} 天`), stat('今日潮汐', state.moments.filter(moment => moment.progressDay === state.moments.at(-1)?.progressDay).length), stat('纪念物', `${state.collectibles.length}/24`)),
    React.createElement(CompanionPlanSection, { api, state, busy, action, onNotice: setNotice }),
    React.createElement(WeeklyJournal, { journal }),
    React.createElement(CoveOverview, { cove, species, skin: state.skin }),
    React.createElement(StoryBeatSection, { story, speciesName: species.nameZh }),
    React.createElement(PresentationSection, { presentation, onNotice: setNotice }),
    React.createElement(TideSectionV21, { api, state, busy, onNotice: setNotice }),
    React.createElement('section', { className: styles.section, 'aria-labelledby': sectionIds.species }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: sectionIds.species }, '鲸灵图鉴'), React.createElement('span', null, '与解锁的鲸灵同行')), React.createElement(SpeciesMotionCard, { species }), React.createElement('div', { className: styles.speciesGrid }, ...WHALE_SPECIES.map(candidate => {
      const unlocked = isSpeciesUnlocked(candidate, state.level); const selected = candidate.id === state.species; const candidateStars = resonanceStars(state.resonance[candidate.id] ?? 0)
      return React.createElement('article', { key: candidate.id, className: unlocked ? styles.speciesCard : `${styles.speciesCard} ${styles.locked}` }, React.createElement('span', { className: styles.speciesArt, style: speciesArtStyle(candidate), 'aria-hidden': true }), React.createElement('div', null, React.createElement('strong', null, candidate.nameZh), React.createElement('span', null, candidate.nameEn), React.createElement('p', null, unlocked ? candidate.ability : `海洋等级 ${candidate.unlockLevel} 解锁`), React.createElement('small', null, unlocked ? `共鸣 ${candidateStars}/5` : '尚未观测')), React.createElement('button', { type: 'button', disabled: busy || !unlocked || selected, 'aria-pressed': selected, onClick: () => void action(() => api.setSpeciesV5(candidate.id), `已与${candidate.nameZh}同行。`) }, selected ? '同行中' : unlocked ? '与它同行' : `Lv ${candidate.unlockLevel}`))
    }))),
    React.createElement(RoomSectionV21, { api, state, busy, selectedSlot, setSelectedSlot, action }),
    React.createElement(ExpeditionSectionV21, { api, state, busy, action }),
    React.createElement(CommunitySectionV21, { api, state, busy, community, setCommunity, action, exportText }),
    React.createElement('section', { className: styles.section, 'aria-labelledby': sectionIds.visitor }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: sectionIds.visitor }, '访客瓶'), React.createElement('span', null, '只读预览，不覆盖进度')), React.createElement('p', { className: styles.sectionIntro }, '把小屋的皮肤、鲸灵和布置装进一只本地文件。它不包含任务、对话、路径或账号。'), React.createElement('textarea', { value: visitor, disabled: busy, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setVisitor(event.currentTarget.value), placeholder: '导出自己的访客瓶，或粘贴朋友的访客瓶。' }), React.createElement('div', { className: styles.actions }, React.createElement('button', { type: 'button', disabled: busy, onClick: () => void exportText(() => api.exportVisitorBottleV5(), setVisitor, '已导出只读访客瓶。') }, '导出访客瓶'), React.createElement('button', { type: 'button', disabled: busy || visitor.trim() === '', onClick: () => void (async () => { setBusy(true); try { setVisitorPreview(await api.importVisitorBottleV5(visitor)); setNotice('已在隔离预览中打开访客瓶。') } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) } })() }, '隔离预览')), visitorPreview && React.createElement('div', { className: styles.preview }, React.createElement('strong', null, `${WHALE_SPECIES_BY_ID[visitorPreview.room.species].nameZh}的访客海湾`), React.createElement('span', null, `已放置 ${Object.values(visitorPreview.room.slots).filter(Boolean).length} 件纪念物 · 仅预览`))),
    React.createElement(PrivacyLedgerSection),
    React.createElement(SkinPaletteSection, { api, state, busy, action }),
    React.createElement('section', { className: styles.section, 'aria-labelledby': sectionIds.achievements }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: sectionIds.achievements }, '成就图鉴'), React.createElement('span', null, `${state.achievements.length}/12 已解锁`)), React.createElement('ul', { className: styles.achievements }, ...Object.entries(ACHIEVEMENTS).map(([id, meta]) => { const earned = state.achievements.includes(id as WhaleAchievementId); return React.createElement('li', { key: id, className: earned ? styles.achievement : `${styles.achievement} ${styles.locked}` }, React.createElement('span', { className: styles.achievementIcon, 'data-achievement': meta.mark, 'data-locked': earned ? 'false' : 'true', 'aria-hidden': true }), React.createElement('div', null, React.createElement('strong', null, earned ? meta.title : '未解锁成就'), React.createElement('span', null, earned ? meta.description : `达成条件：${meta.description}`))) }))),
    React.createElement('section', { className: styles.section, 'aria-labelledby': sectionIds.backup },
      React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: sectionIds.backup }, '本地备份'), React.createElement('span', null, '不含会话与工作内容')),
      React.createElement('textarea', { value: transfer, disabled: busy, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setTransfer(event.currentTarget.value), placeholder: '点击“导出备份”生成数据，或粘贴此前的本地备份。' }),
      React.createElement('div', { className: styles.actions },
        React.createElement('button', { type: 'button', disabled: busy, onClick: () => void exportText(() => api.export(), setTransfer, '已生成本地备份。') }, '导出备份'),
        React.createElement('button', { type: 'button', disabled: busy || transfer.trim() === '', onClick: () => void action(() => api.import(transfer), '已导入本地备份。') }, '导入备份'),
        React.createElement('button', { type: 'button', className: styles.danger, disabled: busy, onClick: () => { if (confirmReset) { void action(() => api.reset(), '已重置所有本地鲸鱼进度。') } else { setConfirmReset(true); setNotice('再次点击“确认重置”将清除本地鲸鱼进度。') } } }, confirmReset ? '确认重置' : '重置进度'),
      ),
    ),
  )
}

function RoomSection({ api, state, busy, selectedSlot, setSelectedSlot, currentSlotItem, slotItems, action, onNotice }: { api: WhaleApi, state: WhaleState, busy: boolean, selectedSlot: WhaleRoomSlotId, setSelectedSlot: (slot: WhaleRoomSlotId) => void, currentSlotItem: WhaleCollectibleId | null, slotItems: readonly typeof COLLECTIBLES[number][], action: (work: () => Promise<WhaleState>, success: string) => Promise<void>, onNotice: (notice: string) => void }): React.ReactElement {
  return React.createElement('section', { className: styles.section, 'aria-labelledby': 'room-title' }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: 'room-title' }, '海湾布置'), React.createElement('span', null, `${Object.values(state.room.slots).filter(Boolean).length}/8 已布置`)), React.createElement('p', { className: styles.sectionIntro }, '纪念物来自成长，不是货币。每件只能放进最合适的位置。'), React.createElement('div', { className: styles.room }, ...whaleRoomSlotId.map(slot => { const item = state.room.slots[slot]; return React.createElement('button', { key: slot, type: 'button', className: slot === selectedSlot ? styles.roomSlotSelected : styles.roomSlot, 'aria-pressed': slot === selectedSlot, onClick: () => setSelectedSlot(slot) }, React.createElement('span', null, SLOT_LABELS[slot]), React.createElement('strong', null, item === null ? '空位' : COLLECTIBLES.find(collectible => collectible.id === item)?.name ?? item)) })), React.createElement('div', { className: styles.roomControls }, React.createElement('strong', null, `${SLOT_LABELS[selectedSlot]}：${currentSlotItem === null ? '尚未放置' : COLLECTIBLES.find(item => item.id === currentSlotItem)?.name}`), React.createElement('div', { className: styles.chips }, ...slotItems.map(item => React.createElement('button', { key: item.id, type: 'button', disabled: busy || currentSlotItem === item.id, onClick: () => void action(() => api.placeCollectibleV5(selectedSlot, item.id), `已把${item.name}放进${SLOT_LABELS[selectedSlot]}。`) }, item.name)), React.createElement('button', { type: 'button', disabled: busy || currentSlotItem === null, onClick: () => void action(() => api.placeCollectibleV5(selectedSlot, null), `已清空${SLOT_LABELS[selectedSlot]}。`) }, '移除'))), React.createElement('div', { className: styles.actions }, React.createElement('button', { type: 'button', disabled: busy, onClick: () => void action(() => api.saveRoomPresetV5(), '已保存当前小屋方案。') }, '保存方案'), ...state.room.presets.map((_, index) => React.createElement('button', { key: index, type: 'button', disabled: busy, onClick: () => void action(() => api.loadRoomPresetV5(index), `已载入方案 ${index + 1}。`) }, `载入方案 ${index + 1}`))), slotItems.length === 0 && React.createElement('p', { className: styles.empty }, '这个插槽还没有可放置的已获纪念物。继续自然航行，它们会逐渐出现。'))
}

/*
  return React.createElement('section', { className: styles.section, 'aria-labelledby': 'community-title' }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: 'community-title' }, '鲸群信标'), React.createElement('span', null, '本地导入 · 无联网')), React.createElement('p', { className: styles.sectionIntro }, '这是主动开启的本地小群预览：只交换别名、鲸灵、皮肤和粗粒度里程碑。没有帐号、消息、排行榜或后台同步。'), React.createElement('div', { className: styles.communityControls }, React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: state.community.enabled, disabled: busy, onChange: (event: React.ChangeEvent<HTMLInputElement>) => void action(() => api.setCommunityV5(event.currentTarget.checked, state.community.aliasId), event.currentTarget.checked ? '已开启鲸群本地分享。' : '已关闭鲸群本地分享。') }), ' 主动开启本地鲸群分享'), React.createElement('label', null, '我的别名', React.createElement('select', { value: state.community.aliasId, disabled: busy, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void action(() => api.setCommunityV5(state.community.enabled, event.currentTarget.value), '已更新鲸群别名。') }, ...whaleAliasId.map(alias => React.createElement('option', { key: alias, value: alias }, ALIAS_LABELS[alias]))))), React.createElement('textarea', { value: community, disabled: busy, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setCommunity(event.currentTarget.value), placeholder: '开启后可导出鲸歌，或粘贴朋友的鲸歌。' }), React.createElement('div', { className: styles.actions }, React.createElement('button', { type: 'button', disabled: busy || !state.community.enabled, onClick: () => void exportText(() => api.exportCommunitySongV5(), setCommunity, '已导出最小化鲸歌数据。') }, '导出鲸歌'), React.createElement('button', { type: 'button', disabled: busy || !state.community.enabled || community.trim() === '', onClick: () => void action(() => api.importCommunitySongV5(community), '已把鲸歌加入本地鲸群。') }, '导入鲸歌'))), state.community.peers.length === 0 ? React.createElement('p', { className: styles.empty }, '鲸群还没有访客。导入朋友的鲸歌后，这里会出现一片不含工作内容的共同海景。') : React.createElement('ul', { className: styles.peerList }, ...state.community.peers.map(peer => React.createElement('li', { key: peer.aliasId }, React.createElement('span', { className: styles.peerDot, style: { background: SKINS[peer.skin].color }, 'aria-hidden': true }), React.createElement('div', null, React.createElement('strong', null, `${ALIAS_LABELS[peer.aliasId]} · ${WHALE_SPECIES_BY_ID[peer.species].nameZh}`), React.createElement('span', null, `本周 ${peer.activityBucket} 天 · ${peer.resonanceStars} 星共鸣`)), React.createElement('button', { type: 'button', disabled: busy, onClick: () => void action(() => api.removeCommunityPeerV5(peer.aliasId), `已移除${ALIAS_LABELS[peer.aliasId]}。`) }, '移除')))))
}

*/
function clampPosition(position: { x: number, y: number }, width: number, height: number): { x: number, y: number } { return { x: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - width - 8)), y: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - height - 8)) } }
function stat(label: string, value: string | number): React.ReactElement { return React.createElement('div', { className: styles.stat, key: label }, React.createElement('strong', null, String(value)), React.createElement('span', null, label)) }
