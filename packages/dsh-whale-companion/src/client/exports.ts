import type { WhalePostcard } from '../reducer.ts'
import { WHALE_SPECIES, WHALE_SPECIES_BY_ID, type WhaleSpeciesId } from '../species.ts'
import { SKINS } from './catalog.ts'
import { INK_WHALE_STILL } from './ink-whale-sprite.ts'
import { WHALE_SPECIES_ATLAS } from './species-atlas.ts'

export function normalizePostcardText(value: string, maximum = 96): string {
  return value.replace(/[\u0000-\u001F\u007F]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maximum)
}

function loadRaster(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('鲸鱼栅格美术加载失败'))
    image.src = url
  })
}

export async function drawSpeciesRaster(context: CanvasRenderingContext2D, species: WhaleSpeciesId, x: number, y: number, width: number, height: number): Promise<void> {
  const ink = species === 'common-minke'
  const image = await loadRaster(ink ? INK_WHALE_STILL : WHALE_SPECIES_ATLAS)
  const index = WHALE_SPECIES.findIndex(candidate => candidate.id === species)
  if (index < 0 || image.naturalWidth <= 0 || image.naturalHeight <= 0) throw new Error('鲸鱼美术尺寸或种类无效')
  const sourceWidth = image.naturalWidth / (ink ? 1 : 5)
  const sourceHeight = image.naturalHeight / (ink ? 1 : 4)
  const scale = Math.min(width / sourceWidth, height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  context.save()
  try {
    // The ink portrait has transparent pixels; a light paper field keeps the
    // original black artwork legible on every dark ocean theme.
    if (ink) {
      context.fillStyle = '#f6f8fa'
      context.fillRect(x, y, width, height)
    }
    context.drawImage(image, ink ? 0 : (index % 5) * sourceWidth, ink ? 0 : Math.floor(index / 5) * sourceHeight,
      sourceWidth, sourceHeight, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  } finally {
    context.restore()
  }
}

export async function createPostcardPng(view: WhalePostcard): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('浏览器不支持 PNG 明信片绘制')
  const species = WHALE_SPECIES_BY_ID[view.species]
  const skin = SKINS[view.skin]
  const gradient = context.createLinearGradient(0, 0, 1200, 630)
  gradient.addColorStop(0, skin.deep)
  gradient.addColorStop(1, '#06182d')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1200, 630)
  context.fillStyle = 'rgba(255,255,255,.08)'
  context.beginPath()
  context.arc(986, 148, 92, 0, Math.PI * 2)
  context.fill()

  await drawSpeciesRaster(context, view.species, 814, 220, 330, 275)

  context.fillStyle = '#f7fbff'
  context.font = '600 25px system-ui, sans-serif'
  context.fillText('WHALE TIDES · LOCAL ONLY', 72, 104)
  context.font = '700 76px system-ui, sans-serif'
  context.fillText(normalizePostcardText(species.nameZh, 18), 72, 236)
  context.font = '500 27px system-ui, sans-serif'
  context.fillStyle = 'rgba(247,251,255,.82)'
  context.fillText(`海洋等级 ${view.level} · ${normalizePostcardText(view.day, 16)}`, 72, 291)
  context.font = '600 31px system-ui, sans-serif'
  context.fillStyle = '#f7fbff'
  context.fillText(normalizePostcardText(view.message, 38), 72, 415)
  context.font = '500 21px system-ui, sans-serif'
  context.fillStyle = 'rgba(247,251,255,.72)'
  const moments = view.moments.slice(-3).map(moment => normalizePostcardText(moment.category, 24)).join(' · ') || '海面平静'
  context.fillText(moments, 72, 516)

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob === null ? reject(new Error('PNG 明信片编码失败')) : resolve(blob), 'image/png'))
}

export function downloadPng(blob: Blob, filename: string): void {
  if (blob.type !== 'image/png') throw new Error('明信片必须是 PNG')
  const safeName = filename.replace(/[^a-z0-9-]+/giu, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'whale-tide'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName}.png`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
