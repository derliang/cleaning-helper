// 版面檢查：各裝置×深淺色×頁籤，檢查橫向溢出、手機點擊區 < 44px，並截圖。
const path = require('path');
const { launch, startStaticServer, sleep } = require('./cdp');
const fs = require('fs');
const out = require('path').join(require('os').tmpdir(), 'cleaning-helper-shots');
fs.mkdirSync(out, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ FAIL', m); } };
const VP = [['phone', 390, 844, true], ['pad', 820, 1180, true], ['desk', 1280, 800, false]];
const TABS = ['draw', 'members', 'tasks', 'history', 'settings'];
(async () => {
  const server = await startStaticServer(path.resolve(__dirname, '../..'), 18767);
  const b = await launch({ url: 'http://127.0.0.1:18767/index.html', width: 1280, height: 800, port: 9555 });
  try {
    await b.eval('window.confirm = () => true; 1');
    for (const scheme of ['light', 'dark']) {
      await b.eval(`localStorage.setItem('cleaning_helper_theme','${scheme}'); 1`);
      await b.goto('http://127.0.0.1:18767/index.html');
      for (const [name, w, h, mobile] of VP) {
        await b.viewport(w, h, mobile);
        await b.eval('window.dispatchEvent(new Event("resize")); 1');
        for (const t of TABS) {
          const i = TABS.indexOf(t);
          const sel = w >= 1024 ? '.sidebar .nav-item' : w >= 768 ? '.rail .rail-item' : '.tabbar .tab';
          await b.eval(`document.querySelectorAll('${sel}')[${i}].click(); 1`);
          await sleep(250);
          const over = await b.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth');
          ok(over <= 0, `${scheme}/${name}/${t} 橫向溢出 ${over}px`);
          if (name === 'phone' || name === 'pad') {
            const small = await b.eval(`(() => {
              const res = [];
              document.querySelectorAll('.main button, .main a, .main label.btn, .main summary, .main input:not([type=hidden]):not(.hidden):not(.switch):not([type=checkbox]):not([type=radio]), .main select, .tabbar button, .topbar button, .rail button').forEach((el) => {
                const r = el.getBoundingClientRect();
                const vis = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
                if (!vis) return;
                if (el.closest('.page') && el.closest('.page').style.display === 'none') return;
                if (r.height < 43.5 || r.width < 43.5) res.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + (el.textContent || '').trim().slice(0, 10));
              });
              return res;
            })()`);
            const realSmall = small.filter((s) => !/switch|seg-label/.test(s));
            ok(realSmall.length === 0, `${scheme}/${name}/${t} 小於 44px 的操作：${[...new Set(realSmall)].slice(0, 8).join(' | ')}`);
          }
          await b.shot(`${out}/${scheme}-${name}-${t}.png`);
        }
        // 抽籤台長頁
        if (name === 'phone' || name === 'pad') {
          const sel = w >= 768 ? '.rail .rail-item' : '.tabbar .tab';
          await b.eval(`document.querySelectorAll('${sel}')[0].click(); 1`);
        }
      }
    }
    const errs = b.errors().filter((e) => !/favicon/.test(e));
    ok(errs.length === 0, '主控台錯誤：' + errs.join('\n'));
  } catch (e) { fail++; console.log('  ✗ EXCEPTION', e.message); }
  await b.close(); server.close();
  console.log(`通過 ${pass}　失敗 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
