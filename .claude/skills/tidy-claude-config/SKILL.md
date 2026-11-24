---
name: tidy-claude-config
description: 定期整理 CLAUDE.md、.claude/rules 與 skills，刪除過時與重複內容，確保精簡。在每個迭代結束、檔案超過長度上限，或技術棧與指令變更時執行。
disable-model-invocation: true
---

# 整理 Claude 設定

## 1. 盤點
- 讀取 `.claude/CLAUDE.md`、`.claude/rules/` 全部檔案、`.claude/skills/*/SKILL.md`、`.claude/agents/`、`.claude/settings.json`。
- 列出每份檔案的行數，標出超過上限的檔案（上限見 `.claude/rules/claude-config.md`）。

## 2. 逐條檢查
對每一條規則依序問：
1. **刪掉會出錯嗎？** Claude 不需要提醒也會做對的，刪除。
2. **還正確嗎？** 指令能執行？提到的路徑、檔案、工具還存在？`CLAUDE.md` 的規則索引與實際規則檔一致？過時的更新或刪除。
3. **有重複嗎？** `CLAUDE.md`、rules、skills 之間意思相同的，只保留一處。
4. **放對位置嗎？** 只對特定檔案適用的移到有 `paths` 的規則；流程性的移到 skill。
5. **能改為強制嗎？** 反覆被違反、且能自動檢查的，改用 linter 規則或 `settings.json` 的 hooks／permissions，並刪除文字版本。
6. **有矛盾嗎？** 以最新的決定為準，刪除舊的。

## 3. 提出清單
先不修改。依下列格式列給使用者確認：
```
## 刪除
- [檔案] 規則內容 → 理由
## 合併
- …
## 移動
- [來源] → [目的地]：理由
## 改為強制
- …
## 更新
- …
```

## 4. 套用
- 使用者確認後才修改。
- 更新 `.claude/CLAUDE.md` 檔尾的「最後整理」日期。
- 回報整理前後各檔行數。
