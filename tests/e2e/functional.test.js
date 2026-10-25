// 功能測試：抽籤、工作與名單的增修刪、復原、指派、歷史、匯出、備份。
const path = require('path');
const { launch, startStaticServer, sleep } = require('./cdp');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL', m); } };
(async () => {
  const server = await startStaticServer(path.resolve(__dirname, '../..'), 18768);
  const b = await launch({ url: 'http://127.0.0.1:18768/index.html', width: 1280, height: 900, port: 9666 });
  const $$ = (sel) => b.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => b.eval(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => e.textContent.replace(/\\s+/g, ' ').trim())`);
  const click = async (sel, n = 0) => { await b.eval(`document.querySelectorAll(${JSON.stringify(sel)})[${n}].click(); 1`); await sleep(150); };
  const clickText = async (sel, t) => { const r = await b.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.includes(${JSON.stringify(t)}) && e.offsetParent); if (!el) return false; el.click(); return true; })()`); await sleep(150); return r; };
  const setVal = async (sel, v) => { await b.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(100); };
  const tab = async (i) => { await click('.sidebar .nav-item', i); await sleep(150); };
  try {
    await b.eval(`window.confirm = () => true; window.__dl = []; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); else oc.call(this); }; 1`);
    const initTasks = await $$('.roster .rrow');
    ok(initTasks > 0, `預設工作 ${initTasks} 項`);

    // 設定：無動畫
    await tab(4);
    await setVal('#s-anim', 'none');
    await tab(0);

    // 抽全部
    await clickText('.action-btns .btn-primary', '抽全部');
    for (let i = 0; i < 40; i++) { await sleep(500); if (!(await b.eval("document.querySelector('.action-btns .btn-primary').disabled"))) break; }
    const filled = await $$('.roster .tag:not(.tag-empty)');
    const required = await b.eval("[...document.querySelectorAll('.rrow-meta > span:last-child')].reduce((s, e) => s + (parseInt(e.textContent) || 0), 0)");
    ok(filled === required, `抽全部後每個缺額都有人（${filled}/${required}）`);
    const names = await text('.roster .tag:not(.tag-empty) > span');
    ok(new Set(names).size === names.length, '沒有同一個人被抽到兩次');
    ok((await text('.results-title .chip'))[0].includes('抽籤完成'), '狀態顯示抽籤完成');
    await tab(3);
    ok((await $$('.hitem')) === 1, '歷史記錄新增 1 筆');
    await click('.hhead');
    ok(await b.eval("!!document.querySelector('.hbody')?.offsetParent"), '展開歷史詳情');
    // 匯出（歷史）
    await tab(0);

    // 清除 → 抽一人
    await click('.action-btns .btn-danger');
    ok((await $$('.roster .tag:not(.tag-empty)')) === 0, '按 🗑️ 清除結果');
    await clickText('.action-btns .btn', '抽一人');
    await sleep(800);
    ok((await $$('.roster .tag:not(.tag-empty)')) === 1, '抽一人只抽出 1 位');
    // 卡片 🗑️ 清空
    const trash = await b.eval("[...document.querySelectorAll('.rrow .btn-danger')].findIndex(e => !e.disabled)");
    ok(trash >= 0, '有人的卡片上 🗑️ 可按');
    await click('.rrow .btn-danger', trash);
    ok((await $$('.roster .tag:not(.tag-empty)')) === 0, '卡片 🗑️ 清空該工作人員');

    // 匯出
    await clickText('.export .btn', 'PNG'); await sleep(3500);
    await b.eval('window.jspdf.jsPDF.API.save = function (n) { window.__dl.push(n); }; 1'); await clickText('.export .btn', 'PDF'); await sleep(3500);
    await clickText('.export .btn', 'Excel'); await sleep(1500);
    await clickText('.export .btn', 'Word'); await sleep(1500);
    const dl = await b.eval('window.__dl');
    ok(dl.some((n) => n.endsWith('.png')), 'PNG 匯出成功：' + dl.filter((n) => n.endsWith('.png')));
    ok(dl.some((n) => n.endsWith('.pdf')), 'PDF 匯出成功');
    ok(dl.some((n) => n.endsWith('.xlsx')), 'Excel 匯出成功');
    ok(dl.some((n) => n.endsWith('.doc')), 'Word 匯出成功');
    ok((await b.eval("document.querySelectorAll('style').length")) === 1, '匯出完成後暫時樣式已移除');
    await click('.sidebar .side-foot .btn'); await sleep(300);
    ok((await b.eval('window.__dl')).some((n) => /\.json$/.test(n)), '備份 JSON 下載');

    // 工作項目頁
    await tab(2);
    const before = await $$('.trow');
    await setVal('#t-name', '測試用工作');
    await setVal('#t-count', '3');
    await clickText('.fold-body .btn-primary', '增加掃地工作項目');
    await sleep(300);
    const afterAdd = await text('.trow .t-name');
    // 新增的工作可能在別的分類，切到全部可見分類找
    const cats = await $$('.cat-tile');
    let found = afterAdd.some((t) => t.includes('測試用工作'));
    for (let i = 0; i < cats && !found; i++) { await click('.cat-tile', i); found = (await text('.trow .t-name')).some((t) => t.includes('測試用工作')); }
    ok(found, '新增工作「測試用工作」');
    // 步進
    const rowIdx = await b.eval("[...document.querySelectorAll('.trow')].findIndex(r => r.textContent.includes('測試用工作'))");
    const cnt0 = await b.eval(`document.querySelectorAll('.trow')[${rowIdx}].querySelector('output').textContent`);
    await b.eval(`document.querySelectorAll('.trow')[${rowIdx}].querySelectorAll('.stepper button')[1].click(); 1`); await sleep(150);
    const cnt1 = await b.eval(`document.querySelectorAll('.trow')[${rowIdx}].querySelector('output').textContent`);
    ok(cnt0 === '3 人' && cnt1 === '4 人', `＋人數 ${cnt0} → ${cnt1}`);
    // 復原
    ok(await b.eval("[...document.querySelectorAll('.head-actions .btn')].some(e => e.textContent.includes('復原') && !e.disabled)"), '復原鈕可按');
    await clickText('.head-actions .btn', '復原');
    const rowIdx2 = await b.eval("[...document.querySelectorAll('.trow')].findIndex(r => r.textContent.includes('測試用工作'))");
    ok((await b.eval(`document.querySelectorAll('.trow')[${rowIdx2}].querySelector('output').textContent`)) === '3 人', '復原人數回到 3 人');
    // 辛苦
    await b.eval(`document.querySelectorAll('.trow')[${rowIdx2}].querySelector('.heavy-btn').click(); 1`); await sleep(150);
    ok((await b.eval(`document.querySelectorAll('.trow')[${rowIdx2}].querySelector('.heavy-btn').getAttribute('aria-pressed')`)) === 'true', '辛苦標記切換');
    // 編輯彈窗
    await b.eval(`document.querySelectorAll('.trow')[${rowIdx2}].querySelector('.t-acts .btn').click(); 1`); await sleep(250);
    ok((await $$('.scrim .modal')) === 1, '編輯彈窗開啟');
    await setVal('#e-name', '測試改名');
    await clickText('.modal .btn-primary', '儲存變更'); await sleep(250);
    ok((await $$('.scrim')) === 0, '儲存後彈窗關閉');
    ok((await text('.trow .t-name')).some((t) => t.includes('測試改名')), '工作改名成功');
    // 指派彈窗
    const rowIdx3 = await b.eval("[...document.querySelectorAll('.trow')].findIndex(r => r.textContent.includes('測試改名'))");
    await b.eval(`document.querySelectorAll('.trow')[${rowIdx3}].querySelectorAll('.t-acts .btn')[1].click(); 1`); await sleep(250);
    ok((await $$('.scrim .pick-grid .pickrow')) > 0, '指派人員彈窗列出同學');
    await click('.scrim .pick-grid .pickrow', 0); await sleep(200);
    ok((await $$('.scrim')) === 0, '指派後彈窗關閉');
    ok((await text('.trow .chip')).some((t) => t.includes('已指派 1 人')), '工作列顯示已指派 1 人');
    // 刪除
    const n1 = await $$('.trow');
    await b.eval(`document.querySelectorAll('.trow')[${rowIdx3}].querySelectorAll('.t-acts .btn')[2].click(); 1`); await sleep(200);
    ok((await $$('.trow')) === n1 - 1, '刪除工作');

    // 名單頁
    await tab(1);
    const m0 = await $$('.mrow');
    await setVal('#m-one', '99測試同學');
    await clickText('.input-row .btn', '新增'); await sleep(200);
    ok((await $$('.mrow')) === m0 + 1, '新增單一成員');
    ok((await text('.mname')).includes('測試同學'), '成員姓名正確');
    const idx = await b.eval("[...document.querySelectorAll('.mrow')].findIndex(r => r.textContent.includes('測試同學'))");
    await b.eval(`document.querySelectorAll('.mrow')[${idx}].querySelector('.check').click(); 1`); await sleep(150);
    ok((await b.eval(`document.querySelectorAll('.mrow')[${idx}].dataset.present`)) === 'false', '切換為免掃地');
    await b.eval(`document.querySelectorAll('.mrow')[${idx}].querySelectorAll('.btn-icon')[0].click(); 1`); await sleep(250);
    ok((await $$('.scrim .modal .pickrow')) > 1, '成員指派工作彈窗');
    await click('.scrim .modal-list .pickrow', 1); await sleep(200);
    ok((await $$('.scrim')) === 0, '成員指派後彈窗關閉');
    ok((await b.eval(`document.querySelectorAll('.mrow')[${idx}].querySelector('.btn-assigned') !== null`)), '成員列顯示已指定工作');
    await b.eval(`document.querySelectorAll('.mrow')[${idx}].querySelectorAll('.btn-icon')[1].click(); 1`); await sleep(200);
    ok((await $$('.mrow')) === m0, '刪除成員');
    const batchBefore = await $$('.mrow');
    await setVal('#m-batch', '41批次一\n42批次二');
    await clickText('.fold-body .btn-primary', '加入名單'); await sleep(200);
    ok((await $$('.mrow')) === batchBefore + 2, '批次匯入 2 人');

    // 設定頁：類別改名、圖示
    await tab(4);
    ok((await $$('.set-sec')) === 6, '設定頁 6 個區塊');
    await click('.opt .btn-between', 0); await sleep(150);
    ok((await $$('.picker button')) > 0, '類別圖示挑選器展開');
    // 全部重設在系統維護
    await clickText('.maint-danger .btn', '全部重設'); await sleep(300);
    ok((await b.eval("JSON.parse(localStorage.getItem('cleaning_task_helper_data_v8') || '{}').members?.length ?? 0")) === 0, '全部重設清空成員');
    await clickText('.maint .btn', '恢復預設'); await sleep(300);
    ok((await b.eval("JSON.parse(localStorage.getItem('cleaning_task_helper_data_v8') || '{}').members?.length ?? 0")) === 15, '恢復預設載入 15 位範例成員');

    const errs = b.errors().filter((e) => !/favicon/.test(e));
    ok(errs.length === 0, '沒有主控台錯誤' + (errs.length ? '：' + errs.join('\n') : ''));
  } catch (e) { fail++; console.log('  ✗ EXCEPTION', e.message); }
  await b.close(); server.close();
  console.log(`\n通過 ${pass}　失敗 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
