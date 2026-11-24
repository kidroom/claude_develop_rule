# CLAUDE.md

只放每次都要遵守的內容；規範在 `.claude/rules/`，流程在 `.claude/skills/`，強制檢查在 `.claude/settings.json`。

## 專案
<!-- 專案建立後填寫 -->
- 用途：（待填，一句話）
- 技術棧：（待填）

## 常用指令
| 指令 | 用途 |
|---|---|
| `（待填）` | 建置（警告視為錯誤） |
| `（待填）` | 格式與靜態檢查 |
| `（待填）` | 快速測試（排除整合測試） |
| `（待填）` | 整合測試（說明在哪裡執行） |

完成定義：前三者全部通過。

## 規則索引（`.claude/rules/`）
| 檔案 | 涵蓋 | 載入 |
|---|---|---|
| `core.md` | 三種風險防線、MUST／SHOULD／MAY、AI 工作守則 | 常駐 |
| `workflow.md` | XP 價值觀與實踐、標準工作循環 | 常駐 |
| `simple-design.md` | YAGNI、KISS、三次法則、過度設計警訊、平衡原則 | 常駐 |
| `architecture.md` | 分層、依賴方向、橫切關注點、邊界、目錄結構 | 常駐 |
| `refactoring.md` | 重構時機、執行方式、禁止或暫緩情境 | 常駐 |
| `change-and-release.md` | Git、PR 與審查、修改既有行為、feature flag、部署回退 | 常駐 |
| `security.md` | 輸入驗證、注入、認證授權、秘密、設定檔、最小權限 | 常駐 |
| `design-principles.md` | SOLID、其他設計原則、介面條件、設計模式選用 | 讀到原始碼時 |
| `coding.md` | 命名、函式、註解、型別、相依套件 | 讀到原始碼時 |
| `reliability.md` | 錯誤處理、副作用、非同步與資源、韌性、可觀測性 | 讀到原始碼時 |
| `testing.md` | 測試層級、涵蓋範圍、寫法、測試替身 | 讀到測試檔時 |
| `api-and-database.md` | API 設計、契約相容、migration、查詢、交易 | 讀到 API 或資料存取檔案時 |
| `tooling-ci.md` | 建置與靜態檢查、CI 階段、本機環境 | 讀到建置或 CI 設定時 |
| `claude-config.md` | Claude 設定與文件的放置、寫法、長度上限 | 讀到 Claude 設定或文件時 |

流程：`/xp-cycle`、`/fix-bug`、`/impact-analysis`、`/safe-refactor`、`/adr`、`/tidy-claude-config`（只能手動叫用）；審查用 `standards-reviewer` 子代理。

## 自動檢查（`.claude/settings.json`，需要 Node.js）
| 時機 | 檢查 |
|---|---|
| 寫入檔案前 | 掃描寫死的密鑰；命中即拒絕（`.env`、`.env.local` 等本機檔除外） |
| 執行 git 前 | 禁止在 main／master commit、merge、rebase 與直接 push 主線；禁止 `--no-verify`；commit 標題須符合 Conventional Commits；暫存區不得含密鑰 |
| 存檔後 | 以專案已安裝的 formatter 格式化（Prettier、Ruff／Black、gofmt、rustfmt）；檢查殘留的合併衝突標記 |
| 權限 | push、合併 PR、新增套件、修改相依清單／建置／環境／CI 設定須確認；讀取秘密檔、破壞性 git 指令、修改 `node_modules`／`.venv`／`.git` 禁止 |

## 專案特有慣例
<!-- 只記錄規則未涵蓋、且無法從程式碼推得的事項。每條一行。 -->

## 規範例外與已知落差
遇到時**先詢問**，不自行大改。

| 項目 | 現況與依據 |
|---|---|
| （無） | |

## 維護
- 每個迭代結束執行 `/tidy-claude-config`。
- 最後整理：2026-11-24
