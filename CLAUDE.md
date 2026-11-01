# 掃地工作小幫手

單檔靜態網頁程式（`index.html`，Vue 3 CDN，資料存瀏覽器 localStorage）。功能與開發記錄見 [README.md](README.md) 與 [TODO.md](TODO.md)；版權與授權規則見 TODO.md 的「版權維護規範」，不得移除或改寫版權標示。

## 設計規範（改頁面前必讀）

- 本專案的設計規範在 [docs/design/DESIGN.md](docs/design/DESIGN.md)，定案的模擬頁在 `docs/design/mockups/`。一切頁面、版面、元件、樣式的工作以它為準。
- 新增、改版、調整任何頁面前，先讀它。沿用其中的 tokens 與元件規則，不寫死色碼與間距。
- 新頁面或大改版使用 `設計` 技能（輸入 `/設計`）：先在對話中出設計稿給使用者確認，定案後把規範與模擬頁更新回 `docs/design/`，和程式放在同一個 PR。
- 要偏離規範，先更新 DESIGN.md 並取得使用者確認，不要只改程式。
- 樣式只用 `index.html` 最上方 `<style>` 裡的 tokens 與元件類別；不引入 Tailwind，不用 `oklch()`（html2canvas 無法解析）。

## 發布（GitHub Pages）

- 本站用 GitHub Actions 發布，流程在 `.github/workflows/deploy-pages.yml`，**只上傳白名單內的網站檔案**，`CLAUDE.md`、`TODO.md`、`docs/` 等內部文件不會上線。
- **新增網站會用到的檔案（頁面、圖片、`vendor/` 等）時，必須同步加進該 workflow 的 `Stage site files`**，否則部署會被參照檢查擋下、網站維持舊版。
- 公開網址 `https://derliang.github.io/cleaning-helper/` 不得改變；不得把 Pages 來源改回「從分支發布」。合併後要親自開正式網址驗證。
- 完整規範見 teacher-hub 的 [docs/PUBLISHING.md](https://github.com/derliang/teacher-hub/blob/main/docs/PUBLISHING.md) 第 6 節。
