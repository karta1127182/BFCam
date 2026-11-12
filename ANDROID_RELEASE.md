# Android 上傳包與簽署

目前套件 ID：`com.bfcam`，顯示名稱 `BFCam-男友相機`，版本名稱 `1.0.7`，versionCode `8`。

## 2026-11-12：英文、日文、韓文

- AAB：`artifacts/BFCam-1.0.7-multilingual-upload.aab`，versionName `1.0.7`，versionCode `8`，210,977,753 bytes。
- 包含三語介面與繁體中文預設、原有審查存取；沿用上傳金鑰與 R8 最佳化。
- 混淆對照檔：`artifacts/BFCam-1.0.7-mapping.txt`；驗證摘要：`artifacts/BFCam-1.0.7-validation.json`。
- Release 建置、bundletool 結構、844 個內容項目的簽章與既有上傳憑證比對通過；192 張姿勢圖片與 7 個 ML Kit 反射入口保留檢查通過。
- SHA-256：`268cbba14fba524f5100fe95534bad771a31d5ebef23b8c8ae55e5daa44c6415`。
- 尚未手機實測，未上傳 Google Play、送審或發布。

## 2026-11-10：審查存取與中文名稱

- 新 AAB：`artifacts/BFCam-1.0.6-review-access-upload.aab`；手機 APK：`artifacts/BFCam-1.0.6-review-access.apk`；混淆對照檔：`artifacts/BFCam-1.0.6-mapping.txt`。
- Android 安裝包已驗證顯示名稱為 `BFCam-男友相機`。iOS 顯示名稱、啟動畫面與權限說明同步修改，但本 Windows 環境未建置 iOS。
- 使用者授權新增 Google Play 審查存取：方案面板 → `Store review access` → 輸入私下提供的代碼 → `Enable review access`。不限次數、不過期、重啟保留，可停用；與 RevenueCat／商店購買資格分開，不模擬訂閱或交易。原免費額度紀錄保持不變。
- 原生端只內含代碼 SHA-256 摘要。私有代碼在 `artifacts/BFCam-review-access-private.txt`，英文操作步驟與代碼已填入 Play Console「登入詳細資料」。不要公開代碼或將該檔加入 Git。此為離線審查入口，並非伺服器端防濫用系統。
- 型別檢查、此次修改的 ESLint、4 組／17 項額度、購買與審查存取測試通過；測試包含額度用完後連續 25 次審查輸出不扣次、停用後恢復原限制、重啟重新驗證及儲存失敗不解鎖。
- Release APK／AAB 建置、APK 簽章、bundletool 結構、824 個 AAB 內容項目的簽章、ML Kit 反射入口與 172 張姿勢圖片保留檢查通過。此次審查入口尚未做手機 UI 驗收，不能將單元測試視為實機驗收。
- 本版本未上傳 Google Play；商店圖像與上架流程進度見 `PLAY_CONSOLE_SETUP.md`。

## 2026-11-10：DEX 最佳化版本

- Release 已啟用 R8 程式碼縮減、最佳化、混淆與資源縮減。
- 原生 JNI 邊界的保留規則位於 `android/app/proguard-rules.pro`；React Native 與其他套件仍套用各自的 consumer rules。
- AAB：`artifacts/BFCam-1.0.5-r8-20261110-upload.aab`。
- APK：`artifacts/BFCam-1.0.5-r8-20261110.apk`。
- 混淆對照檔：`artifacts/BFCam-1.0.5-r8-20261110-mapping.txt`。AAB 也內含同一份對照檔，須與此版本一起保存，不能拿其他版本的 mapping 還原錯誤。
- 相較 1.0.4，DEX 由 4 個／34,202,996 bytes 減為 1 個／8,615,440 bytes，減少 74.81%；AAB 由 212,864,154 bytes 減為 210,599,761 bytes。原生函式庫與模型仍占大部分套件大小。
- 保留 ML Kit/Firebase 透過 manifest 反射建立的註冊元件及無參數建構子，避免 R8 full mode 移除建構子後，人臉偵測初始化閃退。
- `assembleRelease`、`bundleRelease`、bundletool 結構驗證及 824 個內容項目的上傳憑證簽章驗證通過。APK v2 簽章驗證通過。
- 獨立 Android 37.1／x86_64／16 KB 模擬器冷啟動、相機預覽、拍照進入編輯頁、套用暖色濾鏡及輸出至 BFCam 相簿通過；未驗收實機辨識品質或商店購買。證據位於 `artifacts/validation/r8-*.xml`、`r8-camera.png`，彙整於 `artifacts/BFCam-1.0.5-r8-20261110.validation.json`。
- 可重跑靜態回歸檢查：`python scripts/verify-r8-release.py --bundle artifacts/BFCam-1.0.5-r8-20261110-upload.aab`。會檢查 7 個 ML Kit 註冊元件的建構子、172 張姿勢圖片、內含程式與混淆對照檔；不取代裝置測試。此檢查已驗證會拒絕缺少反射建構子的失敗版本。
- 本次只產生本機發布檔案，未上傳或送審。

下列舊版檔名、大小與驗證紀錄保留作為歷史參考。

## 已完成

- Release 使用獨立的 Google Play 上傳金鑰，不再使用 debug.keystore。
- 缺少簽署設定、金鑰無法讀取、密碼或別名不正確、憑證過期或使用 Android Debug 憑證時，正式建置會停止。
- Debug 建置仍使用原有測試簽章，不需要正式金鑰。
- 私人簽署檔已排除於 Git，並以 Windows ACL 限制目前使用者存取。
- 已建立的金鑰不得重建／覆寫。初始化腳本會拒絕覆寫任何既有簽署檔。

## 私人檔案：請安全備份

1. `android/signing/bfcam-upload.p12`：加密的私人上傳金鑰。
2. `android/signing.local.properties`：本機簽署設定，包含密碼。

請把兩者備份到自己管理的安全位置。不要放進 Git、聊天、郵件附件或公開下載資料夾。`artifacts/bfcam-upload-certificate.pem` 是公開憑證，可以提供給商店；它不是私人金鑰。

上傳金鑰憑證 SHA-256：

`733831D01BAB718799B3F6C33B2827E0BF9ADE7A1350D015554F5818756532ED`

Google Play 建議採 Play App Signing，讓商店管理實際發給使用者的 App signing key。本機這把是 upload key，商店下載版憑證可能不同。新建 App 可由 Google 產生 App signing key；若其實已有上架版本，必須先確認 Play Console 的既有上傳憑證，不能直接改用新金鑰。

## 建置

在 PowerShell：

```powershell
Set-Location C:\Workspace\BFCam\android
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\karta\AppData\Local\Android\Sdk'
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
.\gradlew.bat :app:bundleRelease --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m' --console=plain
```

原始輸出：`android/app/build/outputs/bundle/release/app-release.aab`。
每次上傳新版本前，必須使用比 Play Console 已上傳版本更大的 versionCode。

Google Play 上傳檔：`artifacts/BFCam-1.0.2-upload.aab`（210,537,364 bytes）。
SHA-256：`FABF8C9250C31ABD710AF40D973BE12327079AEA39F45320BD07A3E783A8DE0A`。

直接安裝測試檔：`artifacts/BFCam-1.0.2-release.apk`（304,761,192 bytes）。
SHA-256：`E7AE388BB6CE6D1C2F0FC899D5B7C04817A541F8F038A7A59D381A1558DA5FD5`。

檢查摘要：`artifacts/BFCam-1.0.2-upload.validation.json`。

以 ARM64、Android API 36、繁體中文、420 dpi 的代表規格產生分割 APK 後，bundletool 估計下載大小為 52,365,929 bytes（約 52.4 MB）。此為單一代表規格的估計，不等於每台手機下載大小，也不代表已通過商店上傳驗證。大小檢查用 APK set 使用既有 debug key，只放在 `artifacts/validation`，並非交付的正式上傳 AAB。

CI 可透過 `BFCAM_UPLOAD_STORE_FILE`、`BFCAM_UPLOAD_STORE_TYPE`、`BFCAM_UPLOAD_KEY_ALIAS`、`BFCAM_UPLOAD_STORE_PASSWORD`、`BFCAM_UPLOAD_KEY_PASSWORD` 環境變數提供資料。密碼放 CI 的私密變數，禁止把值寫入指令紀錄。

## 本次驗證

- 缺少設定的負向檢查確實失敗：`android/build/reports/upload-signing-missing-config.log`。
- `bundleRelease` 成功：`android/build/reports/play-upload-bundle-build.log`。
- Google bundletool 1.18.3 結構驗證通過。
- 824 個內容項目逐一通過 JDK JarFile 簽章驗證，且憑證符合公開上傳憑證。
- Release APK 通過 APK Signature Scheme v2 簽章驗證與 16 KB ZIP 對齊檢查。
- AAB 宣告 `PAGE_ALIGNMENT_16K`；56 個 64 位元原生函式庫的 ELF LOAD 區段靜態對齊通過。這不是 16 KB 裝置執行驗收。
- 套件 ID、版本、非 debuggable、ZIP 完整性、內含 JS bundle 與未打包私人簽署檔等檢查通過。
- JDK 的通用 jarsigner 對自簽憑證、無時間戳與 ZIP manifest 順序會顯示警告；逐項 JarFile 簽章驗證通過。這些本機驗證不代替 Play Console 的上傳驗證。

可重跑完整內容簽章驗證：

```powershell
Set-Location C:\Workspace\BFCam
& 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe' scripts/VerifyAndroidBundle.java android/app/build/outputs/bundle/release/app-release.aab artifacts/bfcam-upload-certificate.pem
```

## 下一步

在 Play Console 建立／選擇 App，設定 Play App Signing，將交付 AAB 上傳至內部測試軌道。本次只產生本機上傳包，沒有上傳、送審或發布。

使用者已確認 Android 實機驗收完成；本次簽章與版本號改變後，仍需從 Play 測試軌道安裝驗證。商店版與先前的 debug 測試 APK 簽章不同，不能直接覆蓋安裝；移除舊測試版前先保存未完成的編輯。

目前 RevenueCat 公開金鑰、商店商品、正式條款與隱私政策網址仍未設定，不能把這份上傳包視為已可正式收款的版本。

官方文件：

- https://developer.android.com/studio/publish/app-signing
- https://developer.android.com/tools/bundletool
- https://developer.android.com/guide/practices/page-sizes
