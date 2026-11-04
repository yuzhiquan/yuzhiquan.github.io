/* ============================================================
   交互演示集合：window.DEMOS[id](containerEl)
   每个 id 对应 content.js 里一篇的 demo 字段。
   ============================================================ */
(function(){
"use strict";

const DEMOS = {};   // 各交互演示挂载点

/* ---------- 通用工具 ---------- */
function h(tag, opts, ...kids){
  const e=document.createElement(tag);
  opts=opts||{};
  if(opts.cls) e.className=opts.cls;
  if(opts.html!==undefined) e.innerHTML=opts.html;
  if(opts.text!==undefined) e.textContent=opts.text;
  if(opts.attrs) for(const k in opts.attrs) e.setAttribute(k,opts.attrs[k]);
  if(opts.on) for(const k in opts.on) e.addEventListener(k,opts.on[k]);
  for(const kid of kids){ if(kid==null||kid===false) continue;
    e.appendChild(typeof kid==='string'?document.createTextNode(kid):kid); }
  return e;
}
function fmtBytes(b){
  if(b<1024) return b+' B';
  if(b<1048576) return (b/1024).toFixed(0)+' KB';
  if(b<1073741824) return (b/1048576).toFixed(1)+' MB';
  if(b<1e12) return (b/1073741824).toFixed(1)+' GB';
  return (b/1e12).toFixed(2)+' TB';
}
function num(n){ return n.toLocaleString('en-US'); }
function matToTable(M, opts){
  opts=opts||{};
  const t=h('table',{cls:'mat'+(opts.heat?' heat':'')});
  if(opts.colHeads){ const tr=h('tr'); tr.appendChild(h('th',{text:''}));
    opts.colHeads.forEach(c=>tr.appendChild(h('th',{text:c}))); t.appendChild(tr); }
  M.forEach((row,i)=>{
    const tr=h('tr');
    if(opts.rowHeads) tr.appendChild(h('th',{text:opts.rowHeads[i]}));
    row.forEach((v,j)=>{
      const td=h('td',{text:(opts.fmt?opts.fmt(v):v)});
      if(opts.heat && opts.maxAbs){ const a=Math.min(1,Math.abs(v)/opts.maxAbs);
        const pos=v>=0; td.style.background=pos?`rgba(59,91,219,${0.15+a*0.7})`:`rgba(224,49,49,${0.15+a*0.7})`; }
      if(opts.hl && opts.hl(i,j)) td.classList.add('cell-hi');
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  return t;
}
function barRow(label, val, max, valText){
  const pct = max>0 ? Math.max(2, Math.min(100, val/max*100)) : 0;
  return h('div',{cls:'bar-row'},
    h('div',{cls:'bar-label',text:label}),
    h('div',{cls:'bar-track'}, h('div',{cls:'bar-fill',attrs:{style:`width:${pct}%`}})),
    h('div',{cls:'bar-val',text:valText!==undefined?valText:String(val)})
  );
}

/* ---------- 全局步进控制器（供 attention / kvcache / agent 使用） ---------- */
const HUD = {
  el:null,label:null,counter:null,prev:null,next:null,play:null,
  current:null,timer:null,
  init(){
    this.el=document.getElementById('step-hud'); if(!this.el) return;
    this.label=document.getElementById('step-hud-label');
    this.counter=document.getElementById('step-counter');
    this.prev=document.getElementById('step-prev');
    this.next=document.getElementById('step-next');
    this.play=document.getElementById('step-play');
    this.prev.onclick=()=>this.go(-1);
    this.next.onclick=()=>this.go(1);
    this.play.onclick=()=>this.toggle();
  },
  isActive(){ return !!this.current; },
  show(label,total,cb){
    this.current={label,total,step:0,cb,playing:false};
    this.label.textContent=label;
    this.el.classList.remove('hidden');
    this.update(); cb(0);
  },
  hide(){ this.el.classList.add('hidden'); this.current=null; this.stop(); },
  update(){ if(this.current) this.counter.textContent=(this.current.step+1)+' / '+this.current.total; },
  go(dir){ if(!this.current) return; const n=this.current.step+dir;
    if(n<0||n>=this.current.total) { if(dir>0) this.stop(); return; }
    this.current.step=n; this.update(); this.current.cb(n); },
  toggle(){ if(!this.current) return; if(this.current.playing) this.stop(); else this.start(); },
  start(){ if(!this.current) return; this.current.playing=true; this.play.textContent='⏸ 暂停';
    this.timer=setInterval(()=>this.go(1),1100); },
  stop(){ if(this.timer) clearInterval(this.timer); this.timer=null;
    if(this.current){ this.current.playing=false; this.play.textContent='▶ 播放'; } },
  onKey(e){
    if(!this.current) return false;
    if(e.key==='ArrowRight'){ this.go(1); return true; }
    if(e.key==='ArrowLeft'){ this.go(-1); return true; }
    if(e.code==='Space'){ e.preventDefault(); this.toggle(); return true; }
    return false;
  }
};

/* ================= 01 softmax / temperature ================= */
DEMOS.softmax=function(c){
  const logitBox=h('div',{cls:'demo-col'});
  const outBox=h('div',{cls:'demo-col'});
  const toks=['the','cat','sat'];
  let logs=[2.1,0.6,0.3];
  const inputs=toks.map((t,i)=>{
    const inp=h('input',{attrs:{type:'number',step:'0.1',value:logs[i]},
      on:{input:()=>{logs[i]=parseFloat(inp.value)||0; render();}}});
    return h('div',{cls:'ctrl'}, h('label',{text:'logit("'+t+'")'}), inp);
  });
  const temp=h('input',{attrs:{type:'range',min:'0.4',max:'2',step:'0.1',value:'1'},
    on:{input:render}});
  const tempVal=h('span',{text:'T=1.0'});
  logitBox.appendChild(h('div',{cls:'demo-title',text:'① 调整 logits 与温度'}));
  inputs.forEach(x=>logitBox.appendChild(x));
  logitBox.appendChild(h('div',{cls:'ctrl'}, h('label',{},'temperature ',tempVal), temp));
  outBox.appendChild(h('div',{cls:'demo-title',text:'② 概率分布（softmax）'}));
  const bars=h('div'); outBox.appendChild(bars);
  outBox.appendChild(h('div',{cls:'demo-note',html:'公式 <code>p_i = e^{logit_i / T} / Σ e^{logit_j / T}</code>。T 越小分布越尖（保守），T 越大越平（发散）。'}));
  c.appendChild(h('div',{cls:'demo-stage'}, logitBox, outBox));

  function render(){
    const T=parseFloat(temp.value); tempVal.textContent='T='+T.toFixed(1);
    const exps=logs.map(l=>Math.exp(l/T));
    const sum=exps.reduce((a,b)=>a+b,0);
    const ps=exps.map(e=>e/sum);
    bars.innerHTML='';
    const maxP=Math.max(...ps);
    toks.forEach((t,i)=>{
      bars.appendChild(barRow(t, ps[i], maxP, (ps[i]*100).toFixed(1)+'%'));
    });
  }
  render();
};

/* ================= 02 BPE ================= */
DEMOS.bpe=function(c){
  // 实时（教学估算）分词
  const txt=h('textarea',{attrs:{placeholder:'输入一段中英文混合文本…'},text:'你好 world, 大模型 LLM 很强大！'});
  const chips=h('div'); const stat=h('div',{cls:'demo-note'});
  function approxTokens(s){
    let toks=[]; let i=0;
    const reCJK=/[一-鿿]/;
    while(i<s.length){
      const ch=s[i];
      if(reCJK.test(ch)){ toks.push(ch); i++; }
      else if(/[a-zA-Z]/.test(ch)){ let j=i; while(j<s.length&&/[a-zA-Z]/.test(s[j])) j++;
        const w=s.slice(i,j); const n=Math.max(1,Math.ceil(w.length/4));
        for(let k=0;k<n;k++) toks.push(w.length<=6?w:w.slice(Math.floor(k*w.length/n),Math.floor((k+1)*w.length/n)));
        i=j; }
      else if(/\s/.test(ch)){ toks.push('␣'); i++; }
      else { toks.push(ch); i++; }
    }
    return toks;
  }
  function runTok(){
    const toks=approxTokens(txt.value);
    chips.innerHTML='';
    toks.forEach(t=>chips.appendChild(h('span',{cls:'kv',attrs:{style:'display:inline-block;margin:3px'},text:t})));
    const cjk=(txt.value.match(/[一-鿿]/g)||[]).length;
    stat.innerHTML=`估算 token 数：<b>${toks.length}</b> ｜ 中文字符 ${cjk} 个（中文约 1 字≈1 token，英文词按子词拆，此为教学估算，非真实 tokenizer）`;
  }
  txt.addEventListener('input',runTok);
  const tokBox=h('div',{cls:'demo-col'},
    h('div',{cls:'demo-title',text:'① 实时分词（估算）'}),
    h('div',{cls:'ctrl'}, txt),
    chips, stat
  );

  // BPE 步进
  const words=['low','low','low','lower','lower','newest','widest'];
  function bpeSteps(words,maxSteps){
    let sents=words.map(w=>w.split(''));
    const merges=[];
    for(let s=0;s<maxSteps;s++){
      const pc={};
      for(const sent of sents) for(let i=0;i<sent.length-1;i++){
        const k=sent[i]+' '+sent[i+1]; pc[k]=(pc[k]||0)+1; }
      let best=null,bc=-1; for(const k in pc) if(pc[k]>bc){bc=pc[k];best=k;}
      if(!best) break;
      const [a,b]=best.split(' '); merges.push({a,b,c:bc});
      sents=sents.map(sent=>{ const out=[]; let i=0;
        while(i<sent.length){ if(i<sent.length-1&&sent[i]===a&&sent[i+1]===b){out.push(a+b);i+=2;} else {out.push(sent[i]);i++;} } return out; });
    }
    return {merges,sents};
  }
  const {merges,sents}=bpeSteps(words,8);
  const bpeViz=h('div'); const bpeInfo=h('div',{cls:'demo-note'});
  const stepBtn=h('button',{cls:'btn',text:'下一步合并 ▶',on:{click:()=>step(1)}});
  const resetBtn=h('button',{cls:'btn ghost',text:'重置',on:{click:()=>step(-99)}});
  let si=-1;
  function step(d){
    if(d===-99) si=-1; else si=Math.min(merges.length-1, Math.max(-1, si+d));
    if(si<0){
      bpeViz.innerHTML='';
      bpeViz.appendChild(h('div',{html:'初始（字符级）分词：'}));
      bpeViz.appendChild(h('div',{attrs:{style:'margin-top:6px'},text:'当前分词： '+sents[0].map(x=>'⟨'+x+'⟩').join(' ')}));
      bpeInfo.innerHTML='点「下一步合并」开始 BPE：每次把最高频相邻对合成一个新片段，写进词表。';
      return;
    }
    if(si>=merges.length){ bpeInfo.innerHTML='已无可合并对，BPE 训练结束。词表即当前所有片段。'; return; }
    bpeViz.innerHTML='';
    const m=merges[si];
    bpeViz.appendChild(h('div',{html:`第 <b>${si+1}</b> 步：合并最高频相邻对 <code>${m.a} + ${m.b}</code> → <code>${m.a+m.b}</code>（出现 ${m.c} 次）`}));
    const cur=sents[si+1]||sents[sents.length-1];
    bpeViz.appendChild(h('div',{attrs:{style:'margin-top:6px'},text:'当前分词： '+cur.map(x=>'⟨'+x+'⟩').join(' ')}));
    bpeInfo.innerHTML=`已合并 ${si+1} 次。注意：「low」很快成块，而「lower/newest」被拆成子词复用「low/est」等片段——这就是 BPE 省词表的关键。`;
  }
  const bpeBox=h('div',{cls:'demo-col'},
    h('div',{cls:'demo-title',text:'② BPE 合并演示（语料: low×3, lower×2, newest, widest）'}),
    h('div',{cls:'btn-row'}, stepBtn, resetBtn),
    bpeViz, bpeInfo
  );
  c.appendChild(h('div',{cls:'demo-stage'}, tokBox, bpeBox));
  runTok(); step(-99);
};

/* ================= 03 embedding ================= */
DEMOS.embedding=function(c){
  const V={
    king:[1,0,0,0], queen:[1,1,0,0], man:[0,0,0,0], woman:[0,1,0,0],
    paris:[0,0,1,0], france:[0,0,0,1], cat:[2,0,1,0], dog:[2,0,0,1]
  };
  const names=Object.keys(V);
  function cos(a,b){ let d=0,na=0,nb=0; for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];} return d/(Math.sqrt(na)*Math.sqrt(nb)); }
  function vecStr(v){ return '['+v.map(x=>x.toFixed(0)).join(', ')+']'; }
  // 余弦
  const selA=h('select'); const selB=h('select');
  names.forEach(n=>{ selA.appendChild(h('option',{text:n})); selB.appendChild(h('option',{text:n})); });
  selA.value='king'; selB.value='queen';
  const cosOut=h('div',{cls:'demo-note'});
  function showCos(){ const a=V[selA.value],b=V[selB.value]; const s=cos(a,b);
    cosOut.innerHTML=`cos(<b>${selA.value}</b>, <b>${selB.value}</b>) = <b>${s.toFixed(3)}</b>　向量: ${vecStr(a)} · ${vecStr(b)}`; }
  selA.onchange=showCos; selB.onchange=showCos;
  const cosBox=h('div',{cls:'demo-col'},
    h('div',{cls:'demo-title',text:'① 余弦相似度'}),
    h('div',{cls:'ctrl'}, h('label',{text:'词 A'}), selA),
    h('div',{cls:'ctrl'}, h('label',{text:'词 B'}), selB),
    cosOut
  );
  // 类比
  const sA=h('select'),sB=h('select'),sC=h('select');
  names.forEach(n=>{ sA.appendChild(h('option',{text:n})); sB.appendChild(h('option',{text:n})); sC.appendChild(h('option',{text:n})); });
  sA.value='king'; sB.value='man'; sC.value='woman';
  const anaOut=h('div',{cls:'demo-note'});
  function showAna(){
    const a=V[sA.value],b=V[sB.value],cc=V[sC.value];
    const r=a.map((x,i)=>x-b[i]+cc[i]);
    let best=null,bc=-2;
    names.forEach(n=>{ if(n===sA.value) return; const s=cos(r,V[n]); if(s>bc){bc=s;best=n;} });
    anaOut.innerHTML=`<b>${sA.value}</b> − <b>${sB.value}</b> + <b>${sC.value}</b> = ${vecStr(r)}<br>最近邻 → <b style="color:#3b5bdb">${best}</b>（余弦 ${bc.toFixed(3)}）`;
  }
  [sA,sB,sC].forEach(s=>s.onchange=showAna);
  const anaBox=h('div',{cls:'demo-col'},
    h('div',{cls:'demo-title',text:'② 词类比：A − B + C ≈ ?'}),
    h('div',{cls:'ctrl'}, h('label',{text:'A'}), sA),
    h('div',{cls:'ctrl'}, h('label',{text:'B'}), sB),
    h('div',{cls:'ctrl'}, h('label',{text:'C'}), sC),
    anaOut
  );
  c.appendChild(h('div',{cls:'demo-stage'}, cosBox, anaBox));
  showCos(); showAna();
};

/* ================= 04 attention（步进） ================= */
DEMOS.attention=function(c){
  const Tok=['Thank','you','very'];
  const Q=[[1,0],[0,2],[2,2]];
  const K=[[1,0],[0,1],[1,1]];
  const V=[[1,0],[0,1],[1,1]];
  const dk=2, scale=Math.SQRT2;
  function matMul(A,Bt){ // A(m×d) · B(d×n) returns m×n; B given as rows
    const n=Bt.length, d=A[0].length, m=A.length;
    const R=[]; for(let i=0;i<m;i++){ const row=[]; for(let j=0;j<n;j++){ let s=0; for(let k=0;k<d;k++) s+=A[i][k]*Bt[j][k]; row.push(s);} R.push(row);} return R; }
  const S=matMul(Q,K);
  function softmaxRow(r){ const m=Math.max(...r); const e=r.map(x=>Math.exp(x-m)); const s=e.reduce((a,b)=>a+b,0); return e.map(x=>x/s); }
  function applyMask(M){ return M.map((row,i)=>row.map((v,j)=> j>i?-Infinity:v)); }
  const Sscaled=S.map(r=>r.map(v=>v/scale));
  const Smasked=applyMask(Sscaled);
  const W=Smasked.map(softmaxRow);
  const O=matMul(W,V); // W(3×3)·V(3×2)
  // 容器
  const stage=h('div',{cls:'demo-stage'});
  const boxQKV=h('div',{cls:'demo-col'});
  const boxS=h('div',{cls:'demo-col'});
  const boxSoft=h('div',{cls:'demo-col'});
  const boxOut=h('div',{cls:'demo-col'});
  c.appendChild(stage);
  stage.appendChild(boxQKV); stage.appendChild(boxS); stage.appendChild(boxSoft); stage.appendChild(boxOut);
  const note=h('div',{cls:'demo-note'});
  c.appendChild(note);

  function render(step){
    boxQKV.innerHTML=''; boxS.innerHTML=''; boxSoft.innerHTML=''; boxOut.innerHTML='';
    if(step>=0){
      boxQKV.appendChild(h('div',{cls:'demo-title',text:'Q / K / V 投影'}));
      boxQKV.appendChild(h('div',{html:'<code>d_model=4, 头数=2, d_k=2</code>'}));
      boxQKV.appendChild(h('div',{text:'Q',attrs:{style:'margin-top:8px;font-weight:600'}})); boxQKV.appendChild(matToTable(Q,{rowHeads:Tok,colHeads:['d1','d2']}));
      boxQKV.appendChild(h('div',{text:'K',attrs:{style:'margin-top:6px;font-weight:600'}})); boxQKV.appendChild(matToTable(K,{rowHeads:Tok,colHeads:['d1','d2']}));
      boxQKV.appendChild(h('div',{text:'V',attrs:{style:'margin-top:6px;font-weight:600'}})); boxQKV.appendChild(matToTable(V,{rowHeads:Tok,colHeads:['d1','d2']}));
    }
    if(step>=1){
      boxS.appendChild(h('div',{cls:'demo-title',text:'① 分数 S = Q·Kᵀ'}));
      boxS.appendChild(matToTable(S,{rowHeads:Tok,colHeads:Tok,fmt:v=>v.toFixed(2)}));
      boxS.appendChild(h('div',{cls:'demo-note',html:'每个格子 = 第 i 个 token 的 Q 与第 j 个 token 的 K 的点积，表示 i 对 j 的「关注度」。'}));
    }
    if(step>=2){
      boxS.appendChild(h('div',{html:`<br>② 缩放 ÷ √d_k = ÷ ${scale.toFixed(3)}`,attrs:{style:'font-weight:600;margin-top:8px'}}));
      boxS.appendChild(matToTable(Sscaled,{rowHeads:Tok,colHeads:Tok,fmt:v=>v.toFixed(2)}));
    }
    if(step>=3){
      boxS.appendChild(h('div',{html:'③ 因果掩码（未来置 −∞）',attrs:{style:'font-weight:600;margin-top:8px'}}));
      boxS.appendChild(matToTable(Smasked,{rowHeads:Tok,colHeads:Tok,fmt:v=>isFinite(v)?v.toFixed(2):'−∞'}));
    }
    if(step>=4){
      boxSoft.appendChild(h('div',{cls:'demo-title',text:'④ softmax 权重（热力图）'}));
      boxSoft.appendChild(matToTable(W,{rowHeads:Tok,colHeads:Tok,heat:true,maxAbs:1,fmt:v=>v.toFixed(3)}));
      boxSoft.appendChild(h('div',{cls:'demo-note',html:'每行和为 1。注意第 1 行（Thank）被掩码后只能看自己 → [1,0,0]。第 3 行（very）更看重自己，但仍有约 50% 来自融合前文。'}));
    }
    if(step>=5){
      boxOut.appendChild(h('div',{cls:'demo-title',text:'⑤ 输出 = 权重 · V'}));
      boxOut.appendChild(matToTable(O,{rowHeads:Tok,colHeads:['d1','d2'],fmt:v=>v.toFixed(3)}));
      const v3=O[2];
      boxOut.appendChild(h('div',{cls:'demo-note',html:`very 的新向量 = [${v3[0].toFixed(3)}, ${v3[1].toFixed(3)}]，正是它按注意力权重把三行 V 融合后的结果——「融合上下文」是一行矩阵乘法。`}));
    }
    const texts=[
      '① 投影出 Q/K/V：每个 token 得到「想找 / 是什么 / 提供什么」三组向量。',
      '② 算分数：S = Q·Kᵀ，未缩放。',
      '③ 缩放：÷√d_k（本例 √2≈1.414），防止点积过大让 softmax 变 one-hot。',
      '④ 因果掩码：把「未来」位置分数设为 −∞，保证只看前文。',
      '⑤ softmax：每行变和为 1 的注意力权重（见左侧热力图）。',
      '⑥ 加权求和：权重 × 对应 V，得到融合了上下文的新向量。'
    ];
    note.innerHTML='当前步骤：'+texts[step];
  }
  HUD.show('Attention 六步推演',6,render);
};

/* ================= 05 transformer 参数 ================= */
DEMOS.transformer=function(c){
  const form=h('div',{cls:'demo-col'});
  const out=h('div',{cls:'demo-col'});
  const layers=h('input',{attrs:{type:'range',min:'1',max:'96',step:'1',value:'12'},on:{input:calc}});
  const dmodel=h('input',{attrs:{type:'range',min:'128',max:'4096',step:'64',value:'768'},on:{input:calc}});
  const vocab=h('input',{attrs:{type:'range',min:'1000',max:'200000',step:'1000',value:'50257'},on:{input:calc}});
  form.appendChild(h('div',{cls:'demo-title',text:'配置模型'}));
  form.appendChild(h('div',{cls:'ctrl'}, h('label',{},'层数 N ',h('span',{id:'v-layers',text:'12'})), layers));
  form.appendChild(h('div',{cls:'ctrl'}, h('label',{},'维度 d ',h('span',{id:'v-d',text:'768'})), dmodel));
  form.appendChild(h('div',{cls:'ctrl'}, h('label',{},'词表 ',h('span',{id:'v-vocab',text:'50257'})), vocab));
  const presets=h('div',{cls:'btn-row'});
  presets.appendChild(h('button',{cls:'btn ghost',text:'GPT-2 (124M)',on:{click:()=>{set(12,768,50257);}}}));
  presets.appendChild(h('button',{cls:'btn ghost',text:'≈7B',on:{click:()=>{set(32,4096,32000);}}}));
  presets.appendChild(h('button',{cls:'btn ghost',text:'≈70B',on:{click:()=>{set(80,8192,32000);}}}));
  form.appendChild(presets);
  out.appendChild(h('div',{cls:'demo-title',text:'参数量拆解'}));
  const bars=h('div'); out.appendChild(bars);
  const totalLabel=h('div',{cls:'demo-note'}); out.appendChild(totalLabel);
  c.appendChild(h('div',{cls:'demo-stage'}, form, out));
  function set(l,d,v){ layers.value=l;dmodel.value=d;vocab.value=v;calc(); }
  function calc(){
    const N=+layers.value, d=+dmodel.value, V=+vocab.value;
    document.getElementById('v-layers').textContent=N;
    document.getElementById('v-d').textContent=d;
    document.getElementById('v-vocab').textContent=V;
    const attn=4*d*d, ffn=8*d*d, ln=4*d;
    const perLayer=attn+ffn+ln;
    const emb=d*V;
    const total=N*perLayer+emb+2*d;
    bars.innerHTML='';
    bars.appendChild(barRow('注意力(4·d²)',attn,perLayer,num(attn)));
    bars.appendChild(barRow('FFN(8·d²)',ffn,perLayer,num(ffn)));
    bars.appendChild(barRow('LayerNorm',ln,perLayer,num(ln)));
    bars.appendChild(barRow('Embedding(d·vocab)',emb,emb,num(emb)));
    totalLabel.innerHTML=`总参数 ≈ <b>${num(Math.round(total))}</b>（${(total/1e6).toFixed(1)}M）。注：此处为近似，忽略了位置编码与 bias；GPT-2 真值约 124M。`;
  }
  calc();
};

/* ================= 06 training 梯度下降 ================= */
DEMOS.training=function(c){
  const data=[[1,2],[2,5],[3,8]]; // y≈3x-1
  let w=1,b=0,lr=0.05, lossHist=[];
  const canvas=h('canvas',{attrs:{width:'320',height:'200'}});
  const info=h('div',{cls:'demo-note'});
  const stepBtn=h('button',{cls:'btn',text:'单步训练 ▶',on:{click:()=>trainStep()}});
  const runBtn=h('button',{cls:'btn ghost',text:'自动 30 步',on:{click:()=>{for(let i=0;i<30;i++)trainStep();}}});
  const resetBtn=h('button',{cls:'btn ghost',text:'重置',on:{click:()=>{w=1;b=0;lossHist=[];render();}}});
  const lrIn=h('input',{attrs:{type:'range',min:'0.001',max:'0.3',step:'0.001',value:'0.05'},on:{input:()=>{lr=parseFloat(lrIn.value);info.textContent='lr='+lr.toFixed(3);}}});
  c.appendChild(h('div',{cls:'demo-title',text:'2 参数玩具模型：ŷ = w·x + b'}));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{},'学习率 lr ',h('span',{text:'0.05'})), lrIn));
  c.appendChild(h('div',{cls:'btn-row'}, stepBtn, runBtn, resetBtn));
  c.appendChild(h('div',{cls:'demo-stage'},
    h('div',{cls:'demo-col'}, canvas),
    h('div',{cls:'demo-col'}, info)
  ));
  function loss(){ let s=0; for(const [x,y] of data){ const e=(w*x+b)-y; s+=e*e; } return s/data.length; }
  function trainStep(){
    let gw=0,gb=0; for(const [x,y] of data){ const e=(w*x+b)-y; gw+=2*e*x; gb+=2*e; }
    gw/=data.length; gb/=data.length;
    w-=lr*gw; b-=lr*gb; lossHist.push(loss());
    render(gw,gb);
  }
  function render(gw,gb){
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,320,200);
    ctx.fillStyle='#fbfbfd'; ctx.fillRect(0,0,320,200);
    // loss curve
    const maxL=Math.max(0.01,...lossHist);
    ctx.strokeStyle='#3b5bdb'; ctx.lineWidth=2; ctx.beginPath();
    lossHist.forEach((l,i)=>{ const x=10+i*(300/Math.max(1,lossHist.length-1)); const y=190-(l/maxL)*170; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.stroke();
    ctx.fillStyle='#5a6275'; ctx.font='11px monospace'; ctx.fillText('loss',6,14);
    if(gw!==undefined) info.innerHTML=`参数: <b>w=${w.toFixed(3)}</b>, <b>b=${b.toFixed(3)}</b><br>Loss=${loss().toFixed(4)}<br>∂L/∂w=${gw.toFixed(3)}, ∂L/∂b=${gb.toFixed(3)}<br>（梯度指向损失上升方向，故反向更新）`;
    else info.innerHTML=`参数: w=${w.toFixed(3)}, b=${b.toFixed(3)}　Loss=${loss().toFixed(4)}（目标 ≈ w=3, b=−1）`;
  }
  render();
};

/* ================= 07 KV cache（步进） ================= */
DEMOS.kvcache=function(c){
  const inputTok=['The','cat','sat'];
  const genTok=['on','the','mat','.'];
  const perTokKB=512; // 7B 估算
  const stage=h('div',{cls:'demo-stage'});
  const boxIn=h('div',{cls:'demo-col'}); const boxCache=h('div',{cls:'demo-col'});
  c.appendChild(stage); stage.appendChild(boxIn); stage.appendChild(boxCache);
  const note=h('div',{cls:'demo-note'}); c.appendChild(note);
  function render(step){
    boxIn.innerHTML=''; boxCache.innerHTML='';
    const prefillDone = step===0;
    const genCount = step>0 ? step : 0;
    const cacheLen = inputTok.length + genCount;
    boxIn.appendChild(h('div',{cls:'demo-title',text:'输入序列（Prefill）'}));
    const row=h('div',{attrs:{style:'display:flex;flex-wrap:wrap;gap:5px'}});
    inputTok.forEach(t=>row.appendChild(h('span',{cls:'kv',attrs:{style:'padding:6px 9px'},text:t})));
    boxIn.appendChild(row);
    if(step>0){
      boxIn.appendChild(h('div',{attrs:{style:'margin-top:8px;font-weight:600'},text:'已生成（逐字 Decode）'}));
      const r2=h('div',{attrs:{style:'display:flex;flex-wrap:wrap;gap:5px'}});
      for(let i=0;i<genCount;i++) r2.appendChild(h('span',{cls:'kv',attrs:{style:'padding:6px 9px;background:#e7ecff'},text:genTok[i]}));
      boxIn.appendChild(r2);
    }
    boxCache.appendChild(h('div',{cls:'demo-title',text:'KV Cache'}));
    boxCache.appendChild(h('div',{html:`已缓存 <b>${cacheLen}</b> 个 token 的 K/V`}));
    boxCache.appendChild(h('div',{html:`占用显存 ≈ <b>${fmtBytes(cacheLen*perTokKB*1024)}</b>`}));
    const cr=h('div',{attrs:{style:'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px'}});
    for(let i=0;i<cacheLen;i++){
      const isNew = i>=inputTok.length; // 本步新增
      cr.appendChild(h('span',{cls:'kv',attrs:{style:'padding:4px 7px;font-size:11px'+(isNew?'background:#e7ecff;border-color:#3b5bdb':'')},text:(i<inputTok.length?inputTok[i]:genTok[i-inputTok.length])}));
    }
    boxCache.appendChild(cr);
    const texts=[
      'Prefill：把整段输入一次性前向，算出每个 token 的 K/V 并写入缓存（这一步最重，所以首字慢）。',
      'Decode 第 1 步：只为新 token「on」算 Q/K/V，K/V 追加进缓存；attention 复用全部缓存，本步仅新增 1 个 token 的计算。',
      'Decode 第 2 步：追加「the」，缓存继续长大，每步只算 1 个新 token。',
      'Decode 第 3 步：追加「mat」。可见缓存随长度线性膨胀，这是长上下文吃显存的根源。',
      'Decode 第 4 步：追加「.」，生成结束。'
    ];
    note.innerHTML='当前：'+texts[Math.min(step,texts.length-1)];
  }
  HUD.show('KV Cache 生成推演',genTok.length+1,render);
};

/* ================= 08 context window ================= */
DEMOS.context=function(c){
  const lens=[1024,4096,16384,32768,65536,131072,262144,524288,1048576];
  const labels=lens.map(l=>l>=1048576?(l/1048576)+'M':(l/1024)+'K');
  const slider=h('input',{attrs:{type:'range',min:'0',max:String(lens.length-1),step:'1',value:'3'},on:{input:calc}});
  const out=h('div',{cls:'demo-col'});
  const scaleBox=h('div',{cls:'demo-col'});
  c.appendChild(h('div',{cls:'demo-title',text:'拖动选择上下文长度'}));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{},'长度 ',h('span',{id:'ctx-l',text:'32K'})), slider));
  c.appendChild(h('div',{cls:'demo-stage'}, out, scaleBox));
  function calc(){
    const idx=+slider.value; const n=lens[idx];
    document.getElementById('ctx-l').textContent=labels[idx];
    const scores=n*n;
    const kv=n*512*1024;
    const rel=scores/(1024*1024);
    out.innerHTML='';
    out.appendChild(h('div',{cls:'demo-title',text:'该长度下的代价'}));
    out.appendChild(barRow('注意力分数 n²',scores,1048576*1048576, scores.toExponential(2)));
    out.appendChild(barRow('KV 缓存(bytes)',kv,1048576*512*1024, fmtBytes(kv)));
    out.appendChild(barRow('相对 1K 成本(分数)',rel,rel, rel.toExponential(2)+'×'));
    scaleBox.innerHTML='';
    scaleBox.appendChild(h('div',{cls:'demo-title',text:'翻倍对照'}));
    const idxs=[0,1,Math.min(8,idx+1)];
    idxs.forEach(i=>{
      scaleBox.appendChild(h('div',{cls:'fact'},h('span',{cls:'dot'}),h('span',{html:`<b>${labels[i]}</b>：分数 ${(lens[i]*lens[i]).toExponential(1)}，KV ${fmtBytes(lens[i]*512*1024)}`})));
    });
  }
  calc();
};

/* ================= 09 scaling law ================= */
DEMOS.scaling=function(c){
  const pts=[[1e7,3.40],[1e8,2.95],[1e9,2.56]];
  // log-log linear fit
  const xs=pts.map(p=>Math.log(p[0])), ys=pts.map(p=>Math.log(p[1]));
  const n=xs.length, mx=xs.reduce((a,b)=>a+b)/n, my=ys.reduce((a,b)=>a+b)/n;
  let num_=0,den_=0; for(let i=0;i<n;i++){num_+=(xs[i]-mx)*(ys[i]-my);den_+=(xs[i]-mx)**2;}
  const alpha=-num_/den_; const lna=my+alpha*mx; const a=Math.exp(lna);
  const canvas=h('canvas',{attrs:{width:'420',height:'260'}});
  const slider=h('input',{attrs:{type:'range',min:'7',max:'12',step:'0.1',value:'10'},on:{input:draw}});
  const info=h('div',{cls:'demo-note'});
  c.appendChild(h('div',{cls:'demo-title',text:'Scaling Law：损失随规模幂律下降'}));
  c.appendChild(canvas);
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{},'目标参数量 N（log10） ',h('span',{id:'sc-n',text:'1e10'})), slider));
  c.appendChild(info);
  function predict(N){ return a*Math.pow(N,-alpha); }
  function draw(){
    const N=Math.pow(10,+slider.value); document.getElementById('sc-n').textContent='1e'+slider.value;
    const L=predict(N);
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,420,260);
    const x0=45,y0=230,x1=400,y1=20;
    const lx0=Math.log10(1e6),lx1=Math.log10(1e12);
    const ly0=2.2,ly1=3.5;
    const X=lx=>x0+(lx-lx0)/(lx1-lx0)*(x1-x0);
    const Y=ly=>y0+(ly-ly1)/(ly0-ly1)*(y1-y0);
    ctx.strokeStyle='#e6e8ee'; ctx.lineWidth=1;
    for(let g=2.5;g<=3.4;g+=0.25){ ctx.beginPath();ctx.moveTo(x0,Y(g));ctx.lineTo(x1,Y(g));ctx.stroke(); }
    ctx.fillStyle='#5a6275'; ctx.font='10px monospace';
    ctx.fillText('log Loss',2,Y(3.4)+4); ctx.fillText('log N →',x1-44,y0+14);
    // fitted line
    ctx.strokeStyle='#e8a33d'; ctx.lineWidth=2; ctx.beginPath();
    [lx0,lx1].forEach((lx,i)=>{ const N=Math.pow(10,lx); const ly=Math.log10(predict(N)); const yy=Y(ly); i?ctx.lineTo(X(lx),yy):ctx.moveTo(X(lx),yy); });
    ctx.stroke();
    // points
    pts.forEach(p=>{ ctx.fillStyle='#3b5bdb'; ctx.beginPath(); ctx.arc(X(Math.log10(p[0])),Y(p[1]),4,0,7); ctx.fill();
      ctx.fillStyle='#1b1f2a'; ctx.fillText(p[0]>=1e9?'1B':(p[0]>=1e8?'100M':'10M'),X(Math.log10(p[0]))-10,Y(p[1])-8); });
    // target
    ctx.fillStyle='#e03131'; ctx.beginPath(); ctx.arc(X(Math.log10(N)),Y(L),5,0,7); ctx.fill();
    ctx.fillStyle='#e03131'; ctx.fillText('N',X(Math.log10(N))-4,Y(L)-8);
    info.innerHTML=`拟合：L ≈ ${a.toFixed(2)} · N<sup>−${alpha.toFixed(4)}</sup>（α≈${alpha.toFixed(4)}）。当前 N=1e${slider.value} → 预测 Loss ≈ <b>${L.toFixed(3)}</b>。从 1B(2.56) 外推 10B ≈ 2.22。`;
  }
  draw();
};

/* ================= 10 agent（步进） ================= */
DEMOS.agent=function(c){
  const steps=[
    {role:'user',content:'请统计当前目录 .py 文件数量，并写入 report.txt'},
    {role:'assistant',content:'调用工具 list_files(path=".")',tool:'list_files'},
    {role:'tool',content:'["a.py","b.py","c.py"]（共 3 个）'},
    {role:'assistant',content:'调用工具 write_file("report.txt","3")',tool:'write_file'},
    {role:'tool',content:'ok'},
    {role:'assistant',content:'已完成：当前目录共有 3 个 .py 文件，已写入 report.txt。'}
  ];
  let toks=12;
  const box=h('div',{cls:'demo-col'});
  const trace=h('div',{cls:'demo-col'});
  c.appendChild(h('div',{cls:'demo-title',text:'Agent 循环：统计 .py 并写文件'}));
  c.appendChild(h('div',{cls:'demo-stage'}, box, trace));
  const note=h('div',{cls:'demo-note'}); c.appendChild(note);
  function render(step){
    box.innerHTML=''; trace.innerHTML='';
    steps.forEach((s,i)=>{
      const active=i===step;
      const color=s.role==='user'?'#3b5bdb':s.role==='tool'?'#2f9e44':'#7048e8';
      const div=h('div',{attrs:{style:`border-left:3px solid ${color};padding:7px 10px;margin:6px 0;border-radius:0 8px 8px 0;background:${active?'#e7ecff':'#fbfbfd'};font-size:13px`}});
      div.appendChild(h('b',{text:s.role+' '}));
      div.appendChild(h('span',{text:s.content}));
      box.appendChild(div);
    });
    // token growth
    let cum=12; const growth=[];
    for(let i=0;i<=step;i++){ growth.push(cum); if(steps[i].role!=='user') cum+=steps[i].content.length*0.3+8; else cum+=10; }
    trace.appendChild(h('div',{cls:'demo-title',text:'上下文 token 增长'}));
    trace.appendChild(h('div',{html:`当前累计 ≈ <b>${Math.round(growth[step])}</b> token`}));
    const maxG=Math.round(growth[growth.length-1]);
    growth.forEach((g,i)=>trace.appendChild(barRow('步'+(i+1),g,maxG,String(Math.round(g)))));
    const texts=[
      '① 用户给出目标，写入 messages（上下文初始化）。',
      '② 模型读 messages，决定调用 list_files 而非直接答——这是 Agent 的关键：输出 tool_calls。',
      '③ 环境执行工具，把结果写回 messages。',
      '④ 模型再读（更长的）messages，决定写入文件。',
      '⑤ 工具返回 ok，结果再次写回。',
      '⑥ 模型判断任务完成，给出最终自然语言回答。可见上下文随每步线性增长。'
    ];
    note.innerHTML='当前：'+texts[step];
  }
  HUD.show('Agent 六步轨迹',steps.length,render);
};

/* ================= 11 multimodal ================= */
DEMOS.multimodal=function(c){
  const SIZE=224;
  const slider=h('input',{attrs:{type:'range',min:'0',max:'2',step:'1',value:'1'},on:{input:draw}});
  const patchSizes=[8,16,28];
  const canvas=h('canvas',{attrs:{width:String(SIZE),height:String(SIZE)}});
  const out=h('div',{cls:'demo-note'});
  c.appendChild(h('div',{cls:'demo-title',text:'图像 → patch → token'}));
  c.appendChild(canvas);
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{},'patch 尺寸 ',h('span',{id:'mm-p',text:'16'}),'（网格 '+(SIZE/16)+'×'+(SIZE/16)+'）'), slider));
  c.appendChild(out);
  function draw(){
    const p=patchSizes[+slider.value];
    const grid=SIZE/p; document.getElementById('mm-p').textContent=p;
    const ctx=canvas.getContext('2d');
    // 画一个渐变图，便于看 patch
    const g=ctx.createLinearGradient(0,0,SIZE,SIZE); g.addColorStop(0,'#3b5bdb'); g.addColorStop(1,'#e8a33d');
    ctx.fillStyle=g; ctx.fillRect(0,0,SIZE,SIZE);
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1;
    for(let i=1;i<grid;i++){ ctx.beginPath();ctx.moveTo(i*p,0);ctx.lineTo(i*p,SIZE);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,i*p);ctx.lineTo(SIZE,i*p);ctx.stroke(); }
    const tok=grid*grid;
    out.innerHTML=`224×224、patch=${p} → 网格 ${grid}×${grid} = <b>${tok}</b> 个图像 token（每 token 展平 ${p*p*3} 维）。<br>若图放大到 448×448，token 数翻 <b>4 倍</b> → ${tok*4}（面积翻倍→4×），更费上下文与算力。`;
  }
  draw();
};

/* ================= 12 GPU ================= */
DEMOS.gpu=function(c){
  const chips=[{name:'H100',bw:3350},{name:'A100',bw:2000},{name:'CPU DDR5',bw:80}];
  const models=[{name:'7B',p:7e9},{name:'13B',p:13e9},{name:'70B',p:70e9}];
  let ci=0,mi=0;
  const chipSel=h('select',{on:{change:()=>{ci=+chipSel.value;calc();}}});
  chips.forEach((c2,i)=>chipSel.appendChild(h('option',{text:c2.name,attrs:{value:String(i)}})));
  const modSel=h('select',{on:{change:()=>{mi=+modSel.value;calc();}}});
  models.forEach((m,i)=>modSel.appendChild(h('option',{text:m.name,attrs:{value:String(i)}})));
  const bars=h('div');
  const info=h('div',{cls:'demo-note'});
  c.appendChild(h('div',{cls:'demo-title',text:'Decode 单步延迟 ≈ 参数字节 ÷ 带宽'}));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'芯片'}), chipSel));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'模型'}), modSel));
  c.appendChild(bars); c.appendChild(info);
  function calc(){
    const chip=chips[ci], model=models[mi];
    const bytes=model.p*2;
    const ms=bytes/(chip.bw*1e9)*1000;
    bars.innerHTML='';
    chips.forEach(ch=>{ const m=bytes/(ch.bw*1e9)*1000;
      bars.appendChild(barRow(ch.name, m, 200, m.toFixed(1)+' ms')); });
    const trainVR=model.p*2*18; // 约 18 bytes/param 训练
    info.innerHTML=`${model.name} fp16 = <b>${fmtBytes(bytes)}</b>。<br>${chip.name} 单步理论延迟 ≈ <b>${ms.toFixed(1)} ms</b>（实测约数：CPU 200–500ms，A100 5–10ms，差异来自 kernel/并行开销）。<br>训练显存估算 ≈ ${fmtBytes(trainVR)}（参数+梯度+优化器+激活，约 18 字节/参数）。`;
  }
  calc();
};

/* ================= 13 pricing ================= */
DEMOS.pricing=function(c){
  const models=[
    {name:'DeepSeek V4 Pro',hit:1,input:12,output:24},
    {name:'Flash',hit:0.2,input:1,output:2}
  ];
  let mi=0;
  const mSel=h('select',{on:{change:()=>{mi=+mSel.value;calc();}}});
  models.forEach((m,i)=>mSel.appendChild(h('option',{text:m.name,attrs:{value:String(i)}})));
  const hit=h('input',{attrs:{type:'number',value:'1500'},on:{input:calc}});
  const nin=h('input',{attrs:{type:'number',value:'500'},on:{input:calc}});
  const out=h('input',{attrs:{type:'number',value:'800'},on:{input:calc}});
  const bars=h('div'); const info=h('div',{cls:'demo-note'});
  c.appendChild(h('div',{cls:'demo-title',text:'API 费用核算（元 / 百万 token）'}));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'模型'}), mSel));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'命中缓存输入'}), hit));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'新增输入'}), nin));
  c.appendChild(h('div',{cls:'ctrl'}, h('label',{text:'输出'}), out));
  c.appendChild(bars); c.appendChild(info);
  function calc(){
    const m=models[mi];
    const H=+hit.value||0,I=+nin.value||0,O=+out.value||0;
    const cH=H*m.hit/1e6, cI=I*m.input/1e6, cO=O*m.output/1e6;
    const total=cH+cI+cO;
    bars.innerHTML='';
    bars.appendChild(barRow('命中缓存 ×'+m.hit, cH, Math.max(total,1e-6), '¥'+cH.toFixed(4)));
    bars.appendChild(barRow('新增输入 ×'+m.input, cI, Math.max(total,1e-6), '¥'+cI.toFixed(4)));
    bars.appendChild(barRow('输出 ×'+m.output, cO, Math.max(total,1e-6), '¥'+cO.toFixed(4)));
    info.innerHTML=`总价 ≈ <b>¥${total.toFixed(4)}</b>。输出单价最高（${m.output}），所以「少输出、多复用缓存」最省钱。把输出从 ${O} 压到 ${Math.round(O/2)} 可省约 ¥${((cO)/2).toFixed(4)}。`;
  }
  calc();
};

/* ================= 14 thinking ================= */
DEMOS.thinking=function(c){
  const priceOut=24; // 元/百万
  let inp=100, outN=200, think=800, accN=0.60, accT=0.85;
  const sliders=[
    {k:'inp',l:'输入 token',v:100,mn:0,mx:2000},
    {k:'outN',l:'非思考输出',v:200,mn:50,mx:2000},
    {k:'think',l:'思考 token',v:800,mn:0,mx:4000},
    {k:'accN',l:'非思考准确率',v:0.60,mn:0.1,mx:1,step:0.01},
    {k:'accT',l:'思考准确率',v:0.85,mn:0.1,mx:1,step:0.01}
  ];
  const wrap=h('div');
  c.appendChild(h('div',{cls:'demo-title',text:'思考 vs 非思考：期望正确成本'}));
  const bars=h('div'); const info=h('div',{cls:'demo-note'});
  const refs={};
  sliders.forEach(s=>{
    const span=h('span',{text:String(s.v)});
    const inp=h('input',{attrs:{type:'range',min:String(s.mn),max:String(s.mx),step:String(s.step||1),value:String(s.v)},on:{input:()=>{refs[s.k]=parseFloat(inp.value);span.textContent=inp.value;calc();}}});
    refs[s.k]=s.v;
    wrap.appendChild(h('div',{cls:'ctrl'}, h('label',{},s.l+' ',span), inp));
  });
  c.appendChild(wrap); c.appendChild(bars); c.appendChild(info);
  function calc(){
    inp=refs.inp;outN=refs.outN;think=refs.think;accN=refs.accN;accT=refs.accT;
    const cN=(inp+outN)*priceOut/1e6;
    const cT=(inp+think+outN)*priceOut/1e6;
    const eN=cN/accN, eT=cT/accT;
    bars.innerHTML='';
    bars.appendChild(barRow('非思考费用',cN,Math.max(cN,cT),'¥'+cN.toFixed(3)));
    bars.appendChild(barRow('思考费用',cT,Math.max(cN,cT),'¥'+cT.toFixed(3)));
    bars.appendChild(barRow('非思考·正确期望',eN,Math.max(eN,eT),'¥'+eN.toFixed(3)));
    bars.appendChild(barRow('思考·正确期望',eT,Math.max(eN,eT),'¥'+eT.toFixed(3)));
    const better = eT<eN ? '思考更划算' : '非思考更划算';
    info.innerHTML=`思考费用约为非思考 <b>${(cT/cN).toFixed(1)}×</b>。但按「每次正确回答的期望成本」=费用/准确率：非思考 ¥${eN.toFixed(3)}，思考 ¥${eT.toFixed(3)} → <b>${better}</b>。当答错代价高时，思考值得。`;
  }
  calc();
};

/* ================= 15 MoE ================= */
DEMOS.moe=function(c){
  const total='1.6T', active='49B';
  const experts=8, topk=2;
  const boxes=h('div',{attrs:{style:'display:flex;flex-wrap:wrap;gap:8px'}});
  const info=h('div',{cls:'demo-note'});
  const btn=h('button',{cls:'btn',text:'重新路由 →',on:{click:route}});
  c.appendChild(h('div',{cls:'demo-title',text:'Router：每个 token 选 top-'+topk+' 专家'}));
  c.appendChild(h('div',{cls:'btn-row'}, btn));
  c.appendChild(boxes); c.appendChild(info);
  function route(){
    boxes.innerHTML='';
    const logits=[]; for(let i=0;i<experts;i++) logits.push(Math.random()*2-1);
    const exp=logits.map(l=>Math.exp(l)); const sum=exp.reduce((a,b)=>a+b);
    const gates=exp.map(e=>e/sum);
    const order=logits.map((l,i)=>i).sort((a,b)=>logits[b]-logits[a]);
    const chosen=order.slice(0,topk);
    for(let i=0;i<experts;i++){
      const on=chosen.includes(i);
      const b=h('div',{attrs:{style:`width:84px;padding:10px;border-radius:10px;text-align:center;font-family:monospace;font-size:12px;border:2px solid ${on?'#3b5bdb':'#e6e8ee'};background:${on?'#e7ecff':'#fff'}`}});
      b.appendChild(h('div',{text:'专家'+(i+1)}));
      b.appendChild(h('div',{text:'g='+gates[i].toFixed(2)}));
      b.appendChild(h('div',{text:on?'✓激活':'—'}));
      boxes.appendChild(b);
    }
    info.innerHTML=`总参数 <b>${total}</b>（全部专家+注意力，需装入显存），但本 token 只激活 top-${topk}/${experts} ≈ <b>${(topk/experts*100).toFixed(0)}%</b> 的 FFN 计算（激活参数约 ${active}）。容量与单次计算被解耦。`;
  }
  route();
};

/* ================= 16 operators ================= */
DEMOS.operators=function(c){
  const count={'LayerNorm':2,'Q/K/V MatMul':3,'Reshape/Transpose':2,'QKᵀ MatMul':1,'Scale':1,'Mask':1,'Softmax':1,'AV MatMul':1,'W_O MatMul':1,'Add(残差)':2,'FFN MatMul':2,'GELU':1};
  const total=Object.values(count).reduce((a,b)=>a+b);
  const stdTrips=3, flashTrips=1;
  const toggle=h('button',{cls:'btn',text:'切换：标准 ↔ FlashAttention',on:{click:()=>flip()}});
  let flash=false;
  const viz=h('div');
  const info=h('div',{cls:'demo-note'});
  c.appendChild(h('div',{cls:'demo-title',text:'单层 Transformer 算子清单（约 '+total+' 个）'}));
  const list=h('div',{attrs:{style:'columns:2;column-gap:18px;font-size:13px'}});
  Object.keys(count).forEach(k=>list.appendChild(h('div',{cls:'fact'},h('span',{cls:'dot'}),h('span',{text:k+' ×'+count[k]}))));
  c.appendChild(list);
  c.appendChild(h('div',{cls:'btn-row'}, toggle));
  c.appendChild(viz); c.appendChild(info);
  function flip(){ flash=!flash; draw(); }
  function draw(){
    viz.innerHTML='';
    viz.appendChild(h('div',{cls:'demo-title',text:'Attention 显存往返：'+(flash?'FlashAttention（融合）':'标准实现')}));
    const trips=flash?flashTrips:stdTrips;
    const labelsSeq=flash?['算 S','算 P','算 O','写回 O 1 次']:['写 S','读 S','写 P','读 P','写 O','读 O'];
    const row=h('div',{attrs:{style:'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px'}});
    labelsSeq.forEach((l,i)=>{
      row.appendChild(h('span',{cls:'kv',attrs:{style:'padding:6px 9px'},text:l}));
      if(i<labelsSeq.length-1) row.appendChild(h('span',{text:'⇄',attrs:{style:'color:#e03131;font-weight:700'}}));
    });
    viz.appendChild(row);
    const saved=Math.round((1-flashTrips/stdTrips)*100);
    info.innerHTML=`标准实现：S、P、O 各自写回显存再读回 → <b>${stdTrips} 次往返</b>。FlashAttention 在片上缓存一次算完，只写回 O → <b>${flashTrips} 次往返</b>，省 <b>${saved}%</b> 的 HBM 往返（省的是带宽，不是算力）。`;
  }
  draw();
};

/* 暴露 */
window.DEMOS=DEMOS;
window.__HUD=HUD;
})();
