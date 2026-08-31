import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'


const lib = fileURLToPath(new URL('../packages/dsh-whale-companion/lib/', import.meta.url))
const textSuffixes = ['.js', '.map', '.ts']
let changed = 0

for (const entry of readdirSync(lib, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue
  const path = join(entry.parentPath, entry.name)
  if (!textSuffixes.some(suffix => path.endsWith(suffix))) continue
  const current = readFileSync(path, 'utf8')
  let normalized = current.replaceAll('\r\n', '\n')
  if (path.endsWith('.map')) {
    const sourceMap = JSON.parse(normalized)
    if (Array.isArray(sourceMap.sourcesContent)) {
      sourceMap.sourcesContent = sourceMap.sourcesContent.map(source => typeof source === 'string' ? source.replaceAll('\r\n', '\n') : source)
    }
    normalized = JSON.stringify(sourceMap) + (normalized.endsWith('\n') ? '\n' : '')
  }
  if (path.endsWith('/client.js') || path.endsWith('\\client.js')) {
    normalized = normalized.replace(/\n?\/\/# sourceMappingURL=client\.js\.map\s*$/u, '').trimEnd() + '\n'
  }
  if (normalized === current) continue
  writeFileSync(path, normalized)
  changed += 1
}

console.log(`Normalized generated line endings in ${changed} file(s).`)
