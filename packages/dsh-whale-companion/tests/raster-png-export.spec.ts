import { afterEach, describe, expect, it, vi } from 'vitest'
import { postcardView } from '../src/reducer.ts'
import { initialWhaleState } from '../src/spec.ts'
import { createPostcardPng, drawSpeciesRaster } from '../src/client/exports.ts'
import { INK_WHALE_STILL } from '../src/client/ink-whale-sprite.ts'
import { downloadPngShareCard } from '../src/client/planned-sections.tsx'
import { WHALE_SPECIES_ATLAS } from '../src/client/species-atlas.ts'

afterEach(() => { vi.unstubAllGlobals() })

function canvasHarness(failImage = false) {
  const images: { src: string }[] = []
  vi.stubGlobal('Image', class {
    onload?: () => void
    onerror?: () => void
    naturalWidth = 0
    naturalHeight = 0
    private url = ''
    get src(): string { return this.url }
    set src(url: string) {
      this.url = url
      this.naturalWidth = url === INK_WHALE_STILL ? 384 : 960
      this.naturalHeight = url === INK_WHALE_STILL ? 320 : 640
      images.push(this)
      queueMicrotask(() => { if (failImage) this.onerror?.(); else this.onload?.() })
    }
  })
  let fillStyle: unknown = ''
  const paintedRectangles: { color: unknown, rect: number[] }[] = []
  const gradient = () => ({ addColorStop: vi.fn() })
  const ctx = {
    get fillStyle() { return fillStyle },
    set fillStyle(value: unknown) { fillStyle = value },
    fillRect: vi.fn((...rect: number[]) => { paintedRectangles.push({ color: fillStyle, rect }) }),
    drawImage: vi.fn(), fillText: vi.fn(),
    createLinearGradient: gradient, createRadialGradient: gradient,
    beginPath: vi.fn(), closePath: vi.fn(), arc: vi.fn(), arcTo: vi.fn(), moveTo: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(),
  }
  // No whale-shape operations (Bezier curves, ellipse, transform) are supplied:
  // both real PNG exporters must use their loaded raster artwork instead.
  const context = ctx as unknown as CanvasRenderingContext2D
  const blob = new Blob(['png-test'], { type: 'image/png' })
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: vi.fn((callback: (blob: Blob) => void) => callback(blob)) }
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => tag === 'canvas' ? canvas : anchor),
    body: { appendChild: vi.fn() },
  })
  const createObjectURL = vi.fn(() => 'blob:whale-card')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  vi.stubGlobal('window', { setTimeout: (callback: () => void) => { callback(); return 1 } })
  return { ctx, context, canvas, anchor, blob, images, paintedRectangles, createObjectURL, revokeObjectURL }
}

describe('raster-only PNG whale exports', () => {
  it('composes the generated ink still on a light field without stretching it', async () => {
    const h = canvasHarness()
    await drawSpeciesRaster(h.context, 'common-minke', 10, 20, 400, 400)
    expect(h.images[0]?.src).toBe(INK_WHALE_STILL)
    expect(h.paintedRectangles).toContainEqual({ color: '#f6f8fa', rect: [10, 20, 400, 400] })
    const [image, sx, sy, sw, sh, dx, dy, width, height] = h.ctx.drawImage.mock.calls[0]!
    expect(image).toBe(h.images[0])
    expect([sx, sy, sw, sh]).toEqual([0, 0, 384, 320])
    expect(dx).toBe(10)
    expect(dy).toBeCloseTo(53.333333)
    expect(width).toBe(400)
    expect(height).toBeCloseTo(333.333333)
    expect(h.ctx.restore).toHaveBeenCalledOnce()
  })

  it('uses the selected species atlas cell for a non-minke whale', async () => {
    const h = canvasHarness()
    await drawSpeciesRaster(h.context, 'humpback', 10, 20, 330, 275)
    expect(h.images[0]?.src).toBe(WHALE_SPECIES_ATLAS)
    expect(h.ctx.drawImage).toHaveBeenCalledWith(h.images[0], 384, 0, 192, 160, 10, 20, 330, 275)
    expect(h.paintedRectangles).toHaveLength(0)
  })

  it.each(['common-minke', 'humpback'] as const)('keeps voyage-card content and downloads the selected %s raster', async species => {
    const h = canvasHarness()
    const state = { ...initialWhaleState(), species, name: '星潮', level: 10, streak: 5, checkpoints: ['private-session-receipt'] }
    await downloadPngShareCard(state)
    expect(h.images[0]?.src).toBe(species === 'common-minke' ? INK_WHALE_STILL : WHALE_SPECIES_ATLAS)
    expect(h.ctx.drawImage).toHaveBeenCalledOnce()
    expect(h.canvas.width).toBe(1200)
    expect(h.canvas.height).toBe(675)
    const labels = h.ctx.fillText.mock.calls.map(call => call[0]).join('\n')
    expect(labels).toContain('星潮')
    expect(labels).toContain('海洋等级 10')
    expect(labels).toContain('5 天')
    expect(labels).toContain('0/12')
    expect(labels).toContain('3/20')
    expect(labels).toContain('0/24')
    expect(labels).not.toContain('private-session-receipt')
    expect(h.anchor.download).toBe('星潮-whale-voyage.png')
    expect(h.anchor.click).toHaveBeenCalledOnce()
    expect(h.revokeObjectURL).toHaveBeenCalledWith('blob:whale-card')
  })

  it('uses the same generated ink still for a PNG tide postcard', async () => {
    const h = canvasHarness()
    const result = await createPostcardPng(postcardView(initialWhaleState()))
    expect(result).toBe(h.blob)
    expect(h.images[0]?.src).toBe(INK_WHALE_STILL)
    expect(h.ctx.drawImage).toHaveBeenCalledOnce()
    expect(h.paintedRectangles).toContainEqual({ color: '#f6f8fa', rect: [814, 220, 330, 275] })
    expect(h.canvas.height).toBe(630)
  })

  it('reports failed image loading without downloading a card missing its whale', async () => {
    const h = canvasHarness(true)
    await expect(downloadPngShareCard(initialWhaleState())).rejects.toThrow('美术加载失败')
    expect(h.canvas.toBlob).not.toHaveBeenCalled()
    expect(h.createObjectURL).not.toHaveBeenCalled()
    expect(h.anchor.click).not.toHaveBeenCalled()
  })
})
