// PostToolUse hook（Write / Edit / MultiEdit）：存檔後以專案自己的 formatter 格式化該檔，並檢查殘留的合併衝突標記。
// 只使用專案已安裝或語言內建的 formatter，不下載工具；找不到 formatter 時略過。
// 新增語言時在 pickFormatter 加一個分支即可。
// 格式化失敗（多半是語法錯誤）或發現衝突標記時以 exit code 2 回報，Claude 會收到訊息並修正。
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const PRETTIER_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.vue', '.svelte',
  '.json', '.css', '.scss', '.less', '.html', '.md', '.yaml', '.yml',
])

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return {}
  }
}

function isOnPath(command) {
  return !spawnSync(command, ['--version'], { encoding: 'utf8' }).error
}

function projectUses(pyprojectMarker, configFiles) {
  if (configFiles.some((file) => existsSync(join(root, file)))) return true
  const pyproject = join(root, 'pyproject.toml')
  return existsSync(pyproject) && readFileSync(pyproject, 'utf8').includes(pyprojectMarker)
}

function pickFormatter(extension) {
  const prettier = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
  if (PRETTIER_EXTENSIONS.has(extension) && existsSync(prettier)) {
    return { name: 'Prettier', command: process.execPath, args: [prettier, '--write', '--ignore-unknown'] }
  }
  if (extension === '.py' && projectUses('[tool.ruff', ['ruff.toml', '.ruff.toml']) && isOnPath('ruff')) {
    return { name: 'Ruff', command: 'ruff', args: ['format', '--quiet'] }
  }
  if (extension === '.py' && projectUses('[tool.black', []) && isOnPath('black')) {
    return { name: 'Black', command: 'black', args: ['--quiet'] }
  }
  if (extension === '.go' && isOnPath('gofmt')) return { name: 'gofmt', command: 'gofmt', args: ['-w'] }
  if (extension === '.rs' && isOnPath('rustfmt')) return { name: 'rustfmt', command: 'rustfmt', args: ['--edition', '2021'] }
  return null
}

function hasConflictMarkers(text) {
  return /^<{7}( |$)/m.test(text) && /^>{7}( |$)/m.test(text)
}

const input = readInput()
const filePath = input.tool_response?.filePath ?? input.tool_input?.file_path
if (!filePath || !existsSync(filePath)) process.exit(0)

const problems = []
const formatter = pickFormatter(extname(filePath).toLowerCase())
if (formatter) {
  const result = spawnSync(formatter.command, [...formatter.args, filePath], { cwd: root, encoding: 'utf8' })
  if (!result.error && result.status !== 0) {
    problems.push(`${formatter.name} 格式化失敗：\n${(result.stderr || result.stdout).trim().slice(-2000)}`)
  }
}
if (hasConflictMarkers(readFileSync(filePath, 'utf8'))) {
  problems.push('檔案中有殘留的合併衝突標記，請解決後再繼續。')
}

if (problems.length > 0) {
  process.stderr.write(`[format hook] ${filePath}\n${problems.join('\n')}\n`)
  process.exit(2)
}
process.exit(0)
