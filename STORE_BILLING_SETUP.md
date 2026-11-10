# BFCam 商店購買設定

App 已整合 `react-native-purchases` 11.0.0，使用 RevenueCat 代管商店收據驗證與權限狀態。Android 商店商品已於 2026-11-05 建立並啟用；RevenueCat 後台、公開 SDK key 與商店購買測試尚未完成，不能視為已可收款。

## Android 後台實際完成狀態（2026-11-05）

使用者已完成 Google Payments 商家付款資料建立。以下商品已在 Play Console 逐項建立、儲存並確認有效，販售地區僅台灣：

| 商品 ID | 基本方案／購買選項 ID | 台灣售價 | 優惠 |
|---|---|---|---|
| `bfcam_pro_monthly` | `monthly` | TWD 59.00／月，自動續訂 | `trial-3-days`，免費 3 天，已啟用 |
| `bfcam_pro_annual` | `annual` | TWD 390.00／年，自動續訂 | `trial-3-days`，免費 3 天，已啟用 |
| `bfcam_pro_lifetime` | `lifetime` | TWD 990.00，一次購買 | 無試用，購買選項有效且與舊版相容 |

兩個試用優惠皆為「獲取新客 → 從未在 BFCam 訂閱任何項目」，由 Google Play 評估資格，僅一個免費三天階段，後續回到基本方案。年／月方案皆補上繁體中文福利及說明。月方案保留預設 7 天寬限期，年方案保留預設 14 天寬限期；帳戶保留由 Google 自動計算。

價格工具本次輸入未稅金額後自動計算台灣稅額，最終儲存頁已核對為上表金額；後續異動以頁面實際顯示的售價為準。

證據：`artifacts/play-monthly-20261105.png`、`artifacts/play-annual-20261105.png`、`artifacts/play-lifetime-20261105.png`。這些是後台設定證據，尚未驗證裝置購買、試用資格、續訂、退款或恢復購買。

政策頁已上線並填入 `src/config/billing.ts`，見 `GITHUB_PAGES_SETUP.md`。下一步：連接 RevenueCat 的 Google Play 憑證、匯入三個商品、建立 `bfcam_pro` entitlement/offering 與標準 package，再設定公開 SDK key、重新打包並做商店測試。Google 付款頁仍提示可註冊 15% 服務費計畫，本次未代為接受服務費條款、設定帳戶群組或新增銀行收款方式。

## 1. 建立商店商品

先準備 Google Play Console／Apple Developer 與 App Store Connect 帳號，完成商業、付款及稅務資料。

- Android 目前 applicationId 是 `com.bfcam`，必須與 Play Console、RevenueCat 的應用程式相同。
- iOS 專案仍為 React Native 範本 Bundle Identifier。在 Xcode 確認最終 Bundle Identifier、簽署 Team 與 In-App Purchase capability，再用相同 ID 建立商店 App。不要在發佈後任意更換識別碼。
- 商品 ID 由商店建立後固定。以下名稱已用於 Android；iOS 仍待建立。

| 方案 | 建議商品 ID | 商店商品種類 | 試用 |
|---|---|---|---|
| 月訂閱 | `bfcam_pro_monthly` | 自動續訂訂閱／月繳 base plan | 符合商店資格者免費 3 天 |
| 年訂閱 | `bfcam_pro_annual` | 自動續訂訂閱／年繳 base plan | 符合商店資格者免費 3 天 |
| 永久買斷 | `bfcam_pro_lifetime` | 非消耗型一次性商品 | 無訂閱試用 |

月／年／買斷解鎖相同的智慧構圖與一鍵美顏。Android 台灣價格已如上設定；App 顯示商店回傳的在地化價格，不寫死幣別或數字。

- Google Play：月／年 base plan 採自動續訂；建立新客取得類的 3 天免費 offer，啟用商品與銷售地區。不要混入會被 SDK 自動選取的開發者自訂試用 offer。SDK 會從商店提供給目前使用者的選項選取可用優惠。
- App Store：月／年商品放在同一訂閱群組，設定免費 3 天 introductory offer。已使用同群組試用者不一定能再領取；不要承諾每次重裝或每個方案都可再試用。
- App 不會先扣一次訂閱款再倒數 3 天。使用者先在商店確認訂閱，符合優惠資格者先試用，到期依商店規則續訂扣款。取消續訂後保留至已驗證的有效期限。

## 2. RevenueCat

1. 建立專案，加入 Android／iOS 應用程式。
2. 在 RevenueCat 後台連接商店所需的憑證與通知。私密 API Key、App Store In-App Purchase key、Google 服務帳號 JSON 只放後台，禁止放進 App 或 Git。
3. 匯入三個商店商品（Android 選對 base plan）。
4. 建立 entitlement，識別碼 **`bfcam_pro`**，把三個商品都附加到此權限。
5. 建立 offering，識別碼 **`bfcam_pro`**，分別將商品設定為標準 Monthly、Annual、Lifetime package。App 精確讀取此 offering，不隨意選其他專案方案。
6. 在後台確認匿名使用者恢復購買與移轉政策。現階段沒有 BFCam 帳號，恢復依商店帳號／RevenueCat 行為處理，不保證 Apple 與 Google 跨平台共享資格。

## 3. 填入 App 設定

編輯 `src/config/billing.ts`：

- `androidPublicKey`：Android 公開 SDK key（`goog_…`）。
- `iosPublicKey`：iOS 公開 SDK key（`appl_…`）。
- `entitlementId`／`offeringId`：若後台名稱不同，同步修改。
- `privacyUrl`／`termsUrl`：實際可公開存取的 HTTPS 隱私政策與付費使用條款。隱私說明需涵蓋購買 SDK、匿名識別碼與交易資料處理。

App 未填公開 key 時不啟動付款。缺少條款頁時不允許新購買，但仍能恢復購買資格。不要填入測試假 key 或自行把 Pro 狀態改成 true。

## 4. 建置與商店測試

Android：安裝依賴後建置上傳 internal testing 的 AAB，加入測試帳號／license tester，從 Play 測試軌道安裝。先確認套件 ID、版本與簽章設定；Release 已改用私人上傳金鑰，正式 AAB 設定與備份方式見 ANDROID_RELEASE.md。

iOS：在 macOS 執行 `bundle exec pod install`（於 ios 目錄），以 Xcode 建置。使用 Sandbox Apple Account／TestFlight 測試；本 Windows 環境不能驗證 CocoaPods 或 iOS build。

沙箱續訂與試用時間可能加速，請按商店測試規則驗證，不能直接拿牆上三天等待當成唯一驗收。

## 5. 必驗收

- 免費 20 張計次不變；有效 Pro／訂閱試用期間輸出不扣免費張數。
- 符合資格者顯示免費 3 天、後續正常價格與週期；不符合或資格不明者不承諾免費 3 天，商店確認頁為最終依據。
- 購買成功且權限驗證通過才解鎖；取消、失敗、待付款不解鎖、不消耗免費額度。
- 點擊連打只啟動一筆商店流程；已有 Pro 不重複銷售。
- 恢復購買、重開 App、回到前景、訂閱取消但尚未到期、試用到期、退款／撤銷及無網路情境。
- App 對已驗證有效期設限；到期不只依靠本機永久開關。後台異動需 SDK 重新取得 CustomerInfo，並非即時推播到 UI。
- 已儲存照片不受付費狀態影響。未加入試用結束前一天的本機通知、優惠碼頁或 App 內退款介面。

## 官方文件

- https://www.revenuecat.com/docs/getting-started/installation/reactnative
- https://www.revenuecat.com/docs/getting-started/making-purchases
- https://www.revenuecat.com/docs/getting-started/restoring-purchases
- https://www.revenuecat.com/docs/subscription-guidance/subscription-offers
- https://www.revenuecat.com/docs/customers/customer-info

## 本次驗證（2026-11-02）

- TypeScript、此次異動檔案的 ESLint、`git diff --check` 通過。
- Jest 16 組、88 項測試通過，包含可信權限、過期／取消續訂、三天優惠資格、方案週期檢查與 20 張額度邊界。
- Android `:app:compileReleaseKotlin :app:processReleaseMainManifest` 成功，購買 SDK 的 Kotlin／Java 與 App Kotlin 編譯通過。日誌：`android/build/reports/billing-integration-20261102.log`。
- 未產出這次商店整合的新 APK／AAB。未驗證商店沙箱購買、實際扣款、取消／退款同步或 iOS build；須完成後台設定後逐項驗收。
