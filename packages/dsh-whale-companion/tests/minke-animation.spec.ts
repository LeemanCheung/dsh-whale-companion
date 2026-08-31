import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'


const root = new URL('../', import.meta.url)

function bytes(path: string): Buffer {
  return readFileSync(fileURLToPath(new URL(path, root)))
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

describe('common minke motion asset', () => {
  it('is a transparent 6 by 4 sprite with the declared frame geometry', () => {
    const png = bytes('assets/minke-swim-sprite.png')
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR')
    expect(png.readUInt32BE(16)).toBe(2304)
    expect(png.readUInt32BE(20)).toBe(1280)
    expect(png[25]).toBe(6)

    const report = JSON.parse(bytes('assets/minke-motion-report.json').toString('utf8')) as {
      reference: { sha256: string, decodedRgbSha256: string }
      source: { sha256: string }
      sprite: { sha256: string, frames: number, frameSize: number[] }
      preview: { sha256: string }
      contactSheet: { sha256: string }
      motion: { uniqueFrames: number, loopSeamRatio: number, headCentroidYRange: number, tailCentroidYRange: number }
      backgroundContract: string
    }
    expect(report.sprite.sha256).toBe(sha256(png))
    expect(report.reference.sha256).toBe(sha256(bytes('assets/whale-species-atlas.webp')))
    expect(report.reference.decodedRgbSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(report.source.sha256).toBe(sha256(bytes('assets/minke-imagegen-clean.png')))
    expect(report.preview.sha256).toBe(sha256(bytes('assets/minke-swim-preview.gif')))
    expect(report.contactSheet.sha256).toBe(sha256(bytes('../../docs/minke-motion-contact-sheet.png')))
    expect(bytes('assets/minke-imagegen-clean.png').includes(Buffer.from('caBX'))).toBe(false)
    expect(report.sprite.frames).toBe(24)
    expect(report.sprite.frameSize).toEqual([384, 320])
    expect(report.motion).toMatchObject({ uniqueFrames: 24 })
    expect(report.motion.loopSeamRatio).toBeLessThan(2)
    expect(report.motion.headCentroidYRange).toBeLessThan(4)
    expect(report.motion.tailCentroidYRange).toBeGreaterThan(5)
    expect(report.backgroundContract).toContain('separate static CSS layer')
  })

  it('embeds the exact sprite without runtime network access', () => {
    const png = bytes('assets/minke-swim-sprite.png')
    const generated = bytes('src/client/minke-swim-sprite.ts').toString('utf8')
    const match = generated.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)"/)
    expect(match).not.toBeNull()
    const embedded = Buffer.from(match![1]!, 'base64')
    expect(sha256(embedded)).toBe(sha256(png))
    expect(generated).not.toMatch(/https?:\/\//)
  })

  it('keeps the ocean layer static and supports reduced motion', () => {
    const component = bytes('src/client/SpeciesMotionCard.tsx').toString('utf8')
    const css = bytes('src/client/Whale.module.css').toString('utf8')
    expect(component).toContain("className: styles.motionStage")
    expect(component).toContain("className: styles.minkeSprite")
    expect(css).toMatch(/\.motionStage\s*\{[^}]*background:/)
    expect(css).toMatch(/\.minkeSprite\s*\{[^}]*animation:\s*minkeSwim/)
    expect(css).toMatch(/prefers-reduced-motion:[\s\S]*\.minkeSprite\s*\{\s*animation:\s*none/)
    for (const position of ['0 0', '20% 0', '100% 0', '0 33.333%', '100% 33.333%', '0 66.667%', '100% 66.667%', '0 100%', '100% 100%']) {
      expect(css).toContain(`background-position: ${position}`)
    }
  })

  it('keeps the durable validation readout synchronized with the motion report', () => {
    const report = JSON.parse(bytes('assets/minke-motion-report.json').toString('utf8')) as {
      motion: {
        adjacentPremultipliedMad: number[]
        medianAdjacentMad: number
        loopSeamRatio: number
        maxAdjacentRatio: number
        headCentroidYRange: number
        torsoCentroidYRange: number
        tailCentroidYRange: number
      }
    }
    const validation = bytes('../../docs/minke-animation-validation.md').toString('utf8')
    const values = [
      Math.min(...report.motion.adjacentPremultipliedMad),
      report.motion.medianAdjacentMad,
      report.motion.loopSeamRatio,
      report.motion.maxAdjacentRatio,
      report.motion.headCentroidYRange,
      report.motion.torsoCentroidYRange,
      report.motion.tailCentroidYRange,
    ]
    for (const value of values) expect(validation).toContain(value.toFixed(6))
  })
})
