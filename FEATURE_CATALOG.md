# BFCam 功能分類與固定編號

建立日期：2026-11-17。這份文件是功能定位與修改範圍的索引；程式與實際驗收結果仍是行為依據。編號只用於文件、問題單與提交紀錄，不顯示在 App 按鈕上。

## 編號規則

- 格式為「分類代碼-三位流水號」，例如 OVL-001。每個編號永久對應同一項功能。
- 新功能在原分類的最大編號後續編，不插號、不因畫面排序重新編號。
- 停用或移除功能保留編號並標記狀態，不把舊編號分給新功能。
- 更名保留編號；移動檔案只更新路徑。跨分類仍保留原編號，可增加交叉參照。
- 拆分功能時保留原項目說明並新增子功能編號；合併時保留舊項目導向主要編號。
- 本表的測試是相關回歸入口，不表示測試完整覆蓋該功能，更不代表手機或商店驗收通過。

## 分類索引

| 分類 | 範圍 |
|---|---|
| CAM | 相機與拍攝 |
| CMP | 構圖與場景推薦 |
| OVL | 輪廓與操作 |
| POS | 姿勢教學與偵測 |
| EDT | 照片編輯 |
| OUT | 輸出與分享 |
| PRO | 體驗與訂閱 |
| SYS | 共用系統 |
| REL | 建置與安裝 |

## CAM — 相機與拍攝

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| CAM-001 | 相機預覽與權限 | [src/components/Camera/CameraPreview.tsx](src/components/Camera/CameraPreview.tsx)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/cameraRecovery.test.tsx](__tests__/cameraRecovery.test.tsx) | 驗證拒絕權限、背景切回與預覽恢復；勿只驗證首次開啟。 |
| CAM-002 | 相機錯誤恢復 | [src/hooks/useCameraRecovery.ts](src/hooks/useCameraRecovery.ts)<br>[src/utils/cameraErrors.ts](src/utils/cameraErrors.ts) | [__tests__/cameraRecovery.test.tsx](__tests__/cameraRecovery.test.tsx)<br>[__tests__/cameraErrors.test.ts](__tests__/cameraErrors.test.ts) | 恢復期間避免重複初始化及過期回呼更新畫面。 |
| CAM-003 | 快門與照片取得 | [src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/cameraRecovery.test.tsx](__tests__/cameraRecovery.test.tsx) | 與智慧構圖、姿勢取樣共用拍攝鎖；需實機驗證連點與忙碌狀態。 |
| CAM-004 | 倍率與超廣角切換 | [src/hooks/useCameraZoom.ts](src/hooks/useCameraZoom.ts)<br>[src/utils/zoom.ts](src/utils/zoom.ts)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/cameraZoom.test.ts](__tests__/cameraZoom.test.ts) | 顯示倍率與裝置倍率不同；鏡頭能力依裝置而異。 |
| CAM-005 | 前後鏡頭與閃光燈 | [src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 切換鏡頭後需重新判定姿勢；檢查裝置是否支援閃光。 |
| CAM-006 | 主畫面工具列與面板 | [src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 輪廓調整須從主畫面直接操作；檢查窄螢幕、安全區與返回鍵。 |
| CAM-007 | 相機偏好保存 | [src/store/cameraPreferences.ts](src/store/cameraPreferences.ts)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/cameraPreferences.test.ts](__tests__/cameraPreferences.test.ts) | 更改資料格式時保留既有資料讀取與預設值。 |
| CAM-008 | 工具面板收合開關 | [src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 主畫面可收合／展開工具列與倍率選擇，收合時關閉已開啟選單；保留快門、閃光、翻轉、構圖輔助與目前設定。依收合後面板高度更新取景區，不持久保存收合狀態；不停止智慧構圖。 |
| CAM-009 | 錄影與即時構圖引導 | [src/components/Camera/VideoControls.tsx](src/components/Camera/VideoControls.tsx)<br>[src/hooks/useVideoRecording.ts](src/hooks/useVideoRecording.ts) | [__tests__/videoRecording.test.tsx](__tests__/videoRecording.test.tsx) | 相機可切至 16:9 錄影，目標為 720p MP4，授權麥克風後可錄音。三分線與人物方向提示可關閉，僅顯示於預覽。停止後存入 BFCam 相簿；儲存失敗可重試同一個檔案。 |

## CMP — 構圖與場景推薦

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| CMP-001 | 拍攝情境預設 | [src/scenarios/index.ts](src/scenarios/index.ts)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/silhouetteCatalog.test.ts](__tests__/silhouetteCatalog.test.ts) | 情境可同時改變模板、輪廓與濾鏡；確認連動範圍。 |
| CMP-002 | 構圖模板與線條顯示 | [src/templates/index.ts](src/templates/index.ts)<br>[src/components/GuideRenderer/GuideRenderer.tsx](src/components/GuideRenderer/GuideRenderer.tsx) | [__tests__/compositionScore.test.ts](__tests__/compositionScore.test.ts) | 現有 17 種模板，新增大景小人、視線留白、倒影構圖、填滿畫面、黃金分割。線條與輪廓分開控制；subjectScale 只縮放手動模板的已選輪廓，智慧偵測尺寸優先。引導線不代表相機已自動辨識或驗證倒影／視線。 |
| CMP-003 | 人物智慧構圖推薦 | [src/utils/compositionRecommender.ts](src/utils/compositionRecommender.ts)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/compositionRecommender.test.ts](__tests__/compositionRecommender.test.ts) | 推薦輪廓不等於動作已到位；前鏡頭須處理鏡像座標。 |
| CMP-004 | 景物與背景分析 | [src/utils/sceneComposition.ts](src/utils/sceneComposition.ts)<br>[src/utils/geometryComposition.ts](src/utils/geometryComposition.ts) | [__tests__/sceneComposition.test.ts](__tests__/sceneComposition.test.ts)<br>[__tests__/geometryComposition.test.ts](__tests__/geometryComposition.test.ts) | 無人物時優先以 CMP-011 主線條分析推薦；標籤只作退回建議，並非完整深度或像素分割。 |
| CMP-005 | 寵物與人物合照推薦 | [src/utils/subjectComposition.ts](src/utils/subjectComposition.ts) | [__tests__/subjectComposition.test.ts](__tests__/subjectComposition.test.ts) | 辨識不足時保留退回提示，不宣稱可靠辨識寵物朝向。 |
| CMP-006 | 美食構圖 | [src/components/FoodComposition/FoodCompositionPicker.tsx](src/components/FoodComposition/FoodCompositionPicker.tsx)<br>[src/utils/foodComposition.ts](src/utils/foodComposition.ts)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/foodComposition.test.ts](__tests__/foodComposition.test.ts) | 套用美食擺盤後，自動模式用裝置重力與鏡頭朝向判斷俯拍、斜拍、平拍；姿態不可用時使用俯拍，可手動選角度。縮圖與取景疊圖採相同投影，保留餐具前後順序，斜拍和平拍以杯底對齊桌面。實機驗收需涵蓋前後鏡頭、角度切換與切回人物輪廓。 |
| CMP-007 | 構圖評分與提示 | [src/utils/compositionScore.ts](src/utils/compositionScore.ts)<br>[src/components/CompositionScoreBadge/CompositionScoreBadge.tsx](src/components/CompositionScoreBadge/CompositionScoreBadge.tsx)<br>[src/components/SmartCompositionHint/SmartCompositionHint.tsx](src/components/SmartCompositionHint/SmartCompositionHint.tsx) | [__tests__/compositionScore.test.ts](__tests__/compositionScore.test.ts) | 構圖分數不代表姿勢匹配程度；左右上下提示需驗證座標方向。 |
| CMP-008 | 智慧構圖狀態與清除 | [src/utils/smartCompositionState.ts](src/utils/smartCompositionState.ts)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/smartCompositionState.test.ts](__tests__/smartCompositionState.test.ts) | 清除、切鏡頭與新請求須使舊偵測結果失效。 |
| CMP-009 | 構圖分類瀏覽 | [src/templates/categories.ts](src/templates/categories.ts)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/compositionCategories.test.ts](__tests__/compositionCategories.test.ts)<br>[__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 全部、人像、旅遊風景、街拍、建築、美食、特寫商品；同一模板可跨分類。篩選只改變列表，不更改已套用模板；點選保留原陣列索引以避免套錯。 |
| CMP-010 | 人體骨架形狀構圖 | [src/utils/geometryComposition.ts](src/utils/geometryComposition.ts)<br>[src/utils/subjectComposition.ts](src/utils/subjectComposition.ts) | [__tests__/geometryComposition.test.ts](__tests__/geometryComposition.test.ts)<br>[__tests__/subjectComposition.test.ts](__tests__/subjectComposition.test.ts) | 人物優先：依高信心關節判斷傾斜、單側伸手、三角支撐、坐姿或直立；前鏡頭依顯示方向留白。單人不再隨機挑選與動作無關的參考輪廓。骨架不足或多人退回置中，並非逐姿勢精確匹配。 |
| CMP-011 | 背景主要線條構圖 | [src/utils/geometryComposition.ts](src/utils/geometryComposition.ts)<br>[src/utils/poseDetection.ts](src/utils/poseDetection.ts)<br>[android/app/src/main/java/com/bfcam/PoseDetectionModule.kt](android/app/src/main/java/com/bfcam/PoseDetectionModule.kt)<br>[ios/BFCam/PoseDetectorModule.swift](ios/BFCam/PoseDetectorModule.swift) | [__tests__/geometryComposition.test.ts](__tests__/geometryComposition.test.ts) | Android／iOS 提供正向、最長邊 128px 灰階圖；共用 Sobel／Hough 分析長線、匯聚與近似框架／對稱。有人時不以背景覆蓋骨架建議。線條建議只顯示模板參考線，不顯示人物輪廓；模板為固定參考，非逐條描繪偵測線。無可靠線條則退回場景／置中，不宣稱辨識門窗、地平線或真正對稱。 |
| CMP-012 | 實際主體輪廓與骨架 | [src/utils/smartSubjectGeometry.ts](src/utils/smartSubjectGeometry.ts)<br>[src/components/PoseDetectionOverlay/PoseDetectionOverlay.tsx](src/components/PoseDetectionOverlay/PoseDetectionOverlay.tsx) | [__tests__/smartSubjectGeometry.test.ts](__tests__/smartSubjectGeometry.test.ts) | 智慧構圖使用實際關節或物件範圍內的灰階像素邊界。邊界不足時保留構圖參考線。疊圖依預覽裁切與前鏡頭鏡像顯示，取樣後移動主體或鏡頭需重新分析。 |
| CMP-013 | 主體追蹤與構圖穩定判定 | [src/utils/liveComposition.ts](src/utils/liveComposition.ts)<br>[src/utils/sceneComposition.ts](src/utils/sceneComposition.ts)<br>[src/utils/subjectComposition.ts](src/utils/subjectComposition.ts) | [__tests__/liveComposition.test.ts](__tests__/liveComposition.test.ts)<br>[__tests__/sceneComposition.test.ts](__tests__/sceneComposition.test.ts) | 以追蹤 ID 或距離延續主要人臉，平滑位置與尺寸，並以連續穩定樣本和提示一致性決定更新。場景標籤過於接近時視為不確定，全圖辨識不足時可參考高信心的主要物件標籤。 |

## OVL — 輪廓與操作

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| OVL-001 | 輪廓調整入口與鎖定 | [src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 主畫面直接顯示「調整輪廓／完成調整」；開始調整時收合面板。 |
| OVL-002 | 輪廓拖曳與雙指縮放 | [src/components/CompositionOverlay/CompositionOverlay.tsx](src/components/CompositionOverlay/CompositionOverlay.tsx) | [__tests__/posePlacement.test.ts](__tests__/posePlacement.test.ts) | 僅供相關位置算法回歸；手勢需實機驗證，鎖定時不可拖曳縮放。 |
| OVL-003 | 輪廓旋轉與重設 | [src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx)<br>[__tests__/posePlacement.test.ts](__tests__/posePlacement.test.ts) | 調整中直接顯示左轉、右轉及重設；重設須同步顯示狀態。 |
| OVL-004 | 輪廓分類、選擇與素材 | [src/silhouettes/catalog.ts](src/silhouettes/catalog.ts)<br>[src/silhouettes/referencePoses.ts](src/silhouettes/referencePoses.ts)<br>[src/components/Silhouette/Silhouette.tsx](src/components/Silhouette/Silhouette.tsx) | [__tests__/silhouetteCatalog.test.ts](__tests__/silhouetteCatalog.test.ts)<br>[__tests__/humanOutline.test.ts](__tests__/humanOutline.test.ts) | 素材 ID 可能用於保存狀態，勿因改名重建或重用 ID。 |
| OVL-005 | 輪廓透明度、顯示及跟隨倍率 | [src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx)<br>[src/components/CompositionOverlay/CompositionOverlay.tsx](src/components/CompositionOverlay/CompositionOverlay.tsx) | [__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 相關元件回歸不能取代透明度與跟隨倍率的實機驗收。 |
| OVL-006 | 新輪廓初始位置 | [src/utils/posePlacement.ts](src/utils/posePlacement.ts) | [__tests__/posePlacement.test.ts](__tests__/posePlacement.test.ts) | 切換姿勢需重建位置，避免沿用上一個姿勢的高度與中心。 |
| OVL-007 | 姿勢場景交叉篩選 | [src/silhouettes/poseScenes.ts](src/silhouettes/poseScenes.ts)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/poseScenes.test.ts](__tests__/poseScenes.test.ts)<br>[__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 街拍旅遊、咖啡廳、室內居家、職場形象、海邊泳池、自拍對鏡、情侶約會可與人物分類及姿態交叉篩選；屬姿勢資料的適用場景建議，不是相機自動辨識場景。篩選不改變目前已套用姿勢；切換大分類清除場景與姿態條件，避免隱藏條件。 |

## POS — 姿勢教學與偵測

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| POS-001 | 分步姿勢教學 | [src/components/PoseCoaching/PoseCoaching.tsx](src/components/PoseCoaching/PoseCoaching.tsx)<br>[src/utils/poseCoaching.ts](src/utils/poseCoaching.ts) | [__tests__/poseCoaching.test.tsx](__tests__/poseCoaching.test.tsx) | 切換或重新選擇姿勢須重設；看完教學不代表偵測成功。 |
| POS-002 | 基本動作自動判定 | [src/utils/poseReadiness.ts](src/utils/poseReadiness.ts)<br>[src/components/PoseCoaching/PoseCoaching.tsx](src/components/PoseCoaching/PoseCoaching.tsx)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/poseReadiness.test.ts](__tests__/poseReadiness.test.ts)<br>[__tests__/poseCoaching.test.tsx](__tests__/poseCoaching.test.tsx) | 使用者開啟後定期取樣，連續兩次通過才提示基本動作到位；尚待實機準確度驗收。多人、坐姿、對鏡拍及其他不支援動作須自行確認，不是完整輪廓相似度比對。 |
| POS-003 | 原生關節、標籤與物件辨識 | [src/utils/poseDetection.ts](src/utils/poseDetection.ts)<br>[android/app/src/main/java/com/bfcam/PoseDetectionModule.kt](android/app/src/main/java/com/bfcam/PoseDetectionModule.kt)<br>[ios/BFCam/PoseDetectorModule.swift](ios/BFCam/PoseDetectorModule.swift) | [__tests__/poseDetection.test.ts](__tests__/poseDetection.test.ts) | 正規化與可信度篩選在 JS；原生依賴異動須重建 App，iOS 須另做 Xcode 驗證。 |
| POS-004 | 姿勢教學收合與展開 | [src/components/PoseCoaching/PoseCoaching.tsx](src/components/PoseCoaching/PoseCoaching.tsx) | [__tests__/poseCoaching.test.tsx](__tests__/poseCoaching.test.tsx) | 教學右上角可收合成預覽右下方的 48px 人形圖示，點圖示展開。收合不重設步驟或中止已開啟的判定；判定中有狀態點。切換姿勢或鏡頭仍依既有 key 重設並展開教學。 |

## EDT — 照片編輯

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| EDT-001 | 編輯器分頁與互動 | [src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/App.test.tsx](__tests__/App.test.tsx) | 入口為拍照後的編輯頁；與 OVL-001 的輪廓調整不同。 |
| EDT-002 | 濾鏡與強度 | [src/filters/index.ts](src/filters/index.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx)<br>[src/components/CameraControls/CameraControls.tsx](src/components/CameraControls/CameraControls.tsx) | [__tests__/filters.test.ts](__tests__/filters.test.ts)<br>[__tests__/cameraControls.test.tsx](__tests__/cameraControls.test.tsx) | 同時存在相機預覽與拍後編輯入口，兩者皆需確認。 |
| EDT-003 | 照片色彩參數調整 | [src/filters/index.ts](src/filters/index.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/filters.test.ts](__tests__/filters.test.ts) | 此處「調整」是照片參數，不是相機主畫面的輪廓調整。 |
| EDT-004 | 裁切與幾何變換 | [src/filters/index.ts](src/filters/index.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/filters.test.ts](__tests__/filters.test.ts)<br>[__tests__/editorViewport.test.ts](__tests__/editorViewport.test.ts) | 輸出幾何與畫面預覽須一致。 |
| EDT-005 | 一鍵美顏 | [src/utils/oneTapBeauty.ts](src/utils/oneTapBeauty.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/oneTapBeauty.test.ts](__tests__/oneTapBeauty.test.ts) | 檢查多人套用、偵測不足與強度預設，輸出資格另見 PRO。 |
| EDT-006 | 磨皮與膚色處理 | [src/filters/skinSmoothing.ts](src/filters/skinSmoothing.ts)<br>[src/filters/skinSmoothingModel.ts](src/filters/skinSmoothingModel.ts) | [__tests__/manualRetouch.test.ts](__tests__/manualRetouch.test.ts) | 保留皮膚細節；遮罩與實際畫質須用照片驗收。 |
| EDT-007 | 五官與臉型調整 | [src/filters/faceReshape.ts](src/filters/faceReshape.ts)<br>[src/filters/faceReshapeModel.ts](src/filters/faceReshapeModel.ts) | [__tests__/faceReshapeModel.test.ts](__tests__/faceReshapeModel.test.ts) | 缺少關鍵點時不能強行套用變形。 |
| EDT-008 | 黑眼圈與局部修飾 | [src/filters/manualRetouch.ts](src/filters/manualRetouch.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/darkCircle.test.ts](__tests__/darkCircle.test.ts)<br>[__tests__/manualRetouch.test.ts](__tests__/manualRetouch.test.ts) | 檢查羽化邊界、皮膚紋理與原始解析度。 |
| EDT-009 | 手動筆刷與局部變形 | [src/filters/manualRetouch.ts](src/filters/manualRetouch.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/manualRetouch.test.ts](__tests__/manualRetouch.test.ts) | 確認縮放後筆刷座標、筆畫上限及復原／重做。 |
| EDT-010 | 編輯畫面縮放與平移 | [src/utils/editorViewport.ts](src/utils/editorViewport.ts)<br>[src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/editorViewport.test.ts](__tests__/editorViewport.test.ts) | 顯示用變換不應意外改變照片輸出。 |
| EDT-011 | 復原、重做與重設 | [src/screens/EditorScreen/EditorScreen.tsx](src/screens/EditorScreen/EditorScreen.tsx) | [__tests__/App.test.tsx](__tests__/App.test.tsx) | 僅有應用程式基礎回歸；完整操作序列需另行驗收。 |

## OUT — 輸出與分享

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| OUT-001 | 輸出渲染與照片儲存 | [src/filters/saveFilteredPhoto.ts](src/filters/saveFilteredPhoto.ts)<br>[src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/filters.test.ts](__tests__/filters.test.ts) | 相關算法測試不涵蓋相簿寫入；確認輸出品質、權限與成功後計次。 |
| OUT-002 | 系統分享 | [src/screens/CameraScreen/CameraScreen.tsx](src/screens/CameraScreen/CameraScreen.tsx) | [__tests__/App.test.tsx](__tests__/App.test.tsx) | 需實機驗證分享成功、取消與失敗，避免取消後誤扣額度。 |

## PRO — 體驗與訂閱

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| PRO-001 | 體驗額度與輸出計次 | [src/hooks/usePremiumTrial.ts](src/hooks/usePremiumTrial.ts)<br>[src/store/premiumTrial.ts](src/store/premiumTrial.ts) | [__tests__/premiumTrial.test.ts](__tests__/premiumTrial.test.ts)<br>[__tests__/premiumTrialHook.test.tsx](__tests__/premiumTrialHook.test.tsx) | 成功輸出才計次，同張避免重複計次；本機資料不提供可靠防重裝濫用。 |
| PRO-002 | 方案、購買與恢復 | [src/hooks/useStoreBilling.ts](src/hooks/useStoreBilling.ts)<br>[src/services/billing.ts](src/services/billing.ts)<br>[src/config/billing.ts](src/config/billing.ts)<br>[src/components/PremiumTrialPanel.tsx](src/components/PremiumTrialPanel.tsx) | [__tests__/billing.test.ts](__tests__/billing.test.ts) | 商店設定與資格由實際設定決定；單元測試不代表商店購買驗收。 |
| PRO-003 | 體驗提醒與通知 | [src/services/trialNotifications.ts](src/services/trialNotifications.ts)<br>[src/utils/trialReminder.ts](src/utils/trialReminder.ts)<br>[android/app/src/main/java/com/bfcam/TrialReminderModule.kt](android/app/src/main/java/com/bfcam/TrialReminderModule.kt)<br>[ios/BFCam/TrialReminderModule.swift](ios/BFCam/TrialReminderModule.swift) | [__tests__/trialNotifications.test.ts](__tests__/trialNotifications.test.ts) | 確認通知權限、排程取消與平台差異。 |
| PRO-004 | 測試存取與版本資格 | [src/store/testingAccess.ts](src/store/testingAccess.ts)<br>[android/app/build.gradle](android/app/build.gradle) | [__tests__/premiumTrial.test.ts](__tests__/premiumTrial.test.ts) | 依現行程式與建置類型確認，不從舊文件推斷；不可在功能文件記錄私人代碼或金鑰。 |

## SYS — 共用系統

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| SYS-001 | 多語系與文字元件 | [src/i18n/index.ts](src/i18n/index.ts)<br>[src/i18n/components.tsx](src/i18n/components.tsx)<br>[src/i18n/translations.json](src/i18n/translations.json) | [__tests__/i18n.test.ts](__tests__/i18n.test.ts)<br>[__tests__/i18nComponents.test.tsx](__tests__/i18nComponents.test.tsx) | 新增可見文字與無障礙標籤時檢查翻譯及長文字排版。 |
| SYS-002 | 主題與共用視覺 | [src/theme.ts](src/theme.ts) | [__tests__/App.test.tsx](__tests__/App.test.tsx) | 主題影響相機、面板、編輯器及付費入口，須檢查可讀性。 |

## REL — 建置與安裝

| 功能編號 | 功能名稱 | 主要程式位置 | 相關驗證入口 | 修改注意事項與限制 |
|---|---|---|---|---|
| REL-001 | Android APK 建置 | [android/app/build.gradle](android/app/build.gradle)<br>[ANDROID_RELEASE.md](ANDROID_RELEASE.md) | [scripts/verify-r8-release.py](scripts/verify-r8-release.py) | assembleRelease 產包；installRelease 另外需要在線裝置。單純存在舊 APK 不代表包含最新修改。 |
| REL-002 | Google Play AAB 與版本 | [android/app/build.gradle](android/app/build.gradle)<br>[PLAY_CONSOLE_SETUP.md](PLAY_CONSOLE_SETUP.md) | [scripts/VerifyAndroidBundle.java](scripts/VerifyAndroidBundle.java) | 上傳新版本需增加 versionCode；產包與上傳／送審是不同狀態。 |
| REL-003 | 簽章與安裝相容性 | [android/app/build.gradle](android/app/build.gradle)<br>[ANDROID_RELEASE.md](ANDROID_RELEASE.md) | [scripts/verify-r8-release.py](scripts/verify-r8-release.py) | Debug、本機 Release 與 Play 版可能簽章不同；不要擅自換金鑰或解除安裝清資料。 |

## 容易混淆的名稱

| 使用者說法 | 對應編號 | 如何辨別 |
|---|---|---|
| 相機主畫面的「調整輪廓」 | OVL-001 | 進入或完成輪廓編輯。 |
| 輪廓移動、大小 | OVL-002 | 拖曳、雙指縮放。 |
| 輪廓左轉、右轉、重設 | OVL-003 | 輪廓幾何操作。 |
| 修圖頁面的「調整」 | EDT-003 | 修改照片色彩參數。 |
| 智慧構圖 | CMP-003～CMP-008、CMP-010～CMP-013、CAM-009 | 依骨架形狀或背景主要線條推薦。拍照疊圖使用偵測到的關節或像素邊界，錄影顯示簡化參考線與穩定的人物方向提示。 |
| 姿勢提示 | POS-001／POS-002 | 分清分步教學與根據關節自動提示。 |

## 修改紀錄格式

每次修改先確認功能編號及共享程式，再記錄下列項目。以下為可複製的空白範本，不是已完成的修改。

~~~text
日期：YYYY-MM-DD
主要功能編號：
相關功能編號：
需求／問題：
修改後行為：
涉及檔案：
相依功能與影響範圍：
驗證指令及結果：
實機／平台／商店驗收：未測／通過／失敗（附裝置及情境）
APK／AAB：未建置／已建置（附版本、產出時間及檔名）
已知限制：
Git commit：（提交後再填寫）
~~~

## 本次已知變更索引

| 日期 | 功能編號 | 變更 | 驗證／交付狀態 |
|---|---|---|---|
| 2026-11-23 | REL-001～REL-003；相關 CMP-006、CMP-012、CMP-013、CAM-009 | Android 升為 1.1.3（13）並用既有上傳金鑰產包。 | 程式檢查：TypeScript、ESLint、204 項測試通過。Pixel 8 模擬器：三種美食角度、智慧構圖退回與錄影存檔通過。Android／iOS 實機：尚未驗收。APK／AAB：正式 1.1.3 檔案已產出且通過版本及簽章驗證，詳見 ANDROID_RELEASE.md。 |
| 2026-11-23 | CMP-013、CAM-009；相關 CAM-001～CAM-003、CAM-005、CAM-006、CMP-003、CMP-004、CMP-007、CMP-008、SYS-001 | 改善場景標籤判定、新增共用的主體追蹤與提示穩定判定，加入可錄音、可開關三分線與方向提示的錄影模式。 | 程式檢查：TypeScript、相關 ESLint 與 36 組共 204 項測試通過。Pixel 8 模擬器：錄影途中關閉引導，停止後成功儲存 11.5 秒的 720p MP4，確認含視訊、音訊軌，並切回拍照。實機驗收：尚未完成。APK／AAB：已產出獨立 x86_64 debug APK，未產出正式 APK／AAB。 |
| 2026-11-23 | CMP-012；相關 CMP-003～CMP-005、CMP-008、CMP-010、CMP-011、OVL-004、SYS-001 | 智慧構圖改為繪製偵測骨架與灰階前景像素邊界，並保留手動選擇輪廓的入口。快照套用裁切與鏡像；相機或主體移動後需重新分析。 | 程式檢查包含物件邊界、低對比退回與狀態清除。Pixel 8 模擬器：室內場景退回對角線，畫面無預設人物輪廓。實機驗收：尚未完成。APK／AAB：已包含於 x86_64 debug APK。 |
| 2026-11-23 | CMP-006；相關 CAM-006、SYS-001 | 新增 Android／iOS 重力取樣與自動拍攝角度，保留手動角度；統一擺盤縮圖與取景疊圖的餐具投影和前後順序。美食擺盤仍依所選餐具數量和排列繪製。 | 程式檢查：TypeScript、相關 ESLint、33 組共 195 項測試通過。原生編譯與實機驗收：尚未完成。APK／AAB：未產出。 |
| 2026-11-18 | CAM-008；相關 CAM-006、CAM-003、OVL-001、SYS-001 | 新增主畫面工具面板收合／展開按鈕，收合時關閉選單並隱藏工具列、輪廓調整列與倍率選擇；保留快門、閃光、翻轉、構圖輔助及目前選擇，依面板高度調整取景區。補上英日韓文字。 | 程式檢查：TypeScript、相關 ESLint、相機控制／恢復／多語系 3 組共 25 項測試通過。實機驗收：尚未進行 Android／iOS 窄螢幕、安全區與取景裁切確認。APK／AAB：未重新產出。Git commit：未提交。 |
| 2026-11-18 | CMP-010、CMP-011；相關 CMP-003、CMP-004、CMP-005、CMP-008、CMP-009、SYS-001 | 智慧構圖改為有人依骨架形狀、無人依主要線條推薦；加入 Android／iOS 灰階取樣橋接。單人取消隨機參考姿勢；線條推薦隱藏輪廓，保留基本退回。補上三語文案與既有 17 模板清單回歸。 | 程式檢查：TypeScript、相關 ESLint、33 組共 193 項測試通過。Android 原生編譯：Gradle 快取鎖檔存取遭拒，未通過；iOS 原生編譯與兩平台實機辨識／效能／鏡像／EXIF 驗收未完成。APK／AAB：未產出。線條為低解析幾何估計，需實拍調整門檻；參考線是既有固定模板。Git commit：未提交。 |
| 2026-11-17 | POS-002、POS-001、CAM-003 | 接上定期姿勢取樣與基本動作判定，連續兩次通過才提示到位；切換姿勢或前後鏡頭重設。 | 此功能加入時 TypeScript、相關 ESLint 及全套 177 項測試通過；尚未完成這項功能的手機準確度驗收。 |
| 2026-11-17 | OVL-001、OVL-003、CAM-006 | 將輪廓調整移到相機主畫面，調整中直接提供旋轉與重設。 | 相機控制操作測試、相關 ESLint、TypeScript 通過；先前交付的 APK 早於這次修改，不能視為已包含。 |
| 2026-11-17 | OVL-007、OVL-004、CAM-006、SYS-001 | 新增場景標籤、交叉篩選、各場景結果數、清除篩選與無結果提示；人物分類預設改為全部姿態。 | 場景資料與交叉篩選測試、控制面板操作測試、多語系回歸、TypeScript 及相關 ESLint；手機操作驗收與新版 APK 尚待完成。 |
| 2026-11-17 | CMP-009、CMP-002、CAM-006、SYS-001 | 新增六種構圖用途分類及全部入口，將原 12 種擴充至 17 種；保留既有模板 ID、排序與偏好設定。 | 5 組相關測試共 32 項通過；相關 ESLint 通過，TypeScript 檢查完成；尚未完成 Android／iOS 實機驗收或重新產包。 |
| 2026-11-17 | POS-004、POS-001、POS-002、SYS-001 | 姿勢教學可收合為小圖示，保留步驟及判定狀態；補上展開、收合與無障礙文字的翻譯。 | 姿勢教學與多語系共 17 項測試通過，相關 ESLint 與 TypeScript 通過；尚未完成 Android／iOS 手機驗收或重新產包。 |
| 2026-11-17 | REL-002、REL-001 | Android 版本改為 versionName 1.1.0、versionCode 11，Release 與 ClosedTesting 共用。 | 已核對原始碼設定；尚未重新建置 APK／AAB、安裝或上傳。 |
| 2026-11-17 | 全部分類 | 建立固定功能編號、程式與相關測試對應、變更紀錄格式。 | 僅文件與維護說明；檢查編號唯一性與連結目標存在。 |

## 維護原則

1. 使用者指定編號時，先讀這一列及實際程式，避免只靠名稱或過往對話定位。
2. 共用畫面如 CameraScreen、CameraControls、EditorScreen 同時負責多項功能；修改其中一項不表示可以順便改其他項。
3. 優先執行表內與變更相關的測試；沒有專項測試時明確記錄驗證方式與未覆蓋範圍。
4. 修改功能行為、檔案位置或支援範圍後，同步更新本表及相關文件。
5. 將程式完成、單元測試、實機驗收、產包、安裝、上傳及送審分別記錄，不能互相代替。
6. 固定編號有助於避免修改錯項，但不能取代程式審查與測試。
