# 端對端測試

用無頭 Chrome（DevTools Protocol）操作畫面，不需要安裝任何套件，只要 Node 22 以上與 Chrome。

```
node tests/e2e/smoke.test.js
node tests/e2e/layout.test.js
node tests/e2e/functional.test.js
```

- Chrome 不在預設路徑時，設環境變數 CHROME_PATH。
- 測試會連 CDN 載入 Vue 等函式庫，需要網路。
- layout 測試會把各裝置截圖存到系統暫存資料夾的 cleaning-helper-shots。
- 匯出下載被攔截，只檢查檔名，沒有檢查檔案內容。
