---
paths:
  - "**/{api,apis,routes,controllers,handlers,endpoints,contracts}/**"
  - "**/*{controller,Controller,handler,Handler,route,Route,endpoint,Endpoint}*.*"
  - "**/*{Dto,DTO,Request,Response,Event,Message}.*"
  - "**/{openapi,swagger}*.{yaml,yml,json}"
  - "**/{migrations,migration,db,database,persistence,infrastructure}/**"
  - "**/*.sql"
  - "**/*{repository,Repository,repo,Repo,dao,Dao}*.*"
---

# API 契約與資料庫

輸入驗證與參數化查詢見 `security.md`；金額型別見 `coding.md`；冪等鍵、逾時與重試見 `reliability.md`。

## API 設計
- 資源用名詞複數，HTTP 方法表達動作：`GET /orders`、`POST /orders`、`GET /orders/{id}`。
- 狀態碼語意正確：200／201／204 成功；400 格式錯誤、401 未認證、403 無權限、404 不存在、409 衝突、422 業務驗證失敗；500 只用於非預期錯誤。
- 全 API 採用同一種欄位命名風格與錯誤格式（如 `{ code, message, details }`）；序列化設定集中一處，API、HTTP client、佇列共用。
- 時間用 ISO 8601 並帶時區；對外 ID 用 UUID v7 或 ULID，不暴露自增整數。
- 請求／回應 DTO 與領域實體、持久化實體分離，以 mapper 轉換；SHOULD 不跨 endpoint 共用 DTO。
- 回應只回傳呼叫端需要的欄位；列表一律分頁並設上限；PUT、DELETE 保持冪等。

## 契約相容
契約一經消費就不只屬於提供方；所有變更以「消費者不需同步修改」為預設。

| 變更 | Breaking | 做法 |
|---|---|---|
| 回應新增欄位 | 否 | 直接加 |
| 請求新增選填欄位 | 否 | 給預設值 |
| 請求新增必填欄位 | 是 | 先以選填加預設值上線，客戶端更新後再改必填 |
| 移除或改名欄位 | 是 | 新增新欄位，舊欄位標 deprecated 並行輸出至少一個版本 |
| 改變型別或格式 | 是 | 視為新欄位 |
| 列舉新增值 | 對嚴格解析者是 | 列舉以字串輸出，文件註明客戶端須容忍未知值 |
| 改錯誤碼或狀態碼 | 是 | 錯誤碼只增不改 |
| 改預設排序或分頁 | 是 | 以新參數提供 |

- 破壞性變更才升主版本（SHOULD 用 URL 路徑版本，同時維護 ≤ 2 個主版本）；棄用的 endpoint 回傳 Deprecation／Sunset header，確認無流量後移除。
- API 契約（如 OpenAPI）與實作在同一個 PR 更新；SHOULD 由程式碼產生並在 CI 比對 breaking change。
- 佇列訊息與事件也是契約：帶版本欄位，發布端只增不減欄位。

## 資料庫
- schema 變更一律寫成 migration 並納入版控；已套用的 migration 不修改，改新增一個。
- 破壞性變更採 Expand／Contract：新增 → 搬移資料與雙寫 → 移除舊欄位，每階段獨立部署；不直接重新命名欄位；大表加欄位或索引先評估鎖表。
- 表名與欄位名依專案慣例擇一風格；外鍵命名 `<表名單數>_id`。
- 明列需要的欄位，不用 `SELECT *`；讀取以投影取得所需資料，ORM 讀取停用變更追蹤。
- 連線與查詢逾時由連線工廠統一設定；依實際查詢模式建立索引，以執行計畫或量測為依據。
- 資料庫例外對外只輸出錯誤代碼與摘要，參數值不進日誌（其餘見 `security.md` 的敏感資料）。
- 一個用例一個交易，交易邊界由應用層控制；交易內不呼叫外部服務。
- 業務唯一性靠資料庫唯一索引保證；程式「先查再寫」只為提供友善訊息。
- 不在正式環境手動修改資料；需要修正時寫成可審查、可重複執行的腳本。
