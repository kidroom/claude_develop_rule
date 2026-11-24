// PreToolUse hook（Write / Edit / MultiEdit / Bash）：
// 1. 寫入檔案前掃描寫死的密鑰（security.md）。
// 2. 執行 git 指令前檢查：不得在主線 commit / merge / rebase、不得直接 push 主線、
//    不得以 --no-verify 略過 hook、commit 訊息須符合 Conventional Commits、暫存區不得含密鑰（change-and-release.md）。
// 違規時輸出 permissionDecision: "deny" 並附原因，Claude 會收到原因並改正；其餘情況 exit 0 放行。
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const PROTECTED_BRANCHES = new Set(['main', 'master'])
const CONVENTIONAL_SUBJECT = /^(feat|fix|refactor|test|docs|chore|perf|build|ci|revert)(\([^)]+\))?!?: \S/

const TOKEN_PATTERNS = [
  { name: 'AWS Access Key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: '私鑰', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: 'GitHub Token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g },
  { name: 'Slack Token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Google API Key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'Stripe Live Key', pattern: /\b[sr]k_live_[0-9A-Za-z]{20,}/g },
  { name: 'AI 服務 API Key', pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/g },
  { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
]
// 以下三種的第 1 個群組為「值」，值看起來是佔位符時放行。
const VALUE_PATTERNS = [
  {
    name: '寫死的密碼或金鑰',
    pattern: /(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
  },
  { name: '連線字串密碼', pattern: /(?:password|pwd)\s*=\s*([^;"'\s]{4,})\s*;/gi },
  { name: 'URL 內嵌帳密', pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@"']+:([^\s/:@"']+)@/gi },
]
const PLACEHOLDER = /\$\{|\{\{|%\w+%|<[^>]*>|^\*+$|your|example|sample|changeme|placeholder|dummy|fake|mock|test|xxxx|redacted|todo/i

function findSecrets(text) {
  const found = new Set()
  for (const { name, pattern } of TOKEN_PATTERNS) {
    for (const match of text.matchAll(pattern)) if (!PLACEHOLDER.test(match[0])) found.add(name)
  }
  for (const { name, pattern } of VALUE_PATTERNS) {
    for (const match of text.matchAll(pattern)) if (!PLACEHOLDER.test(match[1])) found.add(name)
  }
  return [...found]
}

// .env、.env.local 等本機設定檔本來就用來放秘密值（且應不進版控）；範本檔仍要掃描。
function isLocalEnvFile(path) {
  const name = basename(path)
  return /^\.env(\..+)?$/i.test(name) && !/\.(example|sample|template)$/i.test(name)
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[guard hook] ${reason}`,
      },
    }),
  )
  process.exit(0)
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return '' // 不是 git repo 或指令失敗時視為無資訊
  }
}

function writtenText(toolInput) {
  if (typeof toolInput.content === 'string') return toolInput.content
  if (typeof toolInput.new_string === 'string') return toolInput.new_string
  if (Array.isArray(toolInput.edits)) return toolInput.edits.map((edit) => edit.new_string ?? '').join('\n')
  return ''
}

function checkFileWrite(toolInput) {
  const filePath = String(toolInput.file_path ?? '')
  if (!filePath || isLocalEnvFile(filePath)) return
  const secrets = findSecrets(writtenText(toolInput))
  if (secrets.length === 0) return
  deny(
    `偵測到疑似寫死的密鑰（${secrets.join('、')}）於 ${filePath}。` +
      '請改由環境變數或秘密管理服務讀取，進版控的設定檔中秘密欄位留空。' +
      '若為測試用假值，請使用明顯的佔位符（如含 test、example 或 <...>）。',
  )
}

function commitSubject(command) {
  const heredoc = command.match(/<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\s*\1/)
  if (heredoc) return heredoc[2].split('\n').map((line) => line.trim()).find(Boolean) ?? null
  const inline = command.match(/\s(?:-m|--message)(?:\s+|=)(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))/)
  if (inline) return (inline[1] ?? inline[2] ?? inline[3]).split('\n')[0].trim()
  return null // 使用 -F 檔案、編輯器或 --no-edit 時不檢查
}

function pushTargetsProtected(command, branch) {
  const args = (command.match(/\bgit\s+push\b([^\n;&|]*)/)?.[1] ?? '')
    .trim()
    .split(/\s+/)
    .filter((arg) => arg && !arg.startsWith('-'))
  const refspecs = args.slice(1) // args[0] 為 remote
  if (refspecs.length === 0) return PROTECTED_BRANCHES.has(branch)
  return refspecs.some((refspec) => {
    const target = refspec.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '')
    return PROTECTED_BRANCHES.has(target === 'HEAD' ? branch : target)
  })
}

function stagedSecrets(cwd) {
  const findings = []
  let file = ''
  let added = []
  const flush = () => {
    if (file && !isLocalEnvFile(file)) {
      const secrets = findSecrets(added.join('\n'))
      if (secrets.length > 0) findings.push(`${file}（${secrets.join('、')}）`)
    }
    added = []
  }
  for (const line of git(['diff', '--cached', '-U0', '--no-color'], cwd).split('\n')) {
    if (line.startsWith('+++ ')) {
      flush()
      file = line.replace(/^\+\+\+ (b\/)?/, '')
    } else if (line.startsWith('+')) {
      added.push(line.slice(1))
    }
  }
  flush()
  return findings
}

function checkGitCommand(command, cwd) {
  const isCommit = /\bgit\s+(?:-c\s+\S+\s+)*commit\b/.test(command)
  const isPush = /\bgit\s+(?:-c\s+\S+\s+)*push\b/.test(command)
  const isMergeOrRebase = /\bgit\s+(?:-c\s+\S+\s+)*(?:merge|rebase)\b/.test(command)
  if (!isCommit && !isPush && !isMergeOrRebase) return

  if (/\s--no-verify\b/.test(command)) deny('不得以 --no-verify 略過 git hooks；請修正 hook 回報的問題。')

  const branch = git(['symbolic-ref', '--short', '-q', 'HEAD'], cwd)
  if (isCommit && PROTECTED_BRANCHES.has(branch)) {
    deny(`目前在 ${branch}，禁止直接在主線 commit。請先建立分支：git switch -c <type>/<簡短描述>。`)
  }
  if (isMergeOrRebase && PROTECTED_BRANCHES.has(branch)) {
    deny(`目前在 ${branch}，禁止直接在主線 merge 或 rebase；變更請透過 PR 合併。`)
  }
  if (isPush && pushTargetsProtected(command, branch)) deny('禁止直接 push 到主線；請 push 功能分支並開 PR。')

  if (isCommit) {
    const subject = commitSubject(command)
    if (subject !== null && !CONVENTIONAL_SUBJECT.test(subject)) {
      deny(
        `commit 標題「${subject}」不符合 Conventional Commits。` +
          '格式：<type>(<scope>): <摘要>，type 為 feat、fix、refactor、test、docs、chore、perf、build、ci、revert。',
      )
    }
    const findings = stagedSecrets(cwd)
    if (findings.length > 0) {
      deny(`暫存區偵測到疑似寫死的密鑰：${findings.join('；')}。請移除後改由環境變數或秘密管理服務讀取。`)
    }
  }
}

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const toolInput = input.tool_input ?? {}
if (input.tool_name === 'Bash') {
  checkGitCommand(String(toolInput.command ?? ''), input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd())
} else {
  checkFileWrite(toolInput)
}
process.exit(0)
