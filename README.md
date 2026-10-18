# 北科圖書館閱覽室座位預約系統

保留 V1 原有視覺與 32 席預約流程，新增學號帳號註冊、登入、登出、Supabase 共用資料及多人預約安全設定。這是教學展示專案，並非北科大官方校務系統；目前沒有校方學籍核驗，因此知道學號的人仍可能嘗試註冊，正式校務用途前必須增加身分驗證。

## 專案內容

- `index.html`、`styles.css`、`app.js`：GitHub Pages 前端
- `config.js`：只放 Supabase Project URL 與公開 anon/publishable key
- `supabase-schema.sql`：資料表、RLS、唯一索引、座位狀態 RPC
- `supabase/functions/register-student/index.ts`：安全建立學號帳號的 Edge Function

## Supabase 設定

1. 在 Supabase 建立專案。
2. 開啟 SQL Editor，執行完整 `supabase-schema.sql`。
3. 安裝 Supabase CLI，登入並在專案目錄連結專案：
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
4. 部署註冊 Edge Function：
   ```bash
   supabase functions deploy register-student
   ```
   Supabase Edge Functions 執行環境通常會提供 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`。若專案環境未提供，請在 Edge Function secrets 設定這兩個值。**服務角色金鑰只可放在 Supabase 伺服器端 secrets，絕不可放入 GitHub、`config.js` 或前端程式。**
5. 在 Supabase Authentication 設定中，關閉 Email confirmation（此專案使用內部合成識別，不會寄送郵件）。使用者實際輸入的是學號，不是 Email。登入識別會在前端轉成 `學號@students.ntut.example.com`，此地址只供 Supabase Auth 內部使用。
6. 從 Project Settings → API 複製 Project URL 與 **anon/publishable key**，填入 `config.js`：
   ```js
   window.SEAT_APP_CONFIG = {
     SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
     SUPABASE_ANON_KEY: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
   };
   ```
7. 在 Authentication URL Configuration 設定 Site URL 及 Redirect URLs 為實際 GitHub Pages 網址。雖然本流程不使用郵件驗證，仍建議設定正確的部署網址。
8. 確認 Auth 密碼政策符合需求。前端不自行限制密碼長度或複雜度；Supabase Auth 的最低要求仍然適用。

## GitHub Pages 部署

1. 將專案資料夾內的檔案與 `supabase/` 資料夾推送至 GitHub repository。
2. 在 `config.js` 填入 Supabase URL 與公開 anon/publishable key。
3. Repository → Settings → Pages → Deploy from a branch，選擇 `main` 與 `/ (root)`（或依你的 repository 目錄配置調整）。
4. 開啟 GitHub Pages 網址，確認頂端顯示正式資料模式。尚未填入 Supabase 設定時，前端會回到本機示範模式；示範模式不支援跨裝置同步。

## 安全與多人同步

- 學號格式在前端及 Edge Function 驗證：`^(?!000)[0-9]{9}$`。
- `student_accounts.student_id` 有唯一約束，並由 Edge Function 使用服務角色建立；該表對 `anon` 與 `authenticated` 撤銷所有權限。
- Auth 只儲存 Supabase 管理的密碼雜湊，不自行儲存明文密碼。
- 預約 RLS 只允許使用者讀取、建立及取消自己的紀錄。
- 部分唯一索引 `(reservation_date, time_slot, seat_code) WHERE status='active'` 是同時搶位的資料庫最終防線；前端預先檢查只是改善體驗。
- 座位狀態 RPC 只回傳座位代碼，不暴露他人帳號或預約紀錄。
- 預約畫面每 12 秒重新讀取座位狀態，預約／取消後也會立即刷新。資料在 Supabase，因此不同裝置使用同一專案時共用狀態。

## 測試狀態

已執行靜態程式碼檢查與 JavaScript 語法檢查（見交付說明）。此執行環境沒有你的 Supabase 專案憑證與已部署的 GitHub Pages 網址，因此**未能實際完成**真實註冊／登入、兩帳號同時搶位、跨裝置同步等整合測試。部署後請依序驗證：

1. 註冊合法學號；測試 `000123456`、字母、少於 9 位應被拒絕。
2. 重複註冊同一學號應回覆已註冊；登出後用學號與密碼登入。
3. 兩個不同帳號同時預約相同日期、時段、座位，只能有一筆成功。
4. 取消預約後另一帳號應能重新預約同一座位。
5. 用不同瀏覽器或裝置登入，確認座位狀態及個人預約可跨裝置保存；帳號 A 不應看見帳號 B 的個人紀錄。

## 限制與注意事項

- 這不是北科大官方服務，沒有連接校方學籍資料；學號格式正確不代表已驗證學生身分。
- Edge Function 對公開註冊端點應再配合 Supabase Auth 限流、監控及濫用防護。學號本身不是秘密，也不應當作身分驗證的唯一證明。
- 目前使用 12 秒輪詢更新座位狀態，而非即時推播；多人狀態會更新，但可能有短暫延遲。唯一索引可防止重複預約。
- Supabase 免費方案限制與政策可能變動，請以供應商當期文件為準。
