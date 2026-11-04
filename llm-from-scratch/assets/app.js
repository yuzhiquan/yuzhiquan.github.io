/* ============================================================
   渲染、导航、进度、键盘控制
   ============================================================ */
(function(){
"use strict";
const CH = window.CHAPTERS || [];
const DEMOS = window.DEMOS || {};
const HUD = window.__HUD;
const STEPPER = new Set(['attention','kvcache','agent']);
const STORE_KEY = 'llm_from_scratch_done_v1';
// 每章的额外演示（在主演示之外再挂一个或多个）
const EXTRA_DEMOS = {
  ch01:['sampling'], ch02:['liveTok'], ch03:['embScatter'], ch04:['multihead'],
  ch05:['fwdFlops'], ch07:['decodeSim'], ch09:['budgetCalc'], ch12:['memCalc'],
  ch13:['costCompare'], ch15:['moeToggle'], ch16:['opTimeline']
};

/* ---------- 状态 ---------- */
function loadDone(){ try{ return new Set(JSON.parse(localStorage.getItem(STORE_KEY)||'[]')); }catch(e){ return new Set(); } }
function saveDone(set){ try{ localStorage.setItem(STORE_KEY, JSON.stringify([...set])); }catch(e){} }
let done = loadDone();

/* ---------- 工具 ---------- */
function el(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; }
function blockToNode(b){
  if(b.t==='p') return el('p',null,b.x);
  if(b.t==='h') return el('h3',null,b.x);
  if(b.t==='ul'){ const u=el('ul'); (b.x||[]).forEach(li=>u.appendChild(el('li',null,li))); return u; }
  if(b.t==='code'){ const pre=el('pre','codeblock'); pre.textContent=b.x; return pre; }
  if(b.t==='callout') return el('div','callout',b.x);
  return el('p',null,'');
}

/* ---------- 构建章节 ---------- */
const chaptersRoot = document.getElementById('chapters');
const toc = document.getElementById('toc');
const chapterEls = [];
const tocItems = [];

CH.forEach((ch,idx)=>{
  // TOC item
  const item = el('div','toc-item');
  item.dataset.id = ch.id;
  item.innerHTML = `<span class="toc-num">${String(ch.n).padStart(2,'0')}</span><span class="toc-title">${ch.title}</span><span class="toc-check">✓</span>`;
  item.addEventListener('click',()=>{ document.getElementById(ch.id).scrollIntoView({behavior:'smooth',block:'start'}); });
  toc.appendChild(item); tocItems.push(item);

  // Section
  const sec = el('section','chapter'); sec.id=ch.id;
  if(done.has(ch.id)) sec.classList.add('done');
  sec.appendChild(el('div','ch-head',
    `<div class="ch-badge">${String(ch.n).padStart(2,'0')}</div>`+
    `<div class="ch-titles"><h2>${ch.title}</h2><div class="ch-en">${ch.en||''}</div></div>`));
  sec.appendChild(el('div','ch-oneliner', ch.one));

  // 跨系列连接：跳到本篇对应的精读笔记 / 原文
  const noteLink = el('a','xref-banner','📝 看本篇精读笔记（第 '+ch.n+' 篇）→');
  noteLink.href = 'javascript:void(0)';
  noteLink.addEventListener('click',()=>{ if(window.goToNote) window.goToNote(ch.n); });
  sec.appendChild(noteLink);
  const artLink = el('a','xref-banner alt','📄 看本篇系列原文（第 '+ch.n+' 篇）→');
  artLink.href = 'javascript:void(0)';
  artLink.addEventListener('click',()=>{ if(window.goToArticle) window.goToArticle(ch.n); });
  sec.appendChild(artLink);

  const body = el('div','ch-body');
  (ch.blocks||[]).forEach(b=>body.appendChild(blockToNode(b)));
  sec.appendChild(body);

  // Demo
  if(ch.demo && DEMOS[ch.demo]){
    const demo = el('div','demo');
    const demoHead = el('div','demo-head','<span class="demo-dot"></span><span class="demo-title">🧩 交互演示</span>');
    const demoNote = el('a','xref','📝 对应笔记');
    demoNote.href = 'javascript:void(0)';
    demoNote.addEventListener('click',()=>{ if(window.goToNote) window.goToNote(ch.n); });
    demoHead.appendChild(demoNote);
    demo.appendChild(demoHead);
    demo.appendChild(el('div','demo-sub','动手玩：下面这个部件是本章概念的可视化，拖动/点击它会实时变化。'));
    const container = el('div','demo-container');
    demo.appendChild(container);
    sec.appendChild(demo);
    if(STEPPER.has(ch.demo)){ demo.dataset.stepper='1'; demo._container=container; demo._demo=ch.demo; }
    else { try{ DEMOS[ch.demo](container); }catch(e){ container.appendChild(el('div','demo-note','演示加载失败：'+e.message)); } }
  }

  // 额外演示（每章可多于一个）
  (EXTRA_DEMOS[ch.id]||[]).forEach((dn,di)=>{
    if(!DEMOS[dn]) return;
    const demo=el('div','demo');
    const head=el('div','demo-head',`<span class="demo-dot"></span><span class="demo-title">🧩 交互演示 ${String.fromCharCode(0x2461+di)}</span>`);
    const nl=el('a','xref','📝 对应笔记');
    nl.href='javascript:void(0)';
    nl.addEventListener('click',()=>{ if(window.goToNote) window.goToNote(ch.n); });
    head.appendChild(nl); demo.appendChild(head);
    demo.appendChild(el('div','demo-sub','同一个概念的另一种玩法：'));
    const container=el('div','demo-container');
    demo.appendChild(container);
    sec.appendChild(demo);
    try{ DEMOS[dn](container); }catch(e){ container.appendChild(el('div','demo-note','演示加载失败：'+e.message)); }
  });

  // Panels: keyPoints, numbers, analogy, mistakes, quiz
  if(ch.keyPoints && ch.keyPoints.length){
    const kp = ch.keyPoints.map(k=>`<div class="fact"><span class="dot"></span>${k}</div>`).join('');
    sec.appendChild(makePanel('💡 关键点', kp));
  }
  if(ch.numbers && ch.numbers.length){
    const grid = el('div','kv-grid');
    ch.numbers.forEach(o=>{ const c=el('div','kv'); c.innerHTML=`<div class="k">${o.k}</div><div class="v">${o.v}</div><div class="n">${o.n}</div>`; grid.appendChild(c); });
    sec.appendChild(makePanel('🔢 关键数字', grid.outerHTML));
  }
  if(ch.analogy){
    const a=ch.analogy;
    const html=`<div class="ana"><div class="src">类比：${a.src}</div><div>→ ${a.to}</div><div class="lim">⚠️ 失效边界：${a.lim}</div></div>`;
    sec.appendChild(makePanel('🔁 类比拆解', html));
  }
  if(ch.mistakes && ch.mistakes.length){
    const html=ch.mistakes.map(m=>`<div class="mistake"><span class="x">❌ ${m.w}</span> → <span class="ok">✅ ${m.r}</span><br><span class="why">为什么：${m.why}</span></div>`).join('');
    sec.appendChild(makePanel('⚠️ 常见误区', html));
  }
  if(ch.quiz && ch.quiz.length){
    const wrap=el('div');
    ch.quiz.forEach(q=>{
      const item=el('div','quiz');
      item.innerHTML=`<div class="q">${q.q}</div><div class="a">${q.a}</div>`;
      const tg=el('span','quiz-toggle','显示答案 ▾');
      tg.addEventListener('click',()=>{ item.classList.toggle('open'); tg.textContent=item.classList.contains('open')?'隐藏答案 ▴':'显示答案 ▾'; });
      item.appendChild(tg); wrap.appendChild(item);
    });
    sec.appendChild(makePanel('🎯 自测题（点击看答案）', wrap.outerHTML));
  }

  // Done checkbox
  const doneRow = el('div','ch-done-row');
  const cb = el('input'); cb.type='checkbox'; cb.checked=done.has(ch.id);
  const lbl = el('label',null,'标记本章已学完');
  cb.addEventListener('change',()=>{ if(cb.checked) done.add(ch.id); else done.delete(ch.id);
    sec.classList.toggle('done',cb.checked); item.classList.toggle('done',cb.checked); saveDone(done); updateProgress(); });
  doneRow.appendChild(cb); doneRow.appendChild(lbl);
  sec.appendChild(doneRow);

  chaptersRoot.appendChild(sec);
  chapterEls.push(sec);
});

/* ---------- 折叠面板 ---------- */
function makePanel(title, innerHTML){
  const p=el('div','panel');
  const h=el('div','panel-h',`<span>${title}</span><span class="chev">▶</span>`);
  const b=el('div','panel-body'); b.innerHTML=innerHTML;
  h.addEventListener('click',()=>p.classList.toggle('open'));
  p.appendChild(h); p.appendChild(b); return p;
}

/* ---------- 进度 ---------- */
const progFill=document.getElementById('progress-fill');
const progText=document.getElementById('progress-text');
function updateProgress(){
  const n=done.size, total=CH.length;
  progFill.style.width=(n/total*100)+'%';
  progText.textContent=n+' / '+total;
  tocItems.forEach(it=>{ it.classList.toggle('done', done.has(it.dataset.id)); });
}
updateProgress();

/* ---------- 搜索 ---------- */
const search=document.getElementById('search');
search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase();
  tocItems.forEach(it=>{
    const ch=CH.find(c=>c.id===it.dataset.id);
    const hay=(ch.title+' '+(ch.en||'')+' '+(ch.keyPoints||[]).join(' ')).toLowerCase();
    it.classList.toggle('hidden-by-search', q!=='' && !hay.includes(q));
  });
});

/* ---------- 重置 ---------- */
document.getElementById('reset-progress').addEventListener('click',()=>{
  done=new Set(); saveDone(done);
  chapterEls.forEach(s=>s.classList.remove('done'));
  document.querySelectorAll('.ch-done-row input').forEach(cb=>cb.checked=false);
  updateProgress();
});

/* ---------- 滚动高亮 (scroll-spy) ---------- */
let activeIdx=0;
const spy=new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting){ const i=chapterEls.indexOf(en.target); if(i>=0){ activeIdx=i; setActive(i); } } });
},{rootMargin:'-30% 0px -60% 0px',threshold:0});
chapterEls.forEach(s=>spy.observe(s));
function setActive(i){
  tocItems.forEach((it,k)=>it.classList.toggle('active',k===i));
}

/* ---------- 步进演示懒加载：进入视口才初始化，离开则收起 HUD ---------- */
if(HUD) HUD.init();
const stepperObserver=new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    const demo=en.target;
    if(en.isIntersecting && demo.dataset.stepper==='1' && !demo._inited){
      demo._inited=true;
      try{ DEMOS[demo._demo](demo._container); }catch(e){ demo._container.appendChild(el('div','demo-note','演示加载失败：'+e.message)); }
    }
    if(!en.isIntersecting && HUD && HUD.isActive()){
      // 若当前 HUD 属于这个 stepper，则收起
      // 用一个标记区分：HUD.current 不带 id，简单起见离开任意 stepper 即 hide
      HUD.hide();
    }
  });
},{rootMargin:'0px',threshold:0.35});
chapterEls.forEach(sec=>{ const d=sec.querySelector('.demo[data-stepper="1"]'); if(d) stepperObserver.observe(d); });

/* ---------- 键盘导航 ---------- */
function goChapter(dir){
  let i=activeIdx+dir; i=Math.max(0,Math.min(chapterEls.length-1,i));
  chapterEls[i].scrollIntoView({behavior:'smooth',block:'start'});
}
window.addEventListener('keydown',(e)=>{
  if(HUD && HUD.isActive()){ if(HUD.onKey(e)) return; }
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select') return;
  if(e.key==='ArrowDown'||e.key==='j'){ e.preventDefault(); goChapter(1); }
  else if(e.key==='ArrowUp'||e.key==='k'){ e.preventDefault(); goChapter(-1); }
});

/* ---------- 顶部进度条 ---------- */
const topFill=document.getElementById('progress-top-fill');
function onScroll(){
  const h=document.documentElement;
  const sc=h.scrollTop, max=h.scrollHeight-h.clientHeight;
  topFill.style.width=(max>0?(sc/max*100):0)+'%';
}
window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

})();
