import type { WhalePostcard } from '../reducer.ts'
import { WHALE_SPECIES, WHALE_SPECIES_BY_ID } from '../species.ts'
import { SKINS } from './catalog.ts'
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

  const atlas = await loadRaster(WHALE_SPECIES_ATLAS)
  const index = WHALE_SPECIES.findIndex(candidate => candidate.id === species.id)
  const sourceWidth = atlas.naturalWidth / 5
  const sourceHeight = atlas.naturalHeight / 4
  context.drawImage(atlas, (index % 5) * sourceWidth, Math.floor(index / 5) * sourceHeight, sourceWidth, sourceHeight, 814, 220, 330, 275)

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
