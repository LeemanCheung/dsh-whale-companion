import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const hash = value => createHash('sha256').update(value).digest('hex')
const assetDir = 'packages/dsh-whale-companion/assets/'
const extraction = JSON.parse(read(`${assetDir}ink-whale-motion-report.json`))
const anchorBytes = read(extraction.runtime.spritePath)
assert.equal(hash(read(extraction.source.path)), extraction.source.sha256)
assert.equal(hash(read(extraction.source.identityPath)), extraction.source.identitySha256)
assert.equal(hash(anchorBytes), extraction.runtime.spriteSha256)
assert.equal(extraction.runtime.frameCount, 24)
assert.equal(extraction.checks.uniqueFrames, 24)
assert.equal(extraction.checks.allFrameBordersTransparent, true)
assert.ok(extraction.checks.outputEyeRangePx.every(value => value < 1.1))

const motion = read(`${assetDir}ink-whale-motion.webp`)
assert.equal(motion.subarray(0, 4).toString(), 'RIFF')
assert.equal(motion.subarray(8, 12).toString(), 'WEBP')
const durations = []
let canvas
let infiniteLoop = false
for (let offset = 12; offset + 8 <= motion.length;) {
  const type = motion.subarray(offset, offset + 4).toString()
  const size = motion.readUInt32LE(offset + 4)
  const start = offset + 8
  if (type === 'VP8X') canvas = [motion.readUIntLE(start + 4, 3) + 1, motion.readUIntLE(start + 7, 3) + 1]
  if (type === 'ANIM') infiniteLoop = motion.readUInt16LE(start + 4) === 0
  if (type === 'ANMF') durations.push(motion.readUIntLE(start + 12, 3))
  offset = start + size + (size & 1)
}
assert.deepEqual(canvas, [384, 320])
assert.equal(infiniteLoop, true)
assert.equal(durations.length, 96)
assert.equal(durations.reduce((sum, value) => sum + value, 0), 1600)
assert.ok(durations.every(value => value === 16 || value === 17))

const embedded = read('packages/dsh-whale-companion/lib/client.js').toString()
const embeddedPayloads = [...embedded.matchAll(/data:image\/(?:webp|png);base64,([A-Za-z0-9+/=]+)/g)]
const embeddedHashes = new Set(embeddedPayloads.map(match => hash(Buffer.from(match[1], 'base64'))))
assert.ok(embeddedHashes.has(hash(motion)), 'the shipped client must embed the exact accepted motion')
assert.ok(embeddedHashes.has(hash(read(`${assetDir}ink-whale-still.png`))), 'the shipped client must embed the matching static fallback')

const review = JSON.parse(read('docs/ink-whale-visual-review.json'))
assert.equal(review.status, 'accepted', 'the motion must have a recorded visual review')
assert.equal(review.motionSha256, hash(motion), 'visual acceptance must match the exact playback asset')
assert.equal(review.generatedPoseCount, 24)
assert.equal(review.interpolatedFrameCount, 72)
console.log(JSON.stringify({ ok: true, generatedPoses: 24, interpolatedFrames: 72, playbackFrames: durations.length, fps: 60, loopMs: 1600, motionSha256: hash(motion) }))
