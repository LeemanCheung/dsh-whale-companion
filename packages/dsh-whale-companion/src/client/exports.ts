import type { WhalePostcard } from '../reducer.ts'
import { WHALE_SPECIES_BY_ID } from '../species.ts'
import { SKINS } from './catalog.ts'
import { momentDescription } from './view-model.ts'

export function createPostcardSvg(view: WhalePostcard): string {
  const species = WHALE_SPECIES_BY_ID[view.species]
  const skin = SKINS[view.skin]
  const moments = view.moments.map(moment => escapeXml(momentDescription(moment))).join(' · ').slice(0, 90)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${skin.color}"/><path d="M0 470 C160 410 300 540 470 470 S800 400 1200 490 V630 H0Z" fill="#081a31" opacity=".86"/><circle cx="950" cy="150" r="84" fill="#ffffff" opacity=".16"/><text x="80" y="120" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" letter-spacing="6">WHALE TIDES · LOCAL ONLY</text><text x="80" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="82" font-weight="700">${escapeXml(species.nameZh)}</text><text x="80" y="310" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28">海洋等级 ${view.level} · ${escapeXml(view.day)}</text><text x="80" y="435" fill="#ffffff" font-family="system-ui, sans-serif" font-size="34">${escapeXml(view.message)}</text><text x="80" y="535" fill="#ffffff" font-family="system-ui, sans-serif" font-size="22" opacity=".84">${moments}</text><g transform="translate(930 250)" fill="#ffffff" opacity=".92"><path d="M20 92 C48 52 118 42 172 60 C198 68 216 82 230 94 C214 94 200 99 188 108 C173 121 153 131 126 133 C88 136 49 123 20 92Z"/><path d="M30 90 C9 72 0 52 8 29 C22 46 37 56 54 62 C47 72 39 82 30 90Z"/><path d="M132 72 C141 51 153 37 171 28 C172 48 166 65 154 79Z"/></g></svg>`
}

export function downloadSvg(svg: string, filename: string): void {
  if (unsafeSvgReason(svg) !== undefined) throw new Error('SVG 安全检查失败')
  const safeName = filename.replace(/[^a-z0-9-]+/giu, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'whale-tide'
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName}.svg`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function unsafeSvgReason(svg: string): string | undefined {
  if (!svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')) return 'root'
  if (/<(?:script|foreignObject|animate|set|use)\b/iu.test(svg)) return 'element'
  if (/\bon[a-z]+\s*=/iu.test(svg)) return 'event-attribute'
  if (/\b(?:href|src)\s*=/iu.test(svg)) return 'resource-reference'
  if (/url\s*\(/iu.test(svg)) return 'css-url'
  if (/\0|[\u0001-\u0008\u000B\u000C\u000E-\u001F]/u.test(svg)) return 'control-character'
  return undefined
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!)
}
