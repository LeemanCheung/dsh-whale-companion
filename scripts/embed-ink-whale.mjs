import { readFileSync, writeFileSync } from 'node:fs'

const assets = new URL('../packages/dsh-whale-companion/assets/', import.meta.url)
const target = new URL('../packages/dsh-whale-companion/src/client/ink-whale-sprite.ts', import.meta.url)
const motion = `data:image/webp;base64,${readFileSync(new URL('ink-whale-motion.webp', assets)).toString('base64')}`
const still = `data:image/png;base64,${readFileSync(new URL('ink-whale-still.png', assets)).toString('base64')}`
writeFileSync(target, `// Generated from 24 ImageGen poses and raster in-betweens by scripts/embed-ink-whale.mjs.\nexport const INK_WHALE_MOTION = ${JSON.stringify(motion)}\nexport const INK_WHALE_STILL = ${JSON.stringify(still)}\n`)
console.log(`Embedded ${motion.length + still.length} characters from the ImageGen ink whale playback assets.`)
