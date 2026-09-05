import { readFileSync } from 'node:fs'

const checks = [
  ['packages/dsh-whale-companion/src/spec.ts', ['companionNameSchema', "name: companionNameSchema.optional()"]],
  ['packages/dsh-whale-companion/src/index.ts', ["@Remote('setName')", 'whaleStateSchema.parse(state)', 'session.header.createdAt']],
  ['packages/dsh-whale-companion/src/reducer.ts', ['MAX_IMPORT_BYTES', 'parseBoundedJson', 'offset > 0']],
  ['packages/dsh-whale-companion/src/client/WhaleArt.tsx', ['export function WhaleArt', 'data-raster-art', 'INK_WHALE_MOTION']],
  ['packages/dsh-whale-companion/src/client/planned-features.ts', ['voyageGoals', 'shareSummary', 'nextSpeciesForLevel']],
  ['packages/dsh-whale-companion/src/client/planned-sections.tsx', ['WhaleOverlayExtras', '下载 PNG 名片', '伙伴档案与动态航线']],
  ['packages/dsh-whale-companion/src/client/Planned.module.css', ['.quickCard', '.goalGrid', 'prefers-reduced-motion']],
  ['tests/e2e/whale-companion.e2e.ts', ['quick-card-dark.png', 'planned-dashboard-mobile.png', 'reducedMotion']],
  ['.github/workflows/ci.yml', ['verify:release-workflow', 'test:e2e', 'git diff --exit-code -- packages/dsh-whale-companion/lib']],
]

const missing = []
for (const [file, patterns] of checks) {
  const source = readFileSync(file, 'utf8')
  for (const pattern of patterns) if (!source.includes(pattern)) missing.push(`${file}: ${pattern}`)
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const nestedManifest = JSON.parse(readFileSync('packages/dsh-whale-companion/package.json', 'utf8'))
if (manifest.version !== nestedManifest.version) missing.push('root and nested package versions must match')

if (missing.length > 0) {
  console.error('Incomplete planned-item delivery:')
  for (const item of missing) console.error(`- ${item}`)
  process.exit(1)
}
console.log(`Verified every planned Whale Companion ${manifest.version} delivery item.`)
