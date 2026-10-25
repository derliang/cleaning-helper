// 冒煙測試：載入、無錯誤、頁籤切換、深淺色。
const path = require('path');
const { launch, startStaticServer, sleep } = require('./cdp');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL', m); } };
(async () => {
  const server = await startStaticServer(path.resolve(__dirname, '../..'), 18765);
  const b = await launch({ url: 'http://127.0.0.1:18765/index.html', width: 1280, height: 800 });
  try {
    await b.eval('window.confirm = () => true; 1');
    const cloak = await b.eval("document.querySelector('#app').hasAttribute('v-cloak')");
    ok(!cloak, 'Vue 已掛載（v-cloak 已移除）');
    ok((await b.eval("document.querySelectorAll('.tcard').length")) > 0, '抽籤台有工作卡片');
    ok((await b.eval("document.querySelectorAll('.sidebar .nav-item').length")) === 5, '側欄有 5 個頁籤');

    for (const [i, id] of ['draw', 'members', 'tasks', 'history', 'settings'].entries()) {
      await b.eval(`document.querySelectorAll('.sidebar .nav-item')[${i}].click(); 1`);
      await sleep(150);
      const h1 = await b.eval("[...document.querySelectorAll('.main .page-title')].filter(e => e.offsetParent).map(e => e.textContent)");
      ok(h1.length === 1, `切到「${id}」只顯示一個頁面標題：${h1.join(',')}`);
    }

    // 深淺色
    await b.eval("localStorage.removeItem('cleaning_helper_theme'); 1");
    await b.goto('http://127.0.0.1:18765/index.html');
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === null, '預設不設 data-theme（跟隨系統）');
    await b.eval("document.querySelectorAll('.sidebar .side-foot .seg button')[1].click(); 1");
    await sleep(100);
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === 'dark', '按深色 → data-theme=dark');
    ok((await b.eval("localStorage.getItem('cleaning_helper_theme')")) === 'dark', '寫入 localStorage');
    const bg = await b.eval("getComputedStyle(document.body).backgroundColor");
    ok(bg === 'rgb(13, 18, 25)', '深色背景為 2b 午夜 #0D1219：' + bg);
    await b.goto('http://127.0.0.1:18765/index.html');
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === 'dark', '重新整理後保持深色');
    await b.eval("document.querySelectorAll('.sidebar .nav-item')[4].click(); 1");
    await sleep(100);
    await b.eval("document.querySelectorAll('.set-sec')[0].querySelectorAll('.seg button')[0].click(); 1");
    await sleep(100);
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === null, '設定頁「跟隨系統」→ 移除 data-theme');
    await b.goto('http://127.0.0.1:18765/index.html');
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === null, '重新整理後仍跟隨系統（不被舊備份資料拉回深色）');

    // 舊版使用者遷移：舊資料 isDarkMode:true 且沒有新設定 → 深色
    await b.eval("localStorage.removeItem('cleaning_helper_theme'); var d = JSON.parse(localStorage.getItem('cleaning_task_helper_data_v8')); d.isDarkMode = true; localStorage.setItem('cleaning_task_helper_data_v8', JSON.stringify(d)); 1");
    await b.goto('http://127.0.0.1:18765/index.html');
    ok((await b.eval("document.documentElement.getAttribute('data-theme')")) === 'dark', '舊版存過深色的使用者升級後維持深色');

    const errs = b.errors().filter((e) => !/favicon/.test(e));
    ok(errs.length === 0, '沒有主控台錯誤' + (errs.length ? '：' + errs.join('\n') : ''));
  } catch (e) { fail++; console.log('  ✗ EXCEPTION', e.message); }
  await b.close(); server.close();
  console.log(`\n通過 ${pass}　失敗 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
