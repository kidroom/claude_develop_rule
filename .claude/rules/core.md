# 核心原則

## 目的
高迭代下維持可讀、可維護、可用，防止三種風險：

| 風險 | 定義 | 主要防線 |
|---|---|---|
| Regression | 既有行為因新變更失效 | `testing.md`、`refactoring.md`、`change-and-release.md` |
| Side Effect | 函式在回傳值之外改變狀態、I/O 或全域資源 | `reliability.md`、`design-principles.md` 的封裝 |
| Ripple Effect | 局部修改引發跨模組連鎖修改 | `architecture.md`、`design-principles.md`、`api-and-database.md` 的相容性 |

## 強制等級
- **MUST**：必守，無例外；規則未標示等級時一律視為 MUST。
- **SHOULD**：預設遵守；例外須在 PR 說明理由。
- **MAY**：建議做法。

## AI 工作守則
- 先讀再寫：讀受影響的檔案與所有呼叫端（含字串形式的引用，如路由、事件名、設定鍵），沿用同層既有寫法，不自創第二套。
- 不擅自擴充：未經任務明確要求，不新增相依套件，不修改相依清單、建置、環境與 CI 設定檔（`settings.json` 會要求確認）。
- 不隱藏錯誤：不以停用警告、空 catch、強制忽略 null 檢查、同步等待非同步結果等方式掩蓋問題；確有必要時附原因並告知。
- 每次改動都能回答：改了什麼、為什麼、影響哪些地方、如何驗證；說不清楚就不提交。
- 刻意偏離規範或二選一的決定用 `/adr` 記錄，並在 `CLAUDE.md` 的已知落差表加一列。