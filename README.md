# 🧹 掃地工作小幫手 (Cleaning Task Helper)

「掃地工作小幫手」是一款專為班級、辦公室、團隊設計的**單頁式 Web 應用程式 (Single-Page App)**。支援靈活的人員管理、工作需求人數設定、動態抽籤特效、避重複機制、LINE 排班文字導出與圖片下載功能。

無需任何伺服器後端或資料庫，所有資料皆完全儲存於您的瀏覽器本機 (LocalStorage) 中，極度重視隱私與個人資訊安全。非常適合直接部署至 **GitHub Pages** 免費靜態託管服務！

---

## 🌟 核心特色

- **🎲 趣味動態抽籤**：具備洗牌滾動動畫與抽籤完畢後的慶祝彩帶特效 (Canvas Confetti)。
- **👥 靈活人員管理**：支援批次複製貼上名單、一鍵切換請假/出席狀態、全選/全取消出席。
- **🧹 工作項目自訂**：預設學校/辦公室常見掃地區域，可自訂每項工作所需人數與備註。
- **⚖️ 智慧人力比對**：即時顯示出席人數與工作總需求人數比對（人數符合 / 多出輪空 / 缺額提示）。
- **📋 導出與分享**：
  - 一鍵複製格式化排班文字（方便直接發送到 LINE / Slack 群組）。
  - 一鍵生成並下載分配結果圖片 (PNG)。
- **⚡ 避重複機制 & 📜 歷史紀錄**：記錄歷次抽籤結果，可優先讓前次未負責該項目的人員擔當。
- **💾 備份與還原**：支援 JSON 格式的完整設定與歷史紀錄匯出/匯入。

---

## 🚀 GitHub Pages 部署教學步驟

只需簡單 3 步驟，即可將本系統公開至網際網路：

### 步驟 1：建立 GitHub 儲存庫 (Repository)
1. 登入您的 [GitHub 帳號](https://github.com/)。
2. 點選右上角的 **「+」** &gt; **「New repository」**。
3. Repository name 輸入：`cleaning-helper` (或任意名稱)。
4. 將權限設定為 **Public**，點擊 **Create repository**。

### 步驟 2：上傳專案檔案
1. 在剛建立好的 Repository 頁面中，點擊 **「uploading an existing file」**。
2. 將本專案中的 `index.html` 與 `README.md` 拖曳上傳。
3. 點擊頁面下方的 **Commit changes** 儲存檔案至主分支 (`main`)。

### 步驟 3：開啟 GitHub Pages 服務
1. 進入 Repository 的 **Settings** (設定) 頁籤。
2. 在左側選單點選 **Pages**。
3. 在 **Build and deployment** &gt; **Source** 選擇 **Deploy from a branch**。
4. Branch 選擇 `main` / `/(root)`，點擊 **Save**。
5. 稍等約 1~2 分鐘重新整理頁面，您將會在頂部看到專案專屬網址：
   `https://<your-github-username>.github.io/cleaning-helper/`

---

## 🛠️ 技術架構

- **前端框架**：[Vue 3](https://vuejs.org/) (via CDN SFC / Global Build)
- **UI 樣式**：[Tailwind CSS](https://tailwindcss.com/) (via CDN)
- **特效元件**：[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **圖片匯出**：[html2canvas](https://html2canvas.hertzen.com/)
- **資料儲存**：Browser LocalStorage API

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 開源授權，歡迎自由修改與分享！
