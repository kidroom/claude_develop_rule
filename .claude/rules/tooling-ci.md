---
paths:
  - "**/.editorconfig"
  - "**/Dockerfile*"
  - "**/docker-compose*.{yml,yaml}"
  - ".github/workflows/**"
  - "**/azure-pipelines*.{yml,yaml}"
  - "**/pipelines/**/*.{yml,yaml}"
  - "**/.gitlab-ci.yml"
  - "**/Jenkinsfile"
  - ".husky/**"
  - "**/.pre-commit-config.yaml"
  - "**/{package.json,pyproject.toml,go.mod,Cargo.toml,pom.xml,Makefile}"
  - "**/build.gradle*"
  - "**/*.{csproj,props,targets}"
---

# 工具鏈與 CI

工具能檢查的規則不靠人審查；人的注意力留給設計與業務正確性。

## 建置與靜態檢查
- 警告視為錯誤；嚴格模式與 null 安全檢查依 `coding.md` 開啟。
- 啟用靜態分析與 linter，違規即錯誤；格式由 formatter 統一並在 CI 驗證無差異；SHOULD 以 pre-commit hook 在本機自動修正。
- 相依套件版本集中鎖定（lock file 或集中版本管理）；升版走獨立 PR；SHOULD 以自動化工具定期更新。

## CI 階段
依序執行，任一失敗即中止，禁止跳過：
1. 還原與建置
2. 格式與靜態檢查
3. 快速測試：單元、契約快照、架構（排除整合測試；SHOULD < 3 分鐘）
4. 覆蓋率與安全掃描：相依套件有 High 以上已知漏洞即失敗；SHOULD 加上秘密掃描（如 gitleaks）
5. 產出部署物

MAY 定期執行 mutation testing。

## 本機環境
- clone 後只需建置與測試指令即可執行全部 CI 層測試；需要額外手動步驟視為待修問題。
