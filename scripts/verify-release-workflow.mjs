import { readFileSync } from 'node:fs'

const workflowPath = '.github/workflows/release.yml'
const workflow = readFileSync(workflowPath, 'utf8')
const required = [
  'workflow_dispatch:',
  'Existing immutable release tag',
  'ref: ${{ inputs.tag }}',
  'verify:species:rebuild',
  'refs/tags/$TAG^{}',
  'test "$local_tag_commit" = "$head_commit"',
  'test "$remote_tag_commit" = "$head_commit"',
  'GitHub Release $TAG already exists; refusing to overwrite it.',
  'gh release create "$TAG" --verify-tag',
]

const missing = required.filter(value => !workflow.includes(value))
if (/^\s*push:/mu.test(workflow)) missing.push('release workflow must not run on push')
if (/git\s+(?:tag|push)\b/mu.test(workflow)) missing.push('release workflow must not create or push tags')
if (missing.length > 0) {
  console.error(`Invalid ${workflowPath}:`)
  for (const value of missing) console.error(`- ${value}`)
  process.exit(1)
}
console.log('Verified manual immutable release workflow.')
