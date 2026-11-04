/* ============================================================
   新增模块：导航切换 / 判分自测+错题本 / 闪卡 / 仪表盘 / 术语词典
   依赖：window.CHAPTERS, window.QUIZ, window.GLOSSARY, window.DATA
   ============================================================ */
(function(){
"use strict";
const CH = window.CHAPTERS || [];
const QUIZ = window.QUIZ || {};
const GLOSS = window.GLOSSARY || [];
const DATA = window.DATA || {};
const NOTES = window.NOTES || [];
const ARTICLES = window.ARTICLES || [];

/* ---------- 工具 ---------- */
function h(tag, opts, ...kids){
  const e=document.createElement(tag); opts=opts||{};
  if(opts.cls) e.className=opts.cls;
  if(opts.html!==undefined) e.innerHTML=opts.html;
  if(opts.text!==undefined) e.textContent=opts.text;
  if(opts.attrs) for(const k in opts.attrs) e.setAttribute(k,opts.attrs[k]);
  if(opts.on) for(const k in opts.on) e.addEventListener(k,opts.on[k]);
  for(const kid of kids){ if(kid==null||kid===false) continue;
    e.appendChild(typeof kid==='string'?document.createTextNode(kid):kid); }
  return e;
}
const $=(s,root)=>(root||document).querySelector(s);
const $$=(s,root)=>Array.from((root||document).querySelectorAll(s));
function lsGet(k,def){ try{ return JSON.parse(localStorage.getItem(k))??def; }catch(e){ return def; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

const WKEY='llm_from_scratch_done_v1';
const QSTAT='llm_quiz_stats_v1';
const QWRONG='llm_quiz_wrong_v1';
const CKNOWN='llm_cards_known_v1';

/* ============================================================
   导航切换
   ============================================================ */
const views={course:'#view-course',articles:'#view-articles',notes:'#view-notes',quiz:'#view-quiz',cards:'#view-cards',dash:'#view-dash',gloss:'#view-gloss'};
function switchView(v){
  Object.keys(views).forEach(k=>{ const el=$(views[k]); if(el) el.classList.toggle('active',k===v); });
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.getElementById('layout').classList.toggle('mode-mini', v!=='course');
  if(v!=='course'){ if(window.__HUD&&window.__HUD.isActive&&window.__HUD.isActive()) window.__HUD.hide(); }
  if(v==='dash' && $('#dash-app')) renderDash();
  window.scrollTo({top:0,behavior:'instant'});
}
$$('.nav-btn').forEach(b=> b.addEventListener('click',()=>switchView(b.dataset.view)) );

/* 跨系列跳转：教程章节 / 笔记正文 / 原文 —— 三个全局函数，standalone 页通过 *_HREF 跨页跳转 */
function scrollToId(id){ const t=document.getElementById(id); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); }
window.goToNote=function(n){
  if(window.NOTES_HREF){ window.location.href=window.NOTES_HREF+'#note'+n; return; }
  switchView('notes'); setTimeout(()=>scrollToId('note'+n),60);
};
window.goToChapter=function(n){
  if(window.TUTORIAL_HREF){ window.location.href=window.TUTORIAL_HREF+'#ch'+String(n).padStart(2,'0'); return; }
  switchView('course'); setTimeout(()=>scrollToId('ch'+String(n).padStart(2,'0')),60);
};
window.goToArticle=function(n){
  if(window.ARTICLES_HREF){ window.location.href=window.ARTICLES_HREF+'#article'+n; return; }
  switchView('articles'); setTimeout(()=>scrollToId('article'+n),60);
};
const notesBack=document.getElementById('notes-back');
if(notesBack) notesBack.addEventListener('click',()=>{ switchView('course'); setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60); });
const articlesBack=document.getElementById('articles-back');
if(articlesBack) articlesBack.addEventListener('click',()=>{ switchView('course'); setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60); });

/* 支持通过 URL hash 直达：#articleN / #noteN / #chNN（standalone 页也可深链分享） */
window.addEventListener('load',function(){
  const hash=decodeURIComponent(location.hash||''); let m;
  if((m=hash.match(/^#article(\d+)$/))) setTimeout(()=>scrollToId('article'+m[1]),150);
  else if((m=hash.match(/^#note(\d+)$/))) setTimeout(()=>scrollToId('note'+m[1]),150);
  else if((m=hash.match(/^#ch(\d+)$/))) setTimeout(()=>scrollToId('ch'+String(m[1]).padStart(2,'0')),150);
});

/* ============================================================
   判分自测 + 错题本
   ============================================================ */
function renderQuiz(){
  const app=$('#quiz-app'); if(!app) return;
  app.innerHTML='';
  // 控制区
  const ctrl=h('div',{cls:'quiz-ctrl'});
  const sel=h('select',{cls:'quiz-sel'});
  sel.appendChild(h('option',{text:'全部 16 章（128 题）',attrs:{value:'__all'}}));
  CH.forEach(c=> sel.appendChild(h('option',{text:`第 ${c.n} 章 · ${c.title}`,attrs:{value:c.id}})));
  const modeBtn=h('button',{cls:'btn',text:'📕 复习错题本',on:{click:()=>renderQuizList(getWrong(),true)}});
  const stats=h('div',{cls:'quiz-stats',id:'quiz-stats'});
  ctrl.appendChild(h('label',{cls:'quiz-sel-label'},'章节 ',sel));
  ctrl.appendChild(modeBtn);
  app.appendChild(ctrl);
  app.appendChild(stats);
  const listWrap=h('div',{cls:'quiz-list',id:'quiz-list'});
  app.appendChild(listWrap);

  sel.addEventListener('change',()=>{
    const v=sel.value;
    const items = v==='__all'
      ? CH.flatMap(c=>(QUIZ[c.id]||[]).map(q=>({ch:c,q})))
      : (QUIZ[v]||[]).map(q=>({ch:CH.find(x=>x.id===v),q}));
    renderQuizList(items,false);
  });
  renderQuizList(CH.flatMap(c=>(QUIZ[c.id]||[]).map(q=>({ch:c,q}))),false);
}
function getWrong(){ return lsGet(QWRONG,[]); }
function renderQuizList(items, isWrong){
  const list=$('#quiz-list'); if(!list) return;
  const st=$('#quiz-stats');
  list.innerHTML='';
  if(isWrong && items.length===0){ list.appendChild(h('div',{cls:'quiz-empty'},'🎉 错题本是空的，说明你这一轮全对！')); updateQuizStats(st,0,0,items.length); return; }
  if(items.length===0){ list.appendChild(h('div',{cls:'quiz-empty'},'该章节暂无题目。')); return; }
  let correct=0;
  items.forEach((it,idx)=>{
    const q=it.q;
    const ch=(typeof it.ch==='object')?it.ch:CH.find(x=>x.id===it.ch);
    const card=h('div',{cls:'qcard'});
    card.appendChild(h('div',{cls:'qcard-q'},`${isWrong?'':'Q'+(idx+1)+'. '}${q.q}`));
    const opts=h('div',{cls:'qcard-opts'});
    const explain=h('div',{cls:'qcard-exp',html:'<b>解析：</b>'+q.explain});
    let answered=false;
    q.options.forEach((o,oi)=>{
      const ob=h('button',{cls:'qopt',text:o,on:{click:()=>{
        if(answered) return; answered=true;
        const btns=$$('.qopt',opts); btns.forEach(b=>b.disabled=true);
        if(oi===q.correct){ ob.classList.add('correct'); correct++; }
        else { ob.classList.add('wrong'); btns[q.correct].classList.add('correct');
          // 记入错题本
          const wrong=getWrong(); const key=ch.id+'|'+q.q;
          if(!wrong.find(w=>w.key===key)) { wrong.push({key,ch:ch.id,chTitle:ch.title,q:q.q}); lsSet(QWRONG,wrong); }
        }
        explain.classList.add('show');
        // 累计统计持久化
        let s=lsGet(QSTAT,{attempted:0,correct:0});
        s.attempted=(s.attempted||0)+1; if(oi===q.correct) s.correct=(s.correct||0)+1; lsSet(QSTAT,s);
        updateQuizStats(st, correct, items.length, getWrong().length);
      }}});
      opts.appendChild(ob);
    });
    card.appendChild(opts);
    card.appendChild(explain);
    list.appendChild(card);
  });
  updateQuizStats(st, correct, items.length, getWrong().length);
}
function updateQuizStats(st, correct, total, wrongBook){
  if(!st) return;
  st.innerHTML = `本卷正确 <b>${correct}</b> / 共 <b>${total}</b> ｜ 错题本累计 <b>${wrongBook}</b> 条`;
}

/* ============================================================
   概念闪卡
   ============================================================ */
function renderCards(){
  const app=$('#cards-app'); if(!app) return;
  app.innerHTML='';
  const known=lsGet(CKNOWN,[]);
  const ctrl=h('div',{cls:'cards-ctrl'});
  const shuffleBtn=h('button',{cls:'btn ghost',text:'🔀 打乱',on:{click:()=>{state.shuffle=!state.shuffle; draw();}}});
  const knownBtn=h('button',{cls:'btn ghost',text:'只看重未掌握',on:{click:()=>{state.onlyUnknown=!state.onlyUnknown; draw();}}});
  const resetBtn=h('button',{cls:'btn ghost',text:'重置掌握标记',on:{click:()=>{lsSet(CKNOWN,[]); state.known=[]; draw();}}});
  const stat=h('div',{cls:'cards-stat',id:'cards-stat'});
  ctrl.appendChild(shuffleBtn); ctrl.appendChild(knownBtn); ctrl.appendChild(resetBtn);
  app.appendChild(ctrl); app.appendChild(stat);
  const grid=h('div',{cls:'cards-grid',id:'cards-grid'});
  app.appendChild(grid);
  const state={known, shuffle:false, onlyUnknown:false};
  window.__cardsState=state;
  draw();
  function draw(){
    const g=$('#cards-grid'); if(!g) return;
    let items=GLOSS.map((t,i)=>({t,i}));
    if(state.onlyUnknown) items=items.filter(o=>!state.known.includes(o.i));
    if(state.shuffle) for(let i=items.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
    g.innerHTML='';
    items.forEach(o=>{
      const {t,i}=o;
      const card=h('div',{cls:'flashcard'+(state.known.includes(i)?' known':'')});
      const inner=h('div',{cls:'flashcard-inner'});
      const front=h('div',{cls:'flashcard-face front'},
        h('div',{cls:'fc-term'},t.term),
        h('div',{cls:'fc-en'},t.en||''));
      const back=h('div',{cls:'flashcard-face back'},
        h('div',{cls:'fc-def'},t.def),
        h('div',{cls:'fc-ch'},'→ 第 '+(CH.find(c=>c.id===t.ch)?CH.find(c=>c.id===t.ch).n:'?')+' 章'));
      inner.appendChild(front); inner.appendChild(back);
      card.appendChild(inner);
      card.addEventListener('click',()=>{ if(card.classList.contains('flipped')) return; card.classList.toggle('flipped'); });
      const mark=h('button',{cls:'fc-mark',text: state.known.includes(i)?'✓ 已掌握':'标记掌握',on:{click:(e)=>{ e.stopPropagation();
        if(state.known.includes(i)) state.known=state.known.filter(x=>x!==i); else state.known.push(i);
        lsSet(CKNOWN,state.known); card.classList.toggle('known',state.known.includes(i));
        updateCardsStat(); }}});
      card.appendChild(mark);
      g.appendChild(card);
    });
    updateCardsStat();
  }
  function updateCardsStat(){
    const s=$('#cards-stat'); if(!s) return;
    const knownN=(window.__cardsState?window.__cardsState.known:lsGet(CKNOWN,[])).length;
    s.innerHTML=`共 <b>${GLOSS.length}</b> 张 ｜ 已掌握 <b>${knownN}</b> ｜ 点击卡片翻转，右下角可标记掌握。`;
  }
}

/* ============================================================
   学习仪表盘
   ============================================================ */
function renderDash(){
  const app=$('#dash-app'); if(!app) return;
  app.innerHTML='';
  const done=lsGet(WKEY,[]);
  const qstats=lsGet(QSTAT,{attempted:0,correct:0});
  const wrongN=getWrong().length;
  const knownN=lsGet(CKNOWN,[]).length;
  const totalCh=CH.length, totalCards=GLOSS.length;
  const chDone=Array.isArray(done)?done.length:0;
  const chPct=Math.round(chDone/totalCh*100);
  const cardPct=Math.round(knownN/totalCards*100);

  // 章节进度环
  const ring=h('div',{cls:'dash-ring',attrs:{style:`--p:${chPct}`}});
  ring.appendChild(h('span',{cls:'dash-ring-num',text:chPct+'%'}));
  ring.appendChild(h('span',{cls:'dash-ring-label',text:'章节完成'}));

  const stats=h('div',{cls:'dash-stats'});
  const add=(label,val,sub)=>stats.appendChild(h('div',{cls:'dash-stat'},
    h('div',{cls:'ds-val',text:String(val)}), h('div',{cls:'ds-label',text:label}), h('div',{cls:'ds-sub',text:sub||''})));
  add('已完成章节', chDone+' / '+totalCh, chPct+'%');
  add('闪卡已掌握', knownN+' / '+totalCards, cardPct+'%');
  add('错题本', wrongN+' 条', '待复习');
  add('自测累计', (qstats.attempted||0)+' 题', '正确 '+(qstats.correct||0));

  // 建议
  const tips=h('div',{cls:'dash-tips'});
  const nextCh = CH.find(c=>!done.includes(c.id));
  tips.appendChild(h('div',{cls:'dash-tip'}, nextCh? `👉 下一章建议看：第 ${nextCh.n} 章《${nextCh.title}》` : '🎉 16 章已全部学完，去「自测」检验一下吧！'));
  if(wrongN>0) tips.appendChild(h('div',{cls:'dash-tip'}, `📕 你有 ${wrongN} 条错题待复习，点「自测 → 复习错题本」。`));
  if(cardPct<60) tips.appendChild(h('div',{cls:'dash-tip'}, `🃏 闪卡掌握度 ${cardPct}%，碎片时间翻几张有助于记术语。`));
  tips.appendChild(h('div',{cls:'dash-tip'}, `📝 16 篇精读笔记已收录：手算推演 + 逐行代码，点顶部「精读笔记」深入。`));

  app.appendChild(h('div',{cls:'dash-top'}, ring, stats));
  app.appendChild(tips);
}

/* ============================================================
   术语词典
   ============================================================ */
function renderGloss(){
  const app=$('#gloss-app'); if(!app) return;
  const input=$('#gloss-input');
  const list=h('div',{cls:'gloss-list',id:'gloss-list'});
  app.parentNode.insertBefore(list, app.nextSibling); // 放到 input 下
  function draw(q){
    const qq=(q||'').trim().toLowerCase();
    list.innerHTML='';
    const items=GLOSS.filter(t=>!qq || t.term.toLowerCase().includes(qq) || (t.en||'').toLowerCase().includes(qq) || (t.def||'').toLowerCase().includes(qq));
    if(items.length===0){ list.appendChild(h('div',{cls:'gloss-empty'},'没有匹配的术语。')); return; }
    items.forEach(t=>{
      const ch=CH.find(c=>c.id===t.ch);
      const card=h('div',{cls:'gloss-card'});
      card.appendChild(h('div',{cls:'gloss-term'}, t.term, h('span',{cls:'gloss-en',text:t.en||''})));
      card.appendChild(h('div',{cls:'gloss-def'}, t.def));
      const foot=h('div',{cls:'gloss-foot'});
      foot.appendChild(h('span',{cls:'gloss-ch',text: ch?('第 '+ch.n+' 章 · '+ch.title):t.ch}));
      foot.appendChild(h('button',{cls:'gloss-go',text:'去看该章 →',on:{click:()=>{
        switchView('course'); setTimeout(()=>{ const el=document.getElementById(t.ch); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },60); }}}));
      card.appendChild(foot);
      list.appendChild(card);
    });
  }
  if(input) input.addEventListener('input',()=>draw(input.value));
  draw('');
}

/* ============================================================
   精读笔记系列
   ============================================================ */
function noteShortTitle(t){ return (t||'').replace(/^第\s*\d+\s*篇精读\s*[｜|]\s*/,''); }
function renderNotes(){
  const app=$('#notes-app'); if(!app) return;
  app.innerHTML='';
  const toc=$('#notes-toc'); if(toc) toc.innerHTML='';

  NOTES.forEach(note=>{
    const short=noteShortTitle(note.title);

    // 顶部目录
    if(toc){
      const a=h('a',{cls:'notes-toc-item',attrs:{href:'javascript:void(0)'}});
      a.appendChild(h('span',{cls:'nt-num',text:String(note.n).padStart(2,'0')}));
      a.appendChild(h('span',{cls:'nt-title',text:short}));
      a.addEventListener('click',()=>{ const t=document.getElementById('note'+note.n); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); });
      toc.appendChild(a);
    }

    // 单篇
    const sec=h('section',{cls:'note',attrs:{id:'note'+note.n,'data-n':String(note.n)}});
    const head=h('div',{cls:'note-head'});
    head.appendChild(h('div',{cls:'note-badge',text:String(note.n).padStart(2,'0')}));
    const titles=h('div',{cls:'note-titles'});
    titles.appendChild(h('div',{cls:'note-kicker',text:'第 '+note.n+' 篇精读'}));
    titles.appendChild(h('h2',{text:short}));
    if(note.sub){
      const s=h('div',{cls:'note-sub'});
      s.appendChild(h('b',{},'核心一句话：'));
      s.appendChild(document.createTextNode(note.sub));
      titles.appendChild(s);
    }
    head.appendChild(titles);
    sec.appendChild(head);

    // 跨系列连接：回交互演示 / 看原文 / 回教程
    const links=h('div',{cls:'note-links'});
    const b1=h('button',{cls:'xref',text:'🧩 看第 '+note.n+' 章交互演示'});
    b1.addEventListener('click',()=>{ if(window.TUTORIAL_HREF){ window.location.href = window.TUTORIAL_HREF + '#ch' + String(note.n).padStart(2,'0'); } else { goToChapter(note.n); } });
    const b3=h('button',{cls:'xref ghost',text:'📄 看第 '+note.n+' 篇原文'});
    b3.addEventListener('click',()=>{ if(window.ARTICLES_HREF){ window.location.href = window.ARTICLES_HREF + '#article' + note.n; } else { goToArticle(note.n); } });
    const b2=h('button',{cls:'xref ghost',text:'📚 回到教程目录'});
    b2.addEventListener('click',()=>{ if(window.TUTORIAL_HREF){ window.location.href = window.TUTORIAL_HREF; } else { switchView('course'); setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60); } });
    links.appendChild(b1); links.appendChild(b3); links.appendChild(b2);
    sec.appendChild(links);

    // 笔记正文（已由 gen_notes.js 转成 HTML）
    sec.appendChild(h('div',{cls:'note-body',html:note.html}));
    app.appendChild(sec);
  });
}

/* ============================================================
   原文系列（materials/llm-*.md -> articles.js）
   复用 .note* 样式；id 用 articleN 以免与笔记 noteN 冲突
   ============================================================ */
function renderArticles(){
  const app=$('#articles-app'); if(!app) return;
  app.innerHTML='';
  const toc=$('#articles-toc'); if(toc) toc.innerHTML='';

  ARTICLES.forEach(a=>{
    if(toc){
      const item=h('a',{cls:'notes-toc-item',attrs:{href:'javascript:void(0)'}});
      item.appendChild(h('span',{cls:'nt-num',text:String(a.n).padStart(2,'0')}));
      item.appendChild(h('span',{cls:'nt-title',text:a.short}));
      item.addEventListener('click',()=>{ const t=document.getElementById('article'+a.n); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); });
      toc.appendChild(item);
    }

    const sec=h('section',{cls:'note',attrs:{id:'article'+a.n,'data-n':String(a.n)}});
    const head=h('div',{cls:'note-head'});
    head.appendChild(h('div',{cls:'note-badge',text:String(a.n).padStart(2,'0')}));
    const titles=h('div',{cls:'note-titles'});
    titles.appendChild(h('div',{cls:'note-kicker',text:'原文 · '+(a.kicker||('第'+a.n+'篇'))}));
    titles.appendChild(h('h2',{text:a.short}));
    head.appendChild(titles);
    sec.appendChild(head);

    const links=h('div',{cls:'note-links'});
    const b1=h('button',{cls:'xref',text:'🧩 看第 '+a.n+' 章交互演示'});
    b1.addEventListener('click',()=>goToChapter(a.n));
    const b2=h('button',{cls:'xref ghost',text:'📝 看第 '+a.n+' 篇精读笔记'});
    b2.addEventListener('click',()=>goToNote(a.n));
    links.appendChild(b1); links.appendChild(b2);
    sec.appendChild(links);

    sec.appendChild(h('div',{cls:'note-body',html:a.html}));
    app.appendChild(sec);
  });
}

/* ============================================================
   初始化（仅当对应视图存在）
   ============================================================ */
if($('#notes-app')) renderNotes();
if($('#articles-app')) renderArticles();
if($('#quiz-app')) renderQuiz();
if($('#cards-app')) renderCards();
if($('#dash-app')) renderDash();
if($('#gloss-app')) renderGloss();

})();
