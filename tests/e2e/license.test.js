// 授權說明頁（license.html）：獨立頁面、不連到 GitHub、淺色與深色對比合格、手機不橫向溢出，主程式頁尾連到它。
const path = require('path');
const { launch, startStaticServer } = require('./cdp');
const { AUDIT } = require('./contrast.test.js');
const ROOT = process.env.CH_ROOT || path.resolve(__dirname, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

(async () => {
  const server = await startStaticServer(ROOT, 18777);
  const base = 'http://127.0.0.1:18777';
  const b = await launch({ url: base + '/license.html', width: 1280, height: 800, port: 9991 });
  try {
    const links = await b.eval("[...document.querySelectorAll('a')].map(a => a.getAttribute('href'))");
    ok(links.every((h) => !/github/i.test(h)), '授權頁不應有 GitHub 連結：' + links.join(','));
    ok(links.includes('index.html'), '授權頁要能回到主程式');
    ok(links.includes('mailto:derliang@gmail.com'), '授權頁要有聯絡信箱');
    const text = await b.eval('document.body.innerText');
    ok(['聖功女子高級中學', '非營利', '營利活動', 'MIT'].every((k) => text.includes(k)), '授權頁缺少必要條文');

    for (const scheme of ['light', 'dark']) {
      await b.eval(`localStorage.setItem('cleaning_helper_theme','${scheme}'); 1`);
      await b.goto(base + '/license.html');
      for (const [name, w, h, mobile] of [['phone', 390, 844, true], ['desk', 1280, 800, false]]) {
        await b.viewport(w, h, mobile);
        const bad = await b.eval(AUDIT);
        ok(bad.length === 0, `${scheme}/${name} 對比不合格 ${JSON.stringify(bad.slice(0, 3))}`);
        const over = await b.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth');
        ok(over <= 0, `${scheme}/${name} 橫向溢出 ${over}px`);
        const back = await b.eval("document.querySelector('.back').getBoundingClientRect().height");
        ok(back >= 44, `${scheme}/${name} 返回鈕高度 ${back}px < 44`);
      }
    }

    await b.goto(base + '/index.html');
    const foot = await b.eval("(document.querySelector('.copyright-note a') || {}).getAttribute && document.querySelector('.copyright-note a').getAttribute('href')");
    ok(foot === 'license.html', '主程式頁尾授權說明應連到 license.html，實際：' + foot);
    const anyGh = await b.eval("[...document.querySelectorAll('a')].filter(a => /github/i.test(a.href)).length");
    ok(anyGh === 0, '主程式不應有指向 GitHub 的連結');
  } catch (e) { fail++; console.log('  ✗ EXCEPTION', e.message); }
  await b.close();
  server.close();
  console.log(`license：${pass} 通過，${fail} 失敗`);
  process.exit(fail ? 1 : 0);
})();
