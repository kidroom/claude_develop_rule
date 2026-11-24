# 變更管理與發布

安全來自每次變更小、可回退、可觀察，而不是更長的測試週期。

## Git
- 主線隨時可建置、可部署，不直接在主線開發（hook 禁止在主線 commit、merge、rebase 與直接 push 主線）；分支命名 `<type>/<簡短描述>`，存活 ≤ 1～2 天。
- Commit 採 Conventional Commits `<type>(<scope>): <摘要>`（type：feat、fix、refactor、test、docs、chore、perf、build、ci）；標題一句話寫做了什麼，內文 1～3 行寫為什麼與影響範圍，不重述 diff、不列檔案清單（hook 檢查標題格式）。
- 一個 commit 一個目的，且能建置、測試通過；commit message 與 PR 標題中的識別字不翻譯。
- 不 commit 建置產物與個人設定（`CLAUDE.local.md`、`.claude/settings.local.json`）；秘密見 `security.md`。
- 禁 force push、改寫已推送的歷史、刪除遠端分支、以 `--no-verify` 略過 git hooks；push 與合併 PR 須經使用者同意。

## Pull Request 與審查
- 一個 PR 一件事，≤ 400 行（不含自動產生的檔案），超過須說明無法拆分的原因。
- PR 描述五項：目的（連結需求）、變更內容（設計決策，不重述 diff）、影響範圍（模組、介面、breaking change、資料庫變更、feature flag）、測試（新增測試與手動驗證）、回退計畫；缺項退回。
- 作者先自我審查；AI 產生的程式碼由作者負責，標準同手寫。提交前交給 `standards-reviewer` 子代理審查。
- SHOULD：至少一位非作者審查；觸及影響分析項目時加上模組負責人。
- 拒絕合併：沒有測試或只測成功路徑、breaking change 無遷移計畫、夾帶無關修改、TODO 無追蹤編號、MUST 違規且無例外說明。
- 合併前 CI 全綠、通過審查、沒有衝突；SHOULD 採 squash merge。

## 修改既有行為
- 觸及下列任一項先執行 `/impact-analysis`，結果附在 PR：共用業務規則、公開介面或基底類別、DTO／事件／訊息格式、資料庫 schema、相依注入生命週期、全域 middleware、設定鍵名與預設值。
- 以新增取代修改：被 3 個以上呼叫端使用的函式，行為變更必須新增新函式，不改舊語意；呼叫端逐一切換後舊的標記 deprecated，下一版移除。
- Deprecation 依序為警告 → 錯誤 → 刪除，不跳步。
- 設定鍵的使用者不只程式碼：新增、改名或刪除時，一併更新各環境設定檔、本機範本、部署腳本與文件中的設定說明。

## Feature Flag
- 影響既有行為的功能放在 flag 後，預設關閉；flag 附負責人與預計移除日，全面開啟後 30 天內移除。
- flag 判斷集中在進入點或組裝層，不散落在業務邏輯；用最簡單的開關機制，不建旗標框架。

## 部署與回退
- 任一版本可快速回退，且不需回退資料庫（資料庫變更依 `api-and-database.md` 分階段進行）。
- SHOULD：部署後觀察錯誤率與延遲，超過閾值即回退。
- 正式環境的 regression 在 48 小時內完成事後檢討，並新增能重現問題的自動化測試。
