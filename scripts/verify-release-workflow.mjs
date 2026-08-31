import { readFileSync } from 'node:fs'

const workflowPath = '.github/workflows/release-2.3.0.yml'
const workflow = readFileSync(workflowPath, 'utf8')
const required = [
  "tag='v2.3.0'",
  'head_commit="$(git rev-parse HEAD)"',
  'git show-ref --verify --quiet "refs/tags/$tag"',
  'local_tag_commit="$(git rev-list -n 1 "$tag")"',
  'git ls-remote --tags origin "refs/tags/$tag^{}"',
  'if [ "$local_tag_commit" != "$head_commit" ]; then',
  'if [ -n "$remote_tag_commit" ] && [ "$remote_tag_commit" != "$head_commit" ]; then',
  'if gh release view "$tag" >/dev/null 2>&1; then',
  'git tag -a "$tag" -m "Whale Companion 2.3.0"',
  'gh release create "$tag"',
]

const missing = required.filter(value => !workflow.includes(value))
const localTagValidation = workflow.indexOf('if [ "$local_tag_commit" != "$head_commit" ]; then')
const remoteTagValidation = workflow.indexOf('if [ -n "$remote_tag_commit" ] && [ "$remote_tag_commit" != "$head_commit" ]; then')
const releaseCheck = workflow.indexOf('if gh release view "$tag" >/dev/null 2>&1; then')
const releaseCreate = workflow.indexOf('gh release create "$tag"')
if (localTagValidation < 0 || remoteTagValidation < 0 || localTagValidation > releaseCheck || remoteTagValidation > releaseCheck) {
  missing.push('local and remote tag validation must precede release idempotency')
}
if (releaseCheck < 0 || releaseCreate < 0 || releaseCheck > releaseCreate) missing.push('release idempotency must be checked before creation')

if (missing.length > 0) {
  console.error(`Invalid ${workflowPath}:`)
  for (const value of missing) console.error(`- ${value}`)
  process.exit(1)
}

console.log('Verified recoverable 2.3.0 release workflow.')
