// 對比檢查：逐一檢查畫面上每段文字的實際前景色與背景色（含半透明疊色），一般文字要 ≥ 4.5:1，大字 ≥ 3:1。
// 用法：node contrast.test.js [網址] ；每個頁籤、淺色與深色、手機與桌機各掃一次。
const path = require('path');
const { launch, startStaticServer, sleep } = require('./cdp');
const ROOT = process.env.CH_ROOT || path.resolve(__dirname, '../..');
const PAGE = process.env.CH_PAGE || '/index.html';
let pass = 0, fail = 0;
const AUDIT = `(() => {
  const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) base = over(chain[i], base); return base; };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; const txt = n.textContent.trim();
    if (!txt || !/[A-Za-z0-9\\u4e00-\\u9fff]/.test(txt)) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue;
    if (el.closest('script,style,noscript,#print-pdf-template,.hidden')) continue;
    if (el.closest('button:disabled,[disabled]')) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { if (getComputedStyle(e).display === 'none') { hidden = true; break; } } if (hidden) continue;
    seen.add(el);
    const fg0 = parse(cs.color); const bg = bgOf(el); const fg = over(fg0, bg);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const rt = ratio(fg, bg);
    const need = large ? 3 : 4.5;
    if (rt < need) out.push({ text: txt.slice(0, 18), ratio: +rt.toFixed(2), need, size, cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 30) });
    if (size < 12) out.push({ text: txt.slice(0, 18), ratio: 99, need: 0, size, cls: 'FONT<12' });
  }
  return out;
})()`;

module.exports = { AUDIT };
if (require.main === module) (async () => {
  const server = await startStaticServer(ROOT, 18776);
  const b = await launch({ url: 'http://127.0.0.1:18776' + PAGE, width: 1280, height: 800, port: 9990 });
  try {
    await b.eval('window.confirm = () => true; 1');
    for (const scheme of ['light', 'dark']) {
      await b.eval(`localStorage.setItem('cleaning_helper_theme','${scheme}'); 1`);
      await b.goto('http://127.0.0.1:18776' + PAGE);
      for (const [name, w, h, mobile] of [['phone', 390, 844, true], ['desk', 1280, 800, false]]) {
        await b.viewport(w, h, mobile);
        const sel = w >= 1024 ? '.sidebar .nav-item' : '.tabbar .tab';
        for (let i = 0; i < 5; i++) {
          await b.eval(`document.querySelectorAll('${sel}')[${i}].click(); 1`);
          await sleep(200);
          if (i === 3) await b.eval("document.querySelectorAll('.hhead').forEach(e => e.click()); 1");
          const bad = await b.eval(AUDIT);
          const uniq = [...new Map(bad.map((x) => [x.text + x.cls, x])).values()];
          if (uniq.length === 0) pass++; else { fail++; console.log(`  ✗ ${scheme}/${name}/頁籤${i}：${uniq.length} 處不合格`); uniq.slice(0, 6).forEach((x) => console.log(`      「${x.text}」${x.ratio}:1（需 ${x.need}）${x.size}px ${x.cls}`)); }
        }
      }
    }
  } catch (e) { fail++; console.log('  ✗ EXCEPTION', e.message); }
  await b.close(); server.close();
  console.log(`通過 ${pass}　失敗 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
