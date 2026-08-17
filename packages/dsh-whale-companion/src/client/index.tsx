import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import whaleRemote from 'dsh-whale-companion/remote'
import type { WhalePosition, WhaleState } from '../spec.ts'
import type { WhaleAchievementId, WhaleSkin } from '../types.ts'
import styles from './Whale.module.css'

export const inject = ['remote', 'slots']

type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { message: string } }
type RawWhaleApi = {
  get: () => Promise<RemoteResult<WhaleState>>
  setSkin: (skin: WhaleState['skin']) => Promise<RemoteResult<WhaleState>>
  setPosition: (position: WhalePosition) => Promise<RemoteResult<WhaleState>>
  export: () => Promise<RemoteResult<string>>
  import: (payload: string) => Promise<RemoteResult<WhaleState>>
  reset: () => Promise<RemoteResult<WhaleState>>
}
type WhaleApi = {
  get: () => Promise<WhaleState>
  setSkin: (skin: WhaleState['skin']) => Promise<WhaleState>
  setPosition: (position: WhalePosition) => Promise<WhaleState>
  export: () => Promise<string>
  import: (payload: string) => Promise<WhaleState>
  reset: () => Promise<WhaleState>
}

type AchievementMeta = Readonly<{ icon: string, title: string, description: string }>
type SkinMeta = Readonly<{ name: string, color: string }>

const SKINS: Record<WhaleSkin, SkinMeta> = {
  ocean: { name: '蔚蓝海域', color: '#2c9cff' },
  coral: { name: '珊瑚暖流', color: '#ed6f61' },
  midnight: { name: '深海午夜', color: '#5d68d9' },
  aurora: { name: '极光海湾', color: '#35c894' },
  sunset: { name: '落日鲸歌', color: '#f49a3d' },
  nebula: { name: '星云潮汐', color: '#a976eb' },
}

const ACHIEVEMENTS: Record<WhaleAchievementId, AchievementMeta> = {
  'first-swim': { icon: '🌊', title: '初次畅游', description: '开启 1 次会话' },
  'ten-turns': { icon: '💬', title: '对话起航', description: '完成 10 个用户回合' },
  century: { icon: '🏄', title: '百回合浪潮', description: '完成 100 个用户回合' },
  'week-current': { icon: '📅', title: '七日潮汐', description: '连续使用 7 天' },
  'month-tide': { icon: '🌙', title: '满月航线', description: '连续使用 30 天' },
  'level-five': { icon: '⭐', title: '远洋新手', description: '到达 5 级' },
  'level-ten': { icon: '🌟', title: '深海专家', description: '到达 10 级' },
  'tool-diver': { icon: '🤿', title: '工具潜航员', description: '获得 25 次工具结果' },
  'early-bird': { icon: '🌅', title: '早潮出发', description: '在 UTC 06:00 前活动' },
  'night-owl': { icon: '🦉', title: '夜航鲸', description: '在 UTC 20:00 后活动' },
  'steady-fin': { icon: '🫧', title: '稳健鳍迹', description: '最长连续使用 3 天' },
  collector: { icon: '🏆', title: '潮汐收藏家', description: '解锁 8 个成就' },
}

async function unwrap<T>(pending: Promise<RemoteResult<T>>): Promise<T> {
  const result = await pending
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function apiFrom(raw: RawWhaleApi): WhaleApi {
  return {
    get: () => unwrap(raw.get()),
    setSkin: skin => unwrap(raw.setSkin(skin)),
    setPosition: position => unwrap(raw.setPosition(position)),
    export: () => unwrap(raw.export()),
    import: payload => unwrap(raw.import(payload)),
    reset: () => unwrap(raw.reset()),
  }
}

/** Mount the generated Remote namespace and both browser surfaces. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(whaleRemote)
  const raw = ctx.get('remote.whaleCompanion') as RawWhaleApi | undefined
  if (raw === undefined) {
    await disposeRemote()
    throw new Error('Whale Companion Remote namespace did not mount')
  }
  const api = apiFrom(raw)
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'whale-companion', order: 30, inject: () => ({ api }),
  }, WhaleOverlay))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'whale-home', order: 70, label: () => '鲸鱼小屋', inject: () => ({ api }),
  }, WhaleSettings))
  return disposeRemote
}

function useWhale(api: WhaleApi): [WhaleState | undefined, (state: WhaleState) => void, string | undefined] {
  const [state, setState] = React.useState<WhaleState>()
  const [error, setError] = React.useState<string>()
  React.useEffect(() => {
    let mounted = true
    const refresh = (): void => {
      void api.get().then(value => {
        if (mounted) { setState(value); setError(undefined) }
      }).catch(reason => { if (mounted) setError(reason instanceof Error ? reason.message : String(reason)) })
    }
    refresh()
    const timer = window.setInterval(refresh, 5_000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [api])
  return [state, setState, error]
}

function clampPosition(position: { x: number, y: number }, width: number, height: number): { x: number, y: number } {
  return {
    x: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - width - 8)),
    y: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - height - 8)),
  }
}

function pixelPosition(position: WhalePosition): { x: number, y: number } {
  return { x: position.x * window.innerWidth, y: position.y * window.innerHeight }
}

function WhaleOverlay({ api }: { api: WhaleApi }): React.ReactElement {
  const [state, setState, error] = useWhale(api)
  const [position, setPosition] = React.useState({ x: 24, y: 24 })
  const positionRef = React.useRef(position)
  const drag = React.useRef<{ x: number, y: number }>()
  const whale = React.useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const place = React.useCallback((next: { x: number, y: number }): void => {
    positionRef.current = next
    setPosition(next)
  }, [])
  React.useEffect(() => {
    if (state !== undefined && drag.current === undefined) {
      const desired = pixelPosition(state.position)
      place(whale.current === null ? desired : clampPosition(desired, whale.current.offsetWidth, whale.current.offsetHeight))
    }
  }, [place, state?.position.x, state?.position.y])
  React.useEffect(() => {
    const keepVisible = (): void => {
      if (whale.current !== null) place(clampPosition(positionRef.current, whale.current.offsetWidth, whale.current.offsetHeight))
    }
    window.addEventListener('resize', keepVisible)
    return () => window.removeEventListener('resize', keepVisible)
  }, [place])
  const persist = (next: { x: number, y: number }, target: HTMLButtonElement): void => {
    const snapped = clampPosition(next, target.offsetWidth, target.offsetHeight)
    place(snapped)
    void api.setPosition({
      x: Math.min(1, Math.max(0, snapped.x / Math.max(1, window.innerWidth))),
      y: Math.min(1, Math.max(0, snapped.y / Math.max(1, window.innerHeight))),
    }).then(setState).catch(() => undefined)
  }
  const move = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (drag.current === undefined) return
    place(clampPosition({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }, event.currentTarget.offsetWidth, event.currentTarget.offsetHeight))
  }
  const end = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (drag.current === undefined) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = undefined
    setDragging(false)
    const edge = positionRef.current.x + event.currentTarget.offsetWidth / 2 < window.innerWidth / 2 ? 8 : Math.max(8, window.innerWidth - event.currentTarget.offsetWidth - 8)
    persist({ ...positionRef.current, x: edge }, event.currentTarget)
  }
  const keyMove = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const step = event.shiftKey ? 32 : 12
    const target = event.currentTarget
    let next = positionRef.current
    if (event.key === 'ArrowLeft') next = { ...next, x: next.x - step }
    else if (event.key === 'ArrowRight') next = { ...next, x: next.x + step }
    else if (event.key === 'ArrowUp') next = { ...next, y: next.y - step }
    else if (event.key === 'ArrowDown') next = { ...next, y: next.y + step }
    else if (event.key === 'Home') next = { x: 8, y: 8 }
    else if (event.key === 'End') next = { x: window.innerWidth - target.offsetWidth - 8, y: window.innerHeight - target.offsetHeight - 8 }
    else return
    event.preventDefault()
    persist(next, target)
  }
  const skin = state?.skin ?? 'ocean'
  return React.createElement('div', { className: styles.overlay },
    React.createElement('button', {
      ref: whale, type: 'button', className: styles.whale, style: { transform: `translate(${position.x}px, ${position.y}px)`, '--whale-skin': SKINS[skin].color } as React.CSSProperties,
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX - positionRef.current.x, y: event.clientY - positionRef.current.y }; setDragging(true) },
      onPointerMove: move, onPointerUp: end, onPointerCancel: end, onKeyDown: keyMove,
      'data-skin': skin, 'aria-label': `鲸鱼伙伴，等级 ${state?.level ?? 1}。可拖动；使用方向键移动，Shift 加速。`, 'aria-describedby': 'whale-move-help',
    }, React.createElement('span', { className: styles.whaleBody, 'aria-hidden': true }, '🐋'), React.createElement('span', { className: styles.badge }, `Lv ${state?.level ?? 1}`)),
    React.createElement('span', { id: 'whale-move-help', className: styles.visuallyHidden }, '拖动后自动吸附到屏幕左右边缘。按方向键移动，按 Shift 加方向键可快速移动。'),
    React.createElement('span', { className: styles.overlayStatus, role: 'status', 'aria-live': 'polite' }, error ?? (dragging ? '正在移动鲸鱼' : '')),
  )
}

function WhaleSettings({ api }: { api: WhaleApi }): React.ReactElement {
  const [state, setState, error] = useWhale(api)
  const [transfer, setTransfer] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)
  const action = async (work: () => Promise<WhaleState>, success: string): Promise<void> => {
    setBusy(true); setNotice('')
    try { setState(await work()); setConfirmReset(false); setNotice(success) } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) }
  }
  const exportBackup = async (): Promise<void> => {
    setBusy(true); setNotice('')
    try { setTransfer(await api.export()); setNotice('备份已生成，仅包含本地进度数据。') } catch (reason) { setNotice(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) }
  }
  if (state === undefined) return React.createElement('section', { className: styles.home, 'aria-busy': true }, React.createElement('p', { className: error === undefined ? styles.loading : styles.error, role: error === undefined ? 'status' : 'alert' }, error ?? '正在加载你的鲸鱼小屋…'))
  const levelFloor = 100 * (state.level - 1) ** 2
  const levelCeiling = 100 * state.level ** 2
  const levelProgress = Math.min(100, Math.round(((state.xp - levelFloor) / Math.max(1, levelCeiling - levelFloor)) * 100))
  const unlocked = new Set(state.achievements)
  return React.createElement('section', { className: styles.home, 'aria-busy': busy },
    React.createElement('header', { className: styles.hero },
      React.createElement('div', null, React.createElement('p', { className: styles.eyebrow }, '本地鲸鱼伙伴'), React.createElement('h2', null, '鲸鱼小屋'), React.createElement('p', { className: styles.intro }, '每一次轻量活动都会推动鲸鱼前行；所有进度只保存在本地。')),
      React.createElement('div', { className: styles.heroWhale, 'aria-hidden': true }, '🐋')),
    React.createElement('div', { className: styles.progressCard },
      React.createElement('div', { className: styles.progressHeading }, React.createElement('strong', null, `等级 ${state.level}`), React.createElement('span', null, `${state.xp} XP`)),
      React.createElement('div', { className: styles.progressTrack, role: 'progressbar', 'aria-label': '距下一等级的经验进度', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': levelProgress }, React.createElement('span', { style: { width: `${levelProgress}%` } })),
      React.createElement('p', null, `${levelProgress}% 前往等级 ${state.level + 1}`)),
    React.createElement('p', { className: styles.privacy }, '隐私承诺：不会读取、保存或展示提示词、消息、代码、路径或工具参数。'),
    error && React.createElement('p', { className: styles.error, role: 'alert' }, error),
    notice && React.createElement('p', { className: notice.includes('已') ? styles.success : styles.error, role: notice.includes('已') ? 'status' : 'alert', 'aria-live': 'polite' }, notice),
    React.createElement('div', { className: styles.stats, 'aria-label': '进度统计' }, stat('等级', state.level), stat('总经验', state.xp), stat('连续使用', `${state.streak} 天`), stat('最长连续', `${state.longestStreak} 天`), stat('用户回合', state.turns), stat('工具结果', state.tools), stat('会话次数', state.sessions)),
    React.createElement('section', { className: styles.section, 'aria-labelledby': 'whale-skins' }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: 'whale-skins' }, '鲸鱼皮肤'), React.createElement('span', null, '6 款可选')),
      React.createElement('div', { className: styles.skins, role: 'radiogroup', 'aria-label': '选择鲸鱼皮肤' }, ...Object.entries(SKINS).map(([value, meta]) => {
        const skin = value as WhaleSkin
        return React.createElement('button', { key: skin, type: 'button', role: 'radio', 'aria-checked': state.skin === skin, className: state.skin === skin ? styles.selected : styles.skin, disabled: busy, onClick: () => void action(() => api.setSkin(skin), `已切换为${meta.name}。`) }, React.createElement('span', { className: styles.swatch, style: { backgroundColor: meta.color }, 'aria-hidden': true }), React.createElement('span', null, meta.name))
      }))),
    React.createElement('section', { className: styles.section, 'aria-labelledby': 'whale-achievements' }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: 'whale-achievements' }, '成就图鉴'), React.createElement('span', null, `${state.achievements.length}/12 已解锁`)),
      React.createElement('ul', { className: styles.achievements }, ...Object.entries(ACHIEVEMENTS).map(([id, meta]) => {
        const earned = unlocked.has(id as WhaleAchievementId)
        return React.createElement('li', { key: id, className: earned ? styles.achievement : `${styles.achievement} ${styles.locked}` }, React.createElement('span', { className: styles.achievementIcon, 'aria-hidden': true }, earned ? meta.icon : '🔒'), React.createElement('div', null, React.createElement('strong', null, earned ? meta.title : '未解锁成就'), React.createElement('span', null, earned ? meta.description : `达成条件：${meta.description}`)))
      }))),
    React.createElement('section', { className: styles.section, 'aria-labelledby': 'whale-backup' }, React.createElement('div', { className: styles.sectionHeading }, React.createElement('h3', { id: 'whale-backup' }, '本地备份'), React.createElement('span', null, '可迁移已验证进度')),
      React.createElement('label', { className: styles.backupLabel, htmlFor: 'whale-backup-data' }, '备份数据'),
      React.createElement('textarea', { id: 'whale-backup-data', value: transfer, disabled: busy, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setTransfer(event.currentTarget.value), placeholder: '点击“导出备份”生成数据，或粘贴此前的本地备份。' }),
      React.createElement('div', { className: styles.actions }, React.createElement('button', { type: 'button', disabled: busy, onClick: () => void exportBackup() }, busy ? '处理中…' : '导出备份'), React.createElement('button', { type: 'button', disabled: busy || transfer.trim() === '', onClick: () => void action(() => api.import(transfer), '已导入本地备份。') }, '导入备份'), React.createElement('button', { type: 'button', className: styles.danger, disabled: busy, onClick: () => { if(confirmReset)void action(() => api.reset(), '已重置本地鲸鱼进度。');else{setConfirmReset(true);setNotice('再次点击“确认重置”将永久清除本地进度。')} } }, confirmReset?'确认重置':'重置进度'))))
}

function stat(label: string, value: string | number): React.ReactElement {
  return React.createElement('div', { className: styles.stat, key: label }, React.createElement('strong', null, String(value)), React.createElement('span', null, label))
}
