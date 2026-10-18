# 北科圖書館閱覽室座位預約系統

教學展示原型・非官方預約系統。這不是國立臺北科技大學的正式校務服務。

## 立即體驗（示範模式）

1. 解壓縮專案。
2. 直接開啟 `index.html`，或在專案資料夾執行 `python -m http.server 8000` 後瀏覽 `http://localhost:8000`。
3. 示範預約儲存在該瀏覽器的 `localStorage`，重新整理仍會保留。不同瀏覽器／裝置不會同步，清除網站資料會清除示範紀錄。

## 部署至 GitHub Pages

1. 將本資料夾內容推送到 GitHub repository 的根目錄。
2. Repository → Settings → Pages → Deploy from a branch，選擇 `main` 與 `/ (root)`。
3. 等待 GitHub Pages 發佈後，以 Pages 顯示的網址開啟。純靜態網站不需要 Node.js 伺服器。

## 啟用共用正式資料（Supabase 免費方案可用，依供應商當期方案為準）

1. 建立 Supabase 專案並確認專案的 Auth / Database 可用。
2. 在 Supabase SQL Editor 執行 `supabase-schema.sql` 全部內容。
3. 從 Project Settings / API 複製 Project URL 與 **anon/publishable key**，填入 `config.js`：

   ```js
   window.SEAT_APP_CONFIG = {
     SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
     SUPABASE_ANON_KEY: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
   };
   ```

4. `config.js` 會部署到前端，因此只能放公開 anon/publishable key。**絕不可放 `service_role`、secret key 或資料庫密碼。**資料安全依靠 SQL 中的 RLS、資料庫唯一索引與 RPC。
5. Supabase Authentication → Providers → Email 設定電子郵件登入／驗證政策。若啟用 email confirmation，使用者註冊後需完成信箱驗證再登入。正式站請設定 Site URL 及允許的 Redirect URLs 為 GitHub Pages 網址。
6. 重新整理網站。設定完整時頂端會顯示「正式資料模式」，使用者需登入才能查看或修改自己的預約。座位可用狀態透過 RPC 取得，回傳內容只有座位代碼。

### 資料完整性與安全

- `seat_reservations_one_active_seat` 部分唯一索引確保相同日期、時段、座位最多一筆有效預約；即使兩個使用者同時送出，資料庫也只會接受其中一筆。
- RLS 限制使用者只能讀取自己的預約、建立自己的預約、取消自己的有效預約。
- `get_reserved_seats` 只回傳座位代碼，不回傳其他使用者的個資。
- 取消會把狀態更新為 `cancelled`，唯一索引不再阻擋該座位。
- 日期欄位與前端皆限制今天起 14 天；資料庫的日期 `CHECK` 以資料列寫入時的 `current_date` 判定。

## 已知限制

- 示範模式的 LocalStorage 檢查只在單一瀏覽器內有效，不是多人共用的競態安全資料庫。
- 前端透過 CDN 載入 Supabase JS 與 Google Fonts；正式網路環境需能存取 CDN。若 CDN 不可用，基本示範頁面仍可載入，但雲端模式無法工作。
- 本原型沒有校園單一登入、學生身分驗證、管理後台、到館簽到、逾時自動釋出或正式校務系統串接。
- 請在正式使用前，由專案管理者檢視 SQL、RLS 與資料保留政策，並以真實部署網址做安全測試。
