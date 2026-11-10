# BFCam 政策頁面發布

已備妥 `docs/index.html`、`docs/privacy/index.html`、`docs/terms/index.html` 與共用樣式。無外部字型、追蹤腳本或建置依賴。

## 發布到獨立的公開政策儲存庫

BFCam 主程式儲存庫維持原本的存取設定。另建 `bfcam-policies-pages`，只公開政策網頁。

1. 登入 `karta1127182`，開啟 https://github.com/new 。Owner 選 `karta1127182`，Repository name 填 `bfcam-policies-pages`，Visibility 選 Public，勾選 Add a README file，建立儲存庫。
2. 解壓縮本機 `artifacts/bfcam-policies-pages.zip`。這份壓縮檔只包含五個政策網站檔案，沒有 App 原始碼、Git 歷史或簽署設定。
3. 在新儲存庫選 Add file → Upload files，將解壓縮後的 `index.html`、`style.css`、`privacy` 資料夾及 `terms` 資料夾拖入，提交。`index.html` 要直接位於儲存庫根目錄，不要上傳 ZIP 本身或多包一層資料夾。`.nojekyll` 若系統隱藏可另行上傳；目前純 HTML 頁面不依賴它也能顯示。
4. Settings → Pages → Build and deployment，選 Deploy from a branch，再選 `main` 與 `/(root)`，按 Save。
5. 等待 Pages 部署成功，使用未登入的瀏覽器及手機確認下列頁面可公開開啟、導覽與客服信箱正確。

正式網址（2026-11-04 已以瀏覽器驗證首頁、隱私政策與付費條款可開啟）：

- 支援頁：https://karta1127182.github.io/bfcam-policies-pages/
- 隱私政策：https://karta1127182.github.io/bfcam-policies-pages/privacy/
- 付費條款：https://karta1127182.github.io/bfcam-policies-pages/terms/

後續更新以 `docs/` 作為本機來源，重新打包或上傳異動的頁面到政策儲存庫。不將 BFCam App 儲存庫的整個資料夾或 `.git` 上傳到政策儲存庫。

## 接回 App 與商店

兩個政策網址已填入 `src/config/billing.ts` 的 `privacyUrl`、`termsUrl`。RevenueCat 公開 SDK key 仍須另行取得。這次只更新本機原始碼設定，未重建或上傳新的 App。

Play Console 隱私政策欄位填入隱私政策網址；支援網站可填支援頁，客服 Email 為 `karta1127182@gmail.com`。資料安全表單仍須依實際 SDK 與發布版本逐項填寫；照片在裝置處理不代表 SDK 沒有診斷或購買資料傳輸。

## 內容維護

開發者：Ben Fang。政策日期：2026-11-03。政策依目前裝置端照片分析、本機額度、ML Kit 與 RevenueCat 整合撰寫；未宣稱已開放收款。若加入帳號、雲端照片、廣告、分析 SDK，或更改試用與方案規則，發布前須同步修訂。

參考：
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://developers.google.com/ml-kit/terms
- https://developers.google.com/ml-kit/android-data-disclosure
- https://www.revenuecat.com/privacy-policy
- https://www.revenuecat.com/docs/customers/identifying-customers

2026-11-04：使用者已上傳政策檔案。已檢查獨立政策儲存庫的兩筆提交，內容只有五個政策網站檔案及空白 README；將該儲存庫從私人改為公開，啟用 `main` 分支的根目錄 Pages，HTTPS 強制啟用。已在瀏覽器確認三個正式頁面與導覽正常；未變更 BFCam 主程式儲存庫的存取設定。

部署工作：https://github.com/karta1127182/bfcam-policies-pages/actions/runs/41769123906

上線畫面：`artifacts/bfcam-policies-live.png`。
