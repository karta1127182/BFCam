# App 完成狀態（2026-11-03）

## 已加入程式

| 項目 | 行為 |
|---|---|
| 景物位置分析 | 單次物件框偵測＋區域標籤，主體站位比較左右三分線與中央的重疊程度。無法辨識時明示退回基本建議。 |
| 雙人 | 依兩張臉高低差選並肩或錯落輪廓，風景／建築背景可採三分法，其他推薦也保留雙人種類。 |
| 寵物 | 可信區域標籤區分貓狗，依範圍調整輪廓大小；單人＋主要寵物使用合照輪廓。 |
| 輪廓操作 | 智慧模式鎖定拖曳縮放，畫面顯示實際輪廓名稱，切換種類時重建顯示元件。 |
| 一鍵美顏 | 輕柔／自然／明亮，逐臉套用；五官不足時關閉對應效果，輪廓不足時降低皮膚處理強度，保留復原／重做。 |
| 20 張體驗 | 智慧構圖／美顏共用，成功輸出才計次，同張不重複；有效商店 Pro 不扣體驗張數。 |
| 訂閱入口 | 商店方案、購買、恢復、管理訂閱、優惠碼、退款申請。沒有商品與金鑰時不開放付款。 |
| 到期提醒 | 已驗證試用到期前一天的系統通知排程；權限拒絕則保留 App 內提醒與通知設定入口。Android 可於重開機恢復尚未到期的排程。 |
| iOS 橋接 | 新增偵測與提醒的 Objective-C 匯出，補齊原本 Swift 方法只有宣告但缺少匯出的問題。尚未在 macOS 建置。 |

## 已驗證

- TypeScript 與此次異動檔案 ESLint。
- Jest 全套 19 組、102 項測試及最後新增的輪廓尺寸回歸測試（目前共 103 項）：背景避讓、鏡像、單／雙人與寵物／合照輪廓、輸入邊界、美顏強度、額度與訂閱資格、通知權限與排程取消。
- Android `:app:compileDebugKotlin` 成功，包含物件分析與原生提醒模組。編譯日誌位於 `android/build/reports/composition-build-20261102.log`。
- 使用者於 2026-11-03 確認 Android 實機驗收完成；本機沒有連線裝置，本次未重跑實機驗收。

## 仍需完成或驗收

1. 寵物朝向／注視方向沒有可靠模型，不猜測為已辨識；多人帶多隻寵物尚未提供完整對應輪廓。
2. 背景以最多五個物件框估計，沒有完整深度或像素分割，不能保證避開所有景物。
3. 20 張紀錄在本機，無法可靠防止刪除 App／清除資料後重新試用。必須另有帳號、伺服器紀錄與防濫用策略，不能靠本機旗標宣稱完成。
4. 商店商品、3 天優惠、RevenueCat key、正式條款網址尚待設定；正式上傳簽署與 AAB 已完成，見 ANDROID_RELEASE.md；購買／取消／退款／恢復與通知須做商店沙箱測試。
5. Android 實機驗收已由使用者確認；改用商店簽章的版本仍需在 Play 測試軌道驗證，購買與訂閱通知另待商店沙箱驗收。
6. iOS CocoaPods 與 Xcode build，包含相機辨識、合照顯示、商店與本機通知實測。

## 參考

- https://developers.google.com/ml-kit/vision/object-detection/android
- https://developers.google.com/ml-kit/vision/object-detection/ios
- https://developer.apple.com/documentation/UserNotifications/scheduling-a-notification-locally-from-your-app
- https://support.google.com/googleplay/workflow/9813244

## 測試包

- `artifacts/BFCam-app-test-20261102.apk`，通用 Android 測試包，使用測試簽章，內含程式，不需 Metro。
- 最終 Release 建置成功；APK 簽章、ZIP 完整性、內含程式與最新五個關鍵原始檔比對通過。
- SHA-256：`ccd58bbe6a4e16da3d2a8e8f6f114ed05db2c757630c8fee5dc9781c13812a02`。
- 建置日誌：`android/build/reports/app-completion-final-build.log`。
