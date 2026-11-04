/* ============================================================
   AI 大模型 30 课 · 交互式教程逻辑
   视图：演示 / 自测 / 闪卡 / 词典 / 进度
   ============================================================ */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
const LESSONS = window.XY_LESSONS || [];
const DEMOS = window.XY_DEMOS || {};
const QUIZ = window.XY_QUIZ || {};
const GLOSS = window.XY_GLOSS || [];
const CARDS = window.XY_CARDS || [];

const K_DONE='xy_done_v1', K_STAT='xy_quiz_stats_v1', K_WRONG='xy_quiz_wrong_v1', K_KNOWN='xy_cards_known_v1';
function lsGet(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function E(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; }
function add(p, tag, cls, html){ const e=E(tag,cls,html); p.appendChild(e); return e; }
function lesson(n){ return LESSONS.find(x => x.n === n) || {n:n, title:'第 '+n+' 课', vol:1}; }
function pad(n){ return String(n).padStart(2,'0'); }

/* ---------------- 视图切换 ---------------- */
const views = { demos:'#view-demos', quiz:'#view-quiz', cards:'#view-cards', gloss:'#view-gloss', dash:'#view-dash' };
function switchView(v){
  Object.keys(views).forEach(k => { const e=$(views[k]); if(e) e.classList.toggle('active', k===v); });
  $$('.study-nav button').forEach(b => b.classList.toggle('active', b.dataset.view===v));
  if(v==='dash') renderDash();
  window.scrollTo({top:0, behavior:'smooth'});
}
$$('.study-nav button').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
window.XY_switchView = switchView;

/* ---------------- 交互演示 ---------------- */
const VOL_NAMES = {1:'卷一 · 基础数学', 2:'卷二 · 神经网络', 3:'卷三 · 自然语言处理', 4:'卷四 · 大语言模型', 5:'卷五 · 综合与附录'};
function renderDemos(){
  const app = $('#demos-app'); if(!app) return;
  app.innerHTML = '';
  const done = lsGet(K_DONE, []);
  const groups = {};
  Object.keys(DEMOS).forEach(id => { const d=DEMOS[id]; (groups[d.vol]=groups[d.vol]||[]).push(d); });
  Object.keys(groups).sort().forEach(v => {
    const block = add(app, 'section', 'vol-block');
    const head = add(block, 'div', 'vol-title');
    add(head, 'b', '', String(v));
    add(head, 'h2', '', VOL_NAMES[v] || ('第 '+v+' 部分'));
    add(head, 'small', '', groups[v].length + ' 个可动手演示');
    const grid = add(block, 'div', 'demo-grid');
    groups[v].forEach(d => {
      const card = add(grid, 'div', 'demo-card');
      if(done.indexOf(d.id) >= 0) card.style.borderColor = '#2f7d5d';
      add(card, 'div', 'demo-meta', 'LESSON ' + pad(d.lesson) + ' · ' + lesson(d.lesson).title);
      add(card, 'h3', '', d.title);
      add(card, 'p', 'demo-desc', d.desc);
      const body = add(card, 'div', 'demo-body');
      try{ d.fn(body); }catch(err){ add(body,'div','demo-out','演示加载失败：'+err.message); }
      const links = add(card, 'div', 'demo-links');
      add(links, 'a', '', '📖 看第 '+d.lesson+' 课原文 →').href = 'lessons/' + (lesson(d.lesson).file || (pad(d.lesson)+'-'+d.lesson+'.html'));
      const note = add(links, 'a', '', '📝 精读笔记 →'); note.href = 'notes.html#note' + d.lesson;
      const btn = add(links, 'button', 'demo-btn', done.indexOf(d.id)>=0 ? '✓ 已学过（点击取消）' : '✓ 标记已学');
      btn.addEventListener('click', () => {
        const cur = lsGet(K_DONE, []); const i = cur.indexOf(d.id);
        if(i >= 0) cur.splice(i,1); else cur.push(d.id);
        lsSet(K_DONE, cur);
        card.style.borderColor = cur.indexOf(d.id)>=0 ? '#2f7d5d' : '';
        btn.textContent = cur.indexOf(d.id)>=0 ? '✓ 已学过（点击取消）' : '✓ 标记已学';
      });
    });
  });
}

/* ---------------- 自测 ---------------- */
let quizMode = 'all';   // all | wrong
function renderQuiz(){
  const app = $('#quiz-app'); if(!app) return;
  app.innerHTML = '';
  const head = add(app, 'div', 'quiz-head');
  const sel = add(head, 'select', '');
  const o0 = add(sel, 'option', '', '全部 32 课（160 题）'); o0.value = 'all';
  LESSONS.forEach(L => { const o=add(sel,'option','',pad(L.n)+' · '+L.title); o.value=String(L.n); });
  sel.addEventListener('change', () => { quizMode = sel.value; renderQuizList(); });
  const wrong = add(head, 'button', '', '📕 复习错题本（'+lsGet(K_WRONG,[]).length+'）');
  wrong.addEventListener('click', () => { quizMode='wrong'; renderQuizList(); });
  const all = add(head, 'button', '', '全部题目');
  all.addEventListener('click', () => { quizMode='all'; sel.value='all'; renderQuizList(); });
  const list = add(app, 'div', ''); list.id = 'quiz-list';
  renderQuizList();
}
function renderQuizList(){
  const app = $('#quiz-list'); if(!app) return;
  app.innerHTML = '';
  const wrong = lsGet(K_WRONG, []);
  let items = [];
  if(quizMode === 'wrong'){
    items = wrong.map(k => { const [n,i]=k.split('-'); return {n:Number(n), i:Number(i), item:(QUIZ[pad(Number(n))]||[])[Number(i)]}; })
                 .filter(x => x.item);
    if(!items.length){ add(app,'div','dash-tip','🎉 错题本是空的，先去做几道题吧。'); return; }
  } else {
    const keys = quizMode==='all' ? Object.keys(QUIZ).sort((a,b)=>Number(a)-Number(b)) : [pad(Number(quizMode))];
    keys.forEach(k => (QUIZ[k]||[]).forEach((item,i) => items.push({n:Number(k), i, item})));
  }
  add(app, 'div', 'dash-tip', '共 '+items.length+' 题。点选项即判分，答错会自动加入错题本。');
  items.forEach(({n,i,item}) => {
    const card = add(app, 'div', 'qcard');
    add(card,'div','qtag','LESSON '+pad(n)+' · '+lesson(n).title+' · 第 '+(i+1)+' 题');
    add(card,'div','qtext',item.q);
    const opts = add(card,'div','qopts');
    const ex = add(card,'div','qexplain','解析：'+item.explain);
    const key = n+'-'+i;
    item.options.forEach((o,j) => {
      const b = add(opts,'button','', String.fromCharCode(65+j)+'. '+o);
      b.addEventListener('click', () => {
        if(card.dataset.answered) return;
        card.dataset.answered='1';
        Array.prototype.slice.call(opts.children).forEach(x => x.disabled=true);
        b.classList.add(j===item.correct?'ok':'bad');
        if(j!==item.correct){ const ok=opts.children[item.correct]; if(ok) ok.classList.add('ok'); }
        ex.classList.add('show');
        const st = lsGet(K_STAT,{attempted:0,correct:0});
        st.attempted++; if(j===item.correct) st.correct++; lsSet(K_STAT,st);
        const w = lsGet(K_WRONG,[]); const wi = w.indexOf(key);
        if(j===item.correct && wi>=0) w.splice(wi,1);
        if(j!==item.correct && wi<0) w.push(key);
        lsSet(K_WRONG,w);
      });
    });
  });
}

/* ---------------- 闪卡 ---------------- */
let cardsShuffle = false, cardsOnlyUnknown = false;
function renderCards(){
  const app = $('#cards-app'); if(!app) return;
  app.innerHTML = '';
  const tools = add(app,'div','cards-tools');
  const b1=add(tools,'button','','🔀 打乱'), b2=add(tools,'button','','只看未掌握'), b3=add(tools,'button','','全部展开/收起');
  let cards = CARDS.map((c,i)=>Object.assign({idx:i},c));
  if(cardsOnlyUnknown){ const known=lsGet(K_KNOWN,[]); cards=cards.filter(c=>known.indexOf(c.idx)<0); }
  if(cardsShuffle) cards.sort(()=>Math.random()-.5);
  b1.addEventListener('click',()=>{cardsShuffle=!cardsShuffle;renderCards();});
  b2.addEventListener('click',()=>{cardsOnlyUnknown=!cardsOnlyUnknown;b2.textContent=cardsOnlyUnknown?'显示全部':'只看未掌握';renderCards();});
  b2.textContent = cardsOnlyUnknown?'显示全部':'只看未掌握';
  add(app,'div','dash-tip','共 '+CARDS.length+' 张，当前显示 '+cards.length+' 张。点击卡片翻面看答案。');
  const grid = add(app,'div','cards-grid');
  let flipAll = false;
  b3.addEventListener('click',()=>{ flipAll=!flipAll; $$('.flashcard',grid).forEach(c=>c.classList.toggle('flipped',flipAll)); });
  const known = lsGet(K_KNOWN,[]);
  cards.forEach(c => {
    const card = add(grid,'div','flashcard'+(known.indexOf(c.idx)>=0?' known':''));
    const inner = add(card,'div','inner');
    const front = add(inner,'div','face front');
    add(front,'div','ctag','LESSON '+pad(c.lesson));
    add(front,'div','',c.front);
    const kb = add(front,'div','know', known.indexOf(c.idx)>=0?'✓ 已掌握':'标记掌握');
    kb.addEventListener('click',ev=>{ ev.stopPropagation(); const k=lsGet(K_KNOWN,[]); const i=k.indexOf(c.idx);
      if(i>=0)k.splice(i,1);else k.push(c.idx); lsSet(K_KNOWN,k); renderCards(); });
    const back = add(inner,'div','face back');
    add(back,'div','ctag','答案');
    add(back,'div','',c.back);
    card.addEventListener('click',()=>card.classList.toggle('flipped'));
  });
}

/* ---------------- 术语词典 ---------------- */
function renderGloss(){
  const app = $('#gloss-app'); if(!app) return;
  app.innerHTML = '';
  const inp = add(app,'input','gloss-search','');
  inp.placeholder = '搜索术语或英文，例如：注意力 / KV Cache / softmax';
  const count = add(app,'div','dash-tip','');
  const list = add(app,'div','gloss-list');
  function draw(q){
    list.innerHTML='';
    const k=(q||'').trim().toLowerCase();
    const arr = GLOSS.filter(g => !k || (g.term+' '+g.en+' '+g.def).toLowerCase().indexOf(k)>=0);
    count.textContent = '共 '+GLOSS.length+' 条术语，匹配 '+arr.length+' 条。';
    arr.forEach(g => {
      const it = add(list,'div','gloss-item');
      add(it,'b','',g.term); add(it,'span','en',g.en||'');
      add(it,'p','',g.def);
      const a = add(it,'a','','→ 看第 '+g.lesson+' 课原文'); a.href='lessons/'+(lesson(g.lesson).file||'index.html');
      const b = add(it,'a','','· 精读笔记'); b.href='notes.html#note'+g.lesson;
    });
  }
  inp.addEventListener('input',()=>draw(inp.value));
  draw('');
}

/* ---------------- 进度仪表盘 ---------------- */
function renderDash(){
  const app = $('#dash-app'); if(!app) return;
  app.innerHTML='';
  const done = lsGet(K_DONE,[]), stat = lsGet(K_STAT,{attempted:0,correct:0});
  const known = lsGet(K_KNOWN,[]), wrong = lsGet(K_WRONG,[]);
  const demoTotal = Object.keys(DEMOS).length;
  const pct = Math.round(done.length/demoTotal*100);
  const ring = add(app,'div','dash-ring'); ring.style.setProperty('--p',pct);
  const inner = add(ring,'div','','<b>'+pct+'%</b>演示已学');
  add(app,'div','dash-tip','按「🧩 交互演示」里每张卡片下方的「✓ 标记已学」累计进度，数据保存在本机浏览器。');
  const grid = add(app,'div','dash-grid');
  [['交互演示',done.length+' / '+demoTotal],['自测已答',stat.attempted],['正确率',(stat.attempted?Math.round(stat.correct/stat.attempted*100):0)+'%'],
   ['闪卡掌握',known.length+' / '+CARDS.length],['待复习错题',wrong.length],['精读笔记',LESSONS.length+' 篇']]
   .forEach(([k,v])=>{ const s=add(grid,'div','dash-stat'); add(s,'b','',String(v)); add(s,'span','',k); });
  const tips = [
    '📖 建议顺序：先看原文 → 再看精读笔记的「亲手算一遍」→ 最后回来动手调演示参数。',
    '🧩 还没学过的演示：'+(demoTotal-done.length)+' 个，从「卷一」的向量相似度开始最顺。',
    wrong.length?'📕 错题本有 '+wrong.length+' 条，点「🎯 自测 → 复习错题本」集中攻克。':'✅ 错题本是空的，保持得不错。',
    known.length<CARDS.length/2?'🃏 闪卡掌握度偏低，碎片时间翻几张对记术语很有效。':'🃏 闪卡掌握度不错，可以试试「只看未掌握」。'
  ];
  tips.forEach(t=>add(app,'div','dash-tip',t));
}

/* ---------------- 初始化 ---------------- */
renderDemos();
renderQuiz();
renderCards();
renderGloss();
renderDash();
// 支持从其它页面带 hash 直达某个视图
const hash = location.hash.replace('#','');
if(views[hash]) switchView(hash);
})();
