import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../packages/dsh-whale-companion/lib/', import.meta.url)
const required = ['index.js', 'index.d.ts', 'client.js', 'client.d.ts', 'typert.host.js', 'typert.host.d.ts', 'typert.remote-client.js', 'typert.remote-client.d.ts']
const missing = required.filter(file => !existsSync(new URL(file, root)))
if (missing.length > 0) {
  console.error('Missing release artifacts:', missing.join(', '))
  process.exit(1)
}
const clientJs = readFileSync(new URL('client.js', root), 'utf8')
const sourceMap = JSON.parse(readFileSync(new URL('client.js.map', root), 'utf8'))
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
