import * as React from 'react'
import type { WhaleState } from '../spec.ts'
import type { WhaleSkin } from '../types.ts'
import { WHALE_SPECIES_BY_ID } from '../species.ts'
import { SKINS } from './catalog.ts'
import { WhaleArt, skinPaletteStyle } from './WhaleArt.tsx'
import { companionName, levelProgress, nextSpeciesForLevel, shareSummary, unlockedSpeciesCount, voyageGoals, type VoyageGoal } from './planned-features.ts'
import type { WhaleApi } from './store.ts'
import styles from './Planned.module.css'

export type WhaleAction = (work: () => Promise<WhaleState>, success: string) => Promise<void>

export function WhaleOverlayExtras({
  state,
  position,
  open,
  xpGain,
  onClose,
  onOpenHome,
}: {
  state: WhaleState
  position: { x: number, y: number }
  open: boolean
  xpGain?: number
  onClose: () => void
  onOpenHome: () => void
}): React.ReactElement {
  const species = WHALE_SPECIES_BY_ID[state.species]
  const progress = levelProgress(state)
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
  const width = 318
  const left = position.x + 94 + width < viewportWidth ? position.x + 92 : Math.max(8, position.x - width - 12)
  const top = Math.min(Math.max(8, position.y - 12), Math.max(8, viewportHeight - 306))
  return (
    <>
      {xpGain !== undefined && (
        <span
          className={styles.xpBurst}
          style={{ transform: `translate(${position.x + 54}px, ${Math.max(8, position.y - 16)}px)` }}
          role="status"
          aria-live="polite"
        >
          +{xpGain} XP
        </span>
      )}
      {open && (
        <aside
          id="whale-quick-card"
          className={styles.quickCard}
          style={{ transform: `translate(${left}px, ${top}px)`, ...skinPaletteStyle(state.skin) }}
          aria-label="鲸鱼伙伴快速航行卡"
        >
          <div className={styles.quickHeader}>
            <div>
              <span>{species.rarity} · {species.ability}</span>
              <strong>{companionName(state)}</strong>
              <small>{species.nameZh} · 海洋等级 {state.level}</small>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭快速航行卡">×</button>
          </div>
          <div className={styles.quickWhale}>
            <WhaleArt species={species} skin={state.skin} compact title={`${species.nameZh}鲸鱼伙伴`} />
          </div>
          <p>{species.story}</p>
          <div className={styles.quickProgressHeading}>
            <span>{state.level >= 100 ? '等级已满' : `前往 Lv ${state.level + 1}`}</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div className={styles.quickProgress} role="progressbar" aria-label="快速卡等级进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className={styles.quickMetrics}>
            <span><strong>{state.streak}</strong><small>连续天数</small></span>
            <span><strong>{state.achievements.length}</strong><small>成就</small></span>
            <span><strong>{unlockedSpeciesCount(state.level)}</strong><small>鲸灵</small></span>
            <span><strong>{state.tools}</strong><small>深潜</small></span>
          </div>
          <button type="button" className={styles.quickPrimary} onClick={onOpenHome}>打开完整鲸鱼小屋</button>
        </aside>
      )}
    </>
  )
}

export function CompanionPlanSection({
  api,
  state,
  busy,
  action,
  onNotice,
}: {
  api: WhaleApi
  state: WhaleState
  busy: boolean
  action: WhaleAction
  onNotice: (notice: string) => void
}): React.ReactElement {
  const titleId = React.useId()
  const [nameDraft, setNameDraft] = React.useState(companionName(state))
  const [sharing, setSharing] = React.useState(false)
  React.useEffect(() => setNameDraft(companionName(state)), [state.name])
  const goals = voyageGoals(state)
  const nextSpecies = nextSpeciesForLevel(state.level)
  const sharePng = async (): Promise<void> => {
    setSharing(true)
    try {
      await downloadPngShareCard(state)
      onNotice('已下载隐私安全的 PNG 航行名片。')
    } catch (reason) {
      onNotice(`分享失败：${message(reason)}`)
    } finally {
      setSharing(false)
    }
  }
  const copyReport = async (): Promise<void> => {
    setSharing(true)
    try {
      await copyText(shareSummary(state))
      onNotice('已复制隐私安全的航行战报。')
    } catch (reason) {
      onNotice(`复制失败：${message(reason)}`)
    } finally {
      setSharing(false)
    }
  }
  return (
    <section className={`${styles.planSection} ${styles.glassPanel}`} aria-labelledby={titleId} style={skinPaletteStyle(state.skin)}>
      <div className={styles.planHero}>
        <div className={styles.planCopy}>
          <span className={styles.kicker}>COMPANION PROFILE · VOYAGE BOARD</span>
          <h3 id={titleId}>伙伴档案与动态航线</h3>
          <p>名字、任务与分享卡都只使用本地成长数据。没有任何提示词、回复、代码、路径或工具内容进入这些界面。</p>
          <form
            className={styles.nameForm}
            onSubmit={event => {
              event.preventDefault()
              void action(() => api.setName(nameDraft), `已将鲸鱼伙伴命名为“${nameDraft.trim()}”。`)
            }}
          >
            <label htmlFor={`${titleId}-name`}>伙伴名字</label>
            <div>
              <input
                id={`${titleId}-name`}
                value={nameDraft}
                maxLength={20}
                disabled={busy}
                onChange={event => setNameDraft(event.currentTarget.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={busy || nameDraft.trim() === '' || nameDraft.trim() === companionName(state)}>保存名字</button>
            </div>
          </form>
        </div>
        <div className={styles.planWhale}>
          <WhaleArt species={WHALE_SPECIES_BY_ID[state.species]} skin={state.skin} title={`${companionName(state)}，${WHALE_SPECIES_BY_ID[state.species].nameZh}`} />
          <strong>{companionName(state)}</strong>
          <span>Lv {state.level} · {WHALE_SPECIES_BY_ID[state.species].nameZh}</span>
        </div>
      </div>
      <div className={styles.goalGrid}>
        {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
      </div>
      <div className={styles.encounterShare}>
        <article className={styles.encounterCard}>
          <span className={styles.kicker}>NEXT ENCOUNTER</span>
          {nextSpecies === undefined ? (
            <>
              <strong>完整鲸灵星图已点亮</strong>
              <p>20 种鲸灵已经全部解锁，继续航行会累积共鸣、潮汐、纪念物与远征故事。</p>
            </>
          ) : (
            <>
              <strong>{nextSpecies.nameZh} · Lv {nextSpecies.unlockLevel}</strong>
              <p>{nextSpecies.story}</p>
              <small>再提升 {nextSpecies.unlockLevel - state.level} 级即可相遇</small>
            </>
          )}
        </article>
        <article className={styles.shareCard}>
          <span className={styles.kicker}>SAFE TO SHARE</span>
          <strong>生成你的航行名片</strong>
          <p>PNG 和文本战报均在浏览器本地生成，只展示伙伴名字、等级、连续天数、成就、鲸灵与纪念物数量。</p>
          <div>
            <button type="button" disabled={busy || sharing} onClick={() => void sharePng()}>下载 PNG 名片</button>
            <button type="button" disabled={busy || sharing} onClick={() => void copyReport()}>复制航行战报</button>
          </div>
        </article>
      </div>
    </section>
  )
}

export function SkinPaletteSection({
  api,
  state,
  busy,
  action,
}: {
  api: WhaleApi
  state: WhaleState
  busy: boolean
  action: WhaleAction
}): React.ReactElement {
  const titleId = React.useId()
  return (
    <section className={`${styles.paletteSection} ${styles.glassPanel}`} aria-labelledby={titleId}>
      <div className={styles.sectionHeading}>
        <div><span className={styles.kicker}>MULTI-LAYER OCEAN MOODS</span><h3 id={titleId}>海域主题</h3></div>
        <span>6 套完整主体、腹部、强调和环境光配色</span>
      </div>
      <div className={styles.paletteGrid} role="radiogroup" aria-label="选择鲸鱼海域主题">
        {(Object.entries(SKINS) as [WhaleSkin, (typeof SKINS)[WhaleSkin]][]).map(([skin, palette]) => (
          <button
            key={skin}
            type="button"
            role="radio"
            aria-checked={state.skin === skin}
            className={state.skin === skin ? styles.paletteSelected : styles.paletteButton}
            style={{
              '--palette-main': palette.color,
              '--palette-deep': palette.deep,
              '--palette-belly': palette.belly,
              '--palette-accent': palette.accent,
              '--palette-glow': palette.glow,
            } as React.CSSProperties}
            disabled={busy}
            onClick={() => void action(() => api.setSkin(skin), `已切换为${palette.name}。`)}
          >
            <span className={styles.palettePreview} aria-hidden="true"><i /><b /><em /><u /></span>
            <span><strong>{palette.name}</strong><small>{palette.description}</small></span>
            {state.skin === skin && <mark>正在使用</mark>}
          </button>
        ))}
      </div>
    </section>
  )
}

function GoalCard({ goal }: { goal: VoyageGoal }): React.ReactElement {
  return (
    <article className={styles.goalCard}>
      <div><span>{goal.title}</span><strong>{goal.percent}%</strong></div>
      <p>{goal.description}</p>
      <div className={styles.goalTrack} role="progressbar" aria-label={goal.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.percent}>
        <span style={{ width: `${goal.percent}%` }} />
      </div>
      <small>{goal.current}/{goal.target}{goal.suffix}</small>
    </article>
  )
}

async function downloadPngShareCard(state: WhaleState): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 675
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('当前浏览器无法生成 PNG')
  const palette = SKINS[state.skin]
  const species = WHALE_SPECIES_BY_ID[state.species]
  const name = companionName(state)
  const background = ctx.createLinearGradient(0, 0, 1200, 675)
  background.addColorStop(0, '#06172f')
  background.addColorStop(.55, palette.deep)
  background.addColorStop(1, '#020b17')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, 1200, 675)
  const glow = ctx.createRadialGradient(930, 190, 10, 930, 190, 500)
  glow.addColorStop(0, `${palette.glow}99`)
  glow.addColorStop(1, `${palette.glow}00`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1200, 675)
  for (let index = 0; index < 42; index += 1) {
    const x = (index * 197) % 1160 + 20
    const y = (index * 83) % 625 + 25
    ctx.fillStyle = `rgba(255,255,255,${.045 + (index % 5) * .018})`
    ctx.beginPath()
    ctx.arc(x, y, 1.5 + (index % 4), 0, Math.PI * 2)
    ctx.fill()
  }
  roundedRect(ctx, 58, 54, 1084, 568, 38)
  ctx.fillStyle = 'rgba(1,12,27,.54)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.18)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,.62)'
  ctx.font = '700 18px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('LOCAL OCEAN COMPANION · PRIVACY SAFE', 98, 112)
  ctx.fillStyle = '#fff'
  ctx.font = '800 58px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(name, 98, 188, 520)
  ctx.fillStyle = palette.accent
  ctx.font = '700 24px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(`海洋等级 ${state.level} · ${species.nameZh} · ${species.ability}`, 98, 232)
  ctx.fillStyle = 'rgba(255,255,255,.74)'
  ctx.font = '400 21px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(species.story, 98, 282, 570)
  const metrics = [
    [`${state.streak} 天`, '连续航行'],
    [`${state.achievements.length}/12`, '潮汐成就'],
    [`${unlockedSpeciesCount(state.level)}/20`, '鲸灵图鉴'],
    [`${state.collectibles.length}/24`, '纪念物'],
  ] as const
  metrics.forEach(([value, label], index) => {
    const x = 98 + index * 144
    roundedRect(ctx, x, 340, 128, 110, 20)
    ctx.fillStyle = 'rgba(255,255,255,.09)'
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '800 27px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(value, x + 15, 385, 102)
    ctx.fillStyle = 'rgba(255,255,255,.58)'
    ctx.font = '500 15px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(label, x + 15, 417)
  })
  drawWhale(ctx, 742, 176, 1.72, palette.color, palette.deep, palette.belly)
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.font = '400 15px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('不包含提示词、回复、代码、路径、工具名称、参数或结果内容', 98, 568)
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '700 17px Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('DSH WHALE COMPANION', 875, 568)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value === null ? reject(new Error('PNG 编码失败')) : resolve(value), 'image/png'))
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFilename(name)}-whale-voyage.png`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawWhale(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, main: string, deep: string, belly: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = 'rgba(255,255,255,.12)'
  ctx.beginPath()
  ctx.ellipse(118, 78, 112, 68, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = deep
  ctx.beginPath()
  ctx.moveTo(42, 74)
  ctx.bezierCurveTo(20, 56, 13, 39, 16, 23)
  ctx.bezierCurveTo(36, 30, 49, 43, 55, 61)
  ctx.bezierCurveTo(60, 41, 74, 29, 92, 25)
  ctx.bezierCurveTo(91, 48, 80, 67, 58, 79)
  ctx.closePath()
  ctx.fill()
  const gradient = ctx.createLinearGradient(48, 34, 207, 118)
  gradient.addColorStop(0, belly)
  gradient.addColorStop(.28, main)
  gradient.addColorStop(1, deep)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(48, 72)
  ctx.bezierCurveTo(68, 34, 113, 19, 161, 29)
  ctx.bezierCurveTo(201, 37, 225, 59, 219, 84)
  ctx.bezierCurveTo(213, 111, 169, 124, 119, 113)
  ctx.bezierCurveTo(86, 106, 67, 88, 42, 96)
  ctx.bezierCurveTo(49, 87, 52, 80, 48, 72)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = belly
  ctx.globalAlpha = .72
  ctx.beginPath()
  ctx.moveTo(94, 98)
  ctx.bezierCurveTo(126, 111, 175, 107, 202, 91)
  ctx.bezierCurveTo(188, 117, 147, 124, 116, 114)
  ctx.bezierCurveTo(104, 110, 97, 104, 94, 98)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = deep
  ctx.beginPath()
  ctx.arc(190, 64, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = deep
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(188, 88)
  ctx.quadraticCurveTo(203, 99, 216, 88)
  ctx.stroke()
  ctx.restore()
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText !== undefined) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('当前浏览器无法复制文本')
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 60) || 'whale'
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
