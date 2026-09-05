import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../packages/dsh-whale-companion/lib/', import.meta.url)
const required = ['index.js', 'index.d.ts', 'client.js', 'client.d.ts', 'typert.host.js', 'typert.host.d.ts', 'typert.remote-client.js', 'typert.remote-client.d.ts']
const missing = required.filter(file => !existsSync(new URL(file, root)))
if (missing.length > 0) {
  console.error('Missing release artifacts:', missing.join(', '))
  process.exit(1)
}
const clientJs = readFileSync(new URL('client.js', root), 'utf8')
if (/<svg\b|image\/svg\+xml|createElement\(["']svg["']/iu.test(clientJs)) {
  console.error('Release client contains forbidden runtime vector whale art.')
  process.exit(1)
}
const sourceMap = JSON.parse(readFileSync(new URL('client.js.map', root), 'utf8'))
const assetRoot = new URL('../assets/', root)
const speciesReport = JSON.parse(readFileSync(new URL('whale-species-atlas-report.json', assetRoot), 'utf8'))
const speciesSource = readFileSync(new URL(speciesReport.source.file, assetRoot))
const speciesAtlas = readFileSync(new URL(speciesReport.output.file, assetRoot))
const sha256 = value => createHash('sha256').update(value).digest('hex')
if (sha256(speciesSource) !== speciesReport.source.sha256 || sha256(speciesAtlas) !== speciesReport.output.sha256) {
  console.error('ImageGen species atlas provenance mismatch.')
  process.exit(1)
}
if (clientJs.includes('sourceMappingURL=client.js.map')) {
  console.error('Release client points to an excluded client.js.map source map.')
  process.exit(1)
}
const inspectedText = [clientJs, sourceMap.sourceRoot, ...(sourceMap.sources ?? []), ...(sourceMap.sourcesContent ?? [])].filter(value => typeof value === 'string')
for (const value of inspectedText) {
  const absoluteUserPath = value.match(/(?:[A-Za-z]:\\Users\\|\/home\/[^/]+\/|\/Users\/[^/]+\/)/)
  if (absoluteUserPath === null) continue
  console.error('Release client contains an absolute user checkout path:', absoluteUserPath[0])
  process.exit(1)
}
console.log('Verified release artifacts for dsh-whale-companion.')
await import('./verify-ink-playback.mjs')
