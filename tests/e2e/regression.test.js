// 回歸測試：對應 QA Issue #2–#14（v2.13 實測發現的問題）。
// 直接呼叫 Vue 的 setup 狀態來驅動邏輯，再用畫面檢查結果。
const path = require('path');
const { launch, startStaticServer, sleep } = require('./cdp');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL', m); } };
const FIX = path.resolve(__dirname, 'fixtures');
(async () => {
  const server = await startStaticServer(path.resolve(__dirname, '../..'), 18769);
  const b = await launch({ url: 'http://127.0.0.1:18769/index.html', width: 1280, height: 900, port: 9667 });
  const S = 'window.__S'; // setupState
  const run = (code) => b.eval(`(async () => { ${code} })()`);
  const setFile = async (selector, file) => {
    const doc = await b.send('DOM.getDocument', { depth: -1 });
    const q = await b.send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector });
    await b.send('DOM.setFileInputFiles', { files: [file], nodeId: q.result.nodeIds[0] });
    await sleep(1200);
  };
  try {
    await b.eval(`window.__confirms = []; window.__confirmAnswer = true; window.confirm = (m) => { window.__confirms.push(m); return window.__confirmAnswer; };
      window.__S = [...document.querySelectorAll('*')].find(e => e.__vue_app__).__vue_app__._container._vnode.component.setupState; 1`);
    await run(`${S}.drawAnimationType = 'none'; ${S}.drawDuration = 0; ${S}.enableConfetti = false; ${S}.avoidSadness = true; ${S}.bigBlowMode = true; ${S}.avoidRepeat = true;`);

    // #6 不悲情：連續多輪，辛苦工作不得由上一輪辛苦者再抽到（人力足夠時）
    const heavyIds = () => run(`return ${S}.currentResults.filter(r => r.isHeavy).flatMap(r => r.assignedMembers.map(m => m.id));`);
    let repeats = 0, rounds = 25, prev = null;
    for (let i = 0; i < rounds; i++) {
      await run(`${S}.currentResults = []; ${S}.hasDrawRun = false; await ${S}.startDraw();`);
      const cur = await heavyIds();
      if (prev) repeats += cur.filter((id) => prev.includes(id)).length;
      prev = cur;
    }
    ok(repeats === 0, `#6 不悲情：${rounds} 輪連續辛苦的人次 = ${repeats}`);

    // #7 全部填滿再按「抽全部」：不新增歷史、不空轉
    const h0 = await run(`return ${S}.historyLogs.length;`);
    const t0 = Date.now();
    await run(`await ${S}.startDraw();`);
    ok((await run(`return ${S}.historyLogs.length;`)) === h0, '#7 已填滿再抽全部，不新增歷史紀錄');
    ok(Date.now() - t0 < 2000, '#7 已填滿再抽全部，立即返回');

    // #2 抽完後把已分配的人改成免掃地 → 不得留在結果裡
    const victim = await run(`return ${S}.currentResults[0].assignedMembers[0].id;`);
    await run(`${S}.toggleAttendance(${S}.members.find(m => m.id === ${JSON.stringify(victim)}));`);
    ok(await run(`return !${S}.currentResults.some(r => r.assignedMembers.some(m => m.id === ${JSON.stringify(victim)}));`), '#2 改成免掃地後從抽籤結果移除');
    await run(`${S}.toggleAttendance(${S}.members.find(m => m.id === ${JSON.stringify(victim)}));`);

    // #8 多出的人是「輪空」不是「免掃地」
    await run(`${S}.currentResults = []; ${S}.hasDrawRun = false; ${S}.members.push(...[1,2,3].map(i => ({ id: 'x'+i, seatNo: 90+i, name: 'extra'+i, present: true, assignedTaskId: null }))); await ${S}.startDraw();`);
    await sleep(300);
    const body = await b.eval('document.body.innerText');
    ok(body.includes('本次輪空成員（共 3 人'), '#8 分配表標示「本次輪空成員」');
    ok(!body.includes('免掃地成員（共'), '#8 沒有人被設免掃地時，不顯示「免掃地成員」區塊');
    await run(`${S}.members = ${S}.members.filter(m => !m.id.startsWith('x'));`);

    // #13 人力不足：辛苦工作優先填滿
    await run(`${S}.members.forEach((m, i) => { m.present = i < 5; }); ${S}.currentResults = []; ${S}.hasDrawRun = false; await ${S}.startDraw();`);
    const heavyFilled = await run(`return ${S}.currentResults.filter(r => r.isHeavy).reduce((n, r) => n + r.assignedMembers.length, 0);`);
    ok(heavyFilled === 5, `#13 只有 5 人時 5 人都排進辛苦工作（${heavyFilled}）`);
    await run(`${S}.members.forEach(m => { m.present = true; });`);

    // #9 抽一人：未抽滿不顯示「抽籤完成」
    await run(`${S}.currentResults = []; ${S}.hasDrawRun = false; ${S}.drawTimestamp = ''; await ${S}.drawSingleMember();`);
    await sleep(200);
    const chip = await b.eval("document.querySelector('.results-title .chip').textContent.trim()");
    ok(!chip.includes('抽籤完成') && chip.includes('進行中'), `#9 抽一人後狀態：「${chip}」`);

    // #10 隱藏類別後「共 N 項」只算顯示中的工作
    await run(`${S}.currentResults = []; ${S}.hasDrawRun = false; const cat = ${S}.tasks[0].category; ${S}.categorySettings.find(c => c.name === cat).visible = false;`);
    await sleep(200);
    const visible = await run(`return ${S}.activeTasks.length;`);
    const all = await run(`return ${S}.tasks.length;`);
    const ov = await b.eval("[...document.querySelectorAll('.ov-unit')].map(e => e.textContent.trim()).join('|')");
    ok(visible < all && ov.includes(`共 ${visible} 項`), `#10 統計「共 ${visible} 項」（全部 ${all} 項）：${ov}`);
    await run(`${S}.categorySettings.forEach(c => { c.visible = true; });`);

    // #11 座號重複被拒絕
    const m0 = await run(`return ${S}.members.length;`);
    await run(`${S}.newMemberName = '5重複座號'; ${S}.addSingleMember();`);
    ok((await run(`return ${S}.members.length;`)) === m0, '#11 單筆新增重複座號被拒絕');
    await run(`${S}.batchMemberInput = '5批次重複\\n77新同學'; ${S}.addBatchMembers();`);
    ok((await run(`return ${S}.members.length;`)) === m0 + 1 && (await run(`return ${S}.members.filter(m => m.seatNo === 5).length;`)) === 1, '#11 批次新增只加入座號不重複者');
    await run(`${S}.members = ${S}.members.filter(m => m.seatNo !== 77);`);

    // #3 其他軟體存檔的 Excel：圖示不亂碼；#12 自動修正清單；#4 取代確認
    await b.eval('document.querySelectorAll(".sidebar .nav-item")[1].click(); 1'); await sleep(300);
    const nc = await run('return window.__confirms.length;');
    await b.eval('document.querySelector("details.fold")?.setAttribute("open", ""); 1');
    await setFile('input[type=file][accept*=xlsx]', path.join(FIX, 'other-app-saved.xlsx'));
    const icons = await run(`return ${S}.tasks.map(t => t.icon);`);
    ok(icons.length > 0 && icons.every((i) => /\p{Extended_Pictographic}/u.test(i)), `#3 匯入後圖示維持 emoji：${icons.join(' ')}`);
    ok((await run('return window.__confirms.length;')) === nc + 1, '#4 Excel 匯入前有確認');
    await setFile('input[type=file][accept*=xlsx]', path.join(FIX, 'messy-rows.xlsx'));
    const report = await run(`return JSON.parse(JSON.stringify(${S}.importReport));`);
    ok(report.length >= 3, `#12 匯入後列出被自動修正的列（${report.length} 筆）：${report.slice(0, 3).join('；')}`);

    // #4 JSON 還原：按取消 → 資料不變
    const before = await run(`return ${S}.tasks.length + '/' + ${S}.members.length;`);
    await b.eval('window.__confirmAnswer = false; 1');
    const nc2 = await run('return window.__confirms.length;');
    await b.eval('document.querySelectorAll(".sidebar .nav-item")[4].click(); 1'); await sleep(300);
    await setFile('input[type=file][accept*=json]', path.join(FIX, 'backup.json'));
    ok((await run('return window.__confirms.length;')) === nc2 + 1, '#4 JSON 還原前有確認');
    ok((await run(`return ${S}.tasks.length + '/' + ${S}.members.length;`)) === before, '#4 按取消後資料不變');
    await b.eval('window.__confirmAnswer = true; 1');

    // #14 PDF 改 JPEG
    await b.eval('document.querySelectorAll(".sidebar .nav-item")[0].click(); 1'); await sleep(300);
    await run(`window.__pdf = []; const A = window.jspdf.jsPDF.API; const oa = A.addImage; A.addImage = function () { window.__pdf.push(String(arguments[1])); return oa.apply(this, arguments); }; A.save = function () {}; 1`);
    await run(`${S}.exportPDF();`);
    await sleep(3500);
    ok((await run('return window.__pdf;')).includes('JPEG'), '#14 PDF 以 JPEG 嵌入圖片');

    // #5 768 寬名單頁：姓名不被截斷（單欄）
    await b.viewport(768, 1024);
    await run(`${S}.currentTab = 'members';`); await sleep(400);
    const cols = await b.eval("(() => { const g = [...document.querySelectorAll('.two-col')].find(e => e.offsetParent); return g ? getComputedStyle(g).gridTemplateColumns.trim().split(/\s+/).length : -1; })()");
    const w = await b.eval("(() => { const m = [...document.querySelectorAll('.mrow .mname')].find(e => e.offsetParent); return m ? m.scrollWidth - m.clientWidth : -1; })()");
    const nameW = await b.eval("(() => { const m = [...document.querySelectorAll('.mrow .mname')].find(e => e.offsetParent); return m ? Math.round(m.getBoundingClientRect().width) : -1; })()");
    ok(cols === 1 && w <= 0 && nameW > 60, `#5 768px 名單頁單欄（欄數 ${cols}）、姓名不截斷（溢出 ${w}px、姓名寬 ${nameW}px）`);
    await b.viewport(1280, 900);

    const errs = b.errors().filter((e) => !e.includes('favicon'));
    ok(errs.length === 0, '主控台沒有錯誤' + (errs.length ? '：' + errs[0] : ''));
  } catch (e) {
    fail++; console.log('  ✗ 例外', e.message);
  }
  console.log(`\n通過 ${pass}　失敗 ${fail}`);
  await b.close(); server.close();
  process.exit(fail ? 1 : 0);
})();
