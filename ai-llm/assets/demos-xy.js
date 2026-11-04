/* ============================================================
   AI 大模型 30 课 · 交互演示集合
   每个演示：fn(box) 直接在容器内渲染并绑定事件
   ============================================================ */
(function(){
'use strict';
const D = {};
function E(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html !== undefined) e.innerHTML = html;
  return e;
}
function add(box, tag, cls, html){ const e = E(tag, cls, html); box.appendChild(e); return e; }
function slider(box, label, min, max, step, val, cb){
  const r = add(box, 'div', 'demo-row');
  add(r, 'label', '', label);
  const i = document.createElement('input');
  i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
  r.appendChild(i);
  const v = add(r, 'span', 'val', String(val));
  i.addEventListener('input', () => { v.textContent = i.value; cb(parseFloat(i.value)); });
  return { get: () => parseFloat(i.value), el: i, set: x => { i.value = x; v.textContent = String(x); cb(parseFloat(i.value)); } };
}
function outbox(box){ const o = add(box, 'div', 'demo-out'); return t => { o.textContent = t; }; }
function svgbox(box, w, h){
  const wrap = add(box, 'div', '', '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img"></svg>');
  return wrap.querySelector('svg');
}
function bars(box, labels){
  const wrap = add(box, 'div', 'demo-bars');
  const els = labels.map(l => { const b = add(wrap, 'div', 'bar', '<span>' + l + '</span>'); return b; });
  const leg = add(box, 'div', 'demo-legend');
  return vals => {
    const mx = Math.max.apply(null, vals.map(x => Math.abs(x))) || 1;
    vals.forEach((v, i) => {
      els[i].style.height = Math.max(3, Math.abs(v) / mx * 88) + 'px';
      els[i].style.background = v < 0 ? '#C0481E' : '#3E6B8F';
      els[i].firstChild.textContent = (Math.round(v * 1000) / 1000).toString();
    });
    leg.textContent = '数值已按最大值归一化显示高度，柱上数字为实际值';
  };
}
function btns(box, defs){
  const w = add(box, 'div', '');
  defs.forEach(d => { const b = add(w, 'button', 'demo-btn', d[0]); b.addEventListener('click', d[1]); });
  return w;
}
function reg(id, vol, lesson, title, desc, fn){ D[id] = { id, vol, lesson, title, desc, fn }; }
const f = (x, n) => (Math.round(x * Math.pow(10, n || 3)) / Math.pow(10, n || 3)).toString();
function softmax(a, T){
  T = T || 1;
  const m = Math.max.apply(null, a);
  const e = a.map(x => Math.exp((x - m) / T));
  const s = e.reduce((x, y) => x + y, 0);
  return e.map(x => x / s);
}

/* ---------------- 卷一 · 基础数学 ---------------- */
reg('vecSim', 1, 1, '向量相似度：谁和谁更像', '拖动两个点的坐标，看欧氏距离与余弦相似度何时给出不同答案。', box => {
  const svg = svgbox(box, 320, 180), set = outbox(box);
  const xs = slider(box, 'A 的 x', -3, 3, .1, 1, draw);
  const ys = slider(box, 'A 的 y', -3, 3, .1, 2, draw);
  const xt = slider(box, 'B 的 x', -3, 3, .1, 2, draw);
  const yt = slider(box, 'B 的 y', -3, 3, .1, 1, draw);
  function draw(){
    const a = [xs.get(), ys.get()], b = [xt.get(), yt.get()];
    const px = v => 160 + v[0] * 38, py = v => 90 - v[1] * 38;
    const dist = Math.hypot(a[0]-b[0], a[1]-b[1]);
    const dot = a[0]*b[0]+a[1]*b[1];
    const na = Math.hypot(a[0],a[1]) || 1e-9, nb = Math.hypot(b[0],b[1]) || 1e-9;
    const cos = dot/(na*nb);
    svg.innerHTML = '<line x1="10" y1="90" x2="310" y2="90" stroke="#ddd2ba"/>' +
      '<line x1="160" y1="10" x2="160" y2="170" stroke="#ddd2ba"/>' +
      '<line x1="160" y1="90" x2="'+px(a)+'" y2="'+py(a)+'" stroke="#3E6B8F" stroke-width="2"/>' +
      '<line x1="160" y1="90" x2="'+px(b)+'" y2="'+py(b)+'" stroke="#C0481E" stroke-width="2"/>' +
      '<circle cx="'+px(a)+'" cy="'+py(a)+'" r="5" fill="#3E6B8F"/><circle cx="'+px(b)+'" cy="'+py(b)+'" r="5" fill="#C0481E"/>' +
      '<text x="'+(px(a)+7)+'" y="'+(py(a)-7)+'" font-size="11">A</text><text x="'+(px(b)+7)+'" y="'+(py(b)-7)+'" font-size="11">B</text>';
    set('A=('+a+')  B=('+b+')\n欧氏距离 |A−B| = ' + f(dist) + '（越小越近）\n点积 A·B = ' + f(dot) + '\n|A|='+f(na)+'  |B|='+f(nb)+'\n余弦相似度 = ' + f(cos) + '（越接近 1 方向越一致）\n' +
      (cos > .9 && dist > 1 ? '方向几乎一致但距离很远：只看余弦会漏掉「大小」信息。' : '两种度量都认为它们比较接近。'));
  }
  draw();
});

reg('dotCos', 1, 2, '点积与余弦：夹角怎么算出来', '调两个二维向量，实时看 A·B = |A||B|cosθ 的每一项。', box => {
  const svg = svgbox(box, 320, 160), set = outbox(box);
  const s1 = slider(box, 'A.x', -3, 3, .1, 2, draw), s2 = slider(box, 'A.y', -3, 3, .1, 0, draw);
  const s3 = slider(box, 'B.x', -3, 3, .1, 1, draw), s4 = slider(box, 'B.y', -3, 3, .1, 2, draw);
  function draw(){
    const a=[s1.get(),s2.get()], b=[s3.get(),s4.get()];
    const dot=a[0]*b[0]+a[1]*b[1], na=Math.hypot(a[0],a[1])||1e-9, nb=Math.hypot(b[0],b[1])||1e-9;
    const cos=Math.max(-1,Math.min(1,dot/(na*nb))), ang=Math.acos(cos)*180/Math.PI;
    const P=v=>[160+v[0]*38,80-v[1]*30];
    svg.innerHTML='<line x1="10" y1="80" x2="310" y2="80" stroke="#ddd2ba"/><line x1="160" y1="10" x2="160" y2="150" stroke="#ddd2ba"/>'+
      '<line x1="160" y1="80" x2="'+P(a)[0]+'" y2="'+P(a)[1]+'" stroke="#3E6B8F" stroke-width="3"/>'+
      '<line x1="160" y1="80" x2="'+P(b)[0]+'" y2="'+P(b)[1]+'" stroke="#C0481E" stroke-width="3"/>';
    set('A·B = '+f(a[0]*b[0])+' + '+f(a[1]*b[1])+' = '+f(dot)+'\n|A|·|B| = '+f(na)+' × '+f(nb)+' = '+f(na*nb)+
      '\ncosθ = '+f(cos)+'   θ ≈ '+f(ang,1)+'°\n'+(dot>0?'锐角：方向相近':dot<0?'钝角：方向相反':'正交：完全不相关'));
  }
  draw();
});

reg('linTrans', 1, 4, '线性变换：矩阵把空间「揉」成什么样', '调 2×2 矩阵的四个数，看单位网格被旋转、拉伸、翻转。', box => {
  const svg = svgbox(box, 320, 200), set = outbox(box);
  const a=slider(box,'a',-2,2,.1,1,draw), b=slider(box,'b',-2,2,.1,0,draw);
  const c=slider(box,'c',-2,2,.1,0,draw), d=slider(box,'d',-2,2,.1,1,draw);
  function draw(){
    const A=[[a.get(),b.get()],[c.get(),d.get()]];
    const P=(x,y)=>[160+(A[0][0]*x+A[0][1]*y)*38, 100-(A[1][0]*x+A[1][1]*y)*38];
    let g='';
    for(let k=-3;k<=3;k++){
      const p1=P(k,-3), p2=P(k,3), p3=P(-3,k), p4=P(3,k);
      g+='<line x1="'+p1[0]+'" y1="'+p1[1]+'" x2="'+p2[0]+'" y2="'+p2[1]+'" stroke="#cfc3a8" stroke-width=".8"/>';
      g+='<line x1="'+p3[0]+'" y1="'+p3[1]+'" x2="'+p4[0]+'" y2="'+p4[1]+'" stroke="#cfc3a8" stroke-width=".8"/>';
    }
    const ex=P(1,0), ey=P(0,1), o=[160,100];
    g+='<line x1="'+o[0]+'" y1="'+o[1]+'" x2="'+ex[0]+'" y2="'+ex[1]+'" stroke="#3E6B8F" stroke-width="3"/>'+
       '<line x1="'+o[0]+'" y1="'+o[1]+'" x2="'+ey[0]+'" y2="'+ey[1]+'" stroke="#C0481E" stroke-width="3"/>';
    svg.innerHTML='<line x1="10" y1="100" x2="310" y2="100" stroke="#e0d6bd"/><line x1="160" y1="10" x2="160" y2="190" stroke="#e0d6bd"/>'+g;
    const det=A[0][0]*A[1][1]-A[0][1]*A[1][0];
    set('矩阵 [[a,b],[c,d]] = [['+a.get()+','+b.get()+'],['+c.get()+','+d.get()+']]\n'+
      '基向量 e1=(1,0) → ('+A[0][0]+','+A[1][0]+')\ne2=(0,1) → ('+A[0][1]+','+A[1][1]+')\n'+
      '行列式 det = '+f(det)+'  → 面积放大 '+f(Math.abs(det))+' 倍'+(det<0?'，且发生镜像翻转':'')+(Math.abs(det)<.01?'，空间被压扁了！':''));
  }
  draw();
});

reg('gradDesc', 1, 5, '梯度下降：学习率太大为什么会飞出去', '在 y=(x−1)² 上迭代，调学习率与起点，看收敛还是震荡发散。', box => {
  const svg=svgbox(box,320,180), set=outbox(box);
  const lr=slider(box,'学习率',.05,1.9,.05,.3,()=>reset());
  const x0=slider(box,'起点 x',-2,4,.1,-1.5,()=>reset());
  let x=-1.5, n=0;
  function reset(){ x=x0.get(); n=0; draw(); }
  function draw(){
    const px=v=>160+v*45, py=v=>160-(v-1)*(v-1)*22;
    let curve='';
    for(let t=-2;t<=4;t+=.1) curve+='<circle cx="'+px(t)+'" cy="'+py(t)+'" r=".8" fill="#3E6B8F"/>';
    svg.innerHTML=curve+'<circle cx="'+px(x)+'" cy="'+py(x)+'" r="6" fill="#C0481E"/>';
    set('第 '+n+' 步：x = '+f(x)+'   梯度 = 2(x−1) = '+f(2*(x-1))+'   loss = '+f((x-1)*(x-1))+
      '\n'+(Math.abs(x)>8?'已经发散：学习率过大，步长越走越大。':Math.abs(x-1)<.02?'收敛到最低点 x=1 ✓':'点「走一步」继续迭代'));
  }
  btns(box,[['走一步',()=>{ x=x-lr.get()*2*(x-1); n++; if(Math.abs(x)>8)x=8.1; draw(); }],['重置',reset]]);
  reset();
});

reg('entropy', 1, 6, '交叉熵：预测错得越离谱，罚得越狠', '调模型给正确答案的概率 p，看 −log p 与二分类交叉熵怎么变。', box => {
  const svg=svgbox(box,320,150), set=outbox(box);
  const p=slider(box,'正确类概率 p',.01,.99,.01,.7,draw);
  function draw(){
    const v=p.get(), L=-Math.log(v);
    let path='';
    for(let t=.01;t<=1;t+=.01) path+='<circle cx="'+(20+t*280)+'" cy="'+(130+Math.log(t)*22)+'" r=".8" fill="#3E6B8F"/>';
    svg.innerHTML=path+'<circle cx="'+(20+v*280)+'" cy="'+(130+Math.log(v)*22)+'" r="5" fill="#C0481E"/>';
    const ce=-(1*Math.log(v)+0*Math.log(1-v));
    set('p(正确类) = '+f(v,2)+'   −log p = '+f(L)+'\n二分类交叉熵（标签 y=1）= '+f(ce)+
      '\n若 p=0.5 → loss='+f(-Math.log(.5))+'；p=0.01 → loss='+f(-Math.log(.01))+
      '\n给对的事越不自信，惩罚增长得越快，这就是「可导的概率化打分」。');
  }
  draw();
});

/* ---------------- 卷二 · 神经网络 ---------------- */
reg('neuron', 2, 7, '一个神经元：加权投票到输出', '调两个输入、两个权重和偏置，看加权和如何被激活函数变成输出。', box => {
  const set=outbox(box), bar=bars(box,['z','sigmoid','ReLU']);
  const x1=slider(box,'x1',-2,2,.1,1,draw), x2=slider(box,'x2',-2,2,.1,.5,draw);
  const w1=slider(box,'w1',-2,2,.1,.8,draw), w2=slider(box,'w2',-2,2,.1,-1.2,draw);
  const b=slider(box,'b',-2,2,.1,.3,draw);
  function draw(){
    const z=x1.get()*w1.get()+x2.get()*w2.get()+b.get();
    const sig=1/(1+Math.exp(-z)), relu=Math.max(0,z);
    set('z = '+f(x1.get())+'×'+f(w1.get())+' + '+f(x2.get())+'×'+f(w2.get())+' + '+f(b.get())+' = '+f(z)+
      '\nsigmoid(z) = '+f(sig)+'   ReLU(z) = '+f(relu)+'\n单个神经元只会「加权投票」，智能来自把它叠成很多层。');
    bar([z,sig,relu]);
  }
  draw();
});

reg('activation', 2, 8, '激活函数：为什么必须有个「弯」', '切换函数看曲线；对比 N 个线性层复合后仍是直线。', box => {
  const svg=svgbox(box,320,160), set=outbox(box);
  let kind='relu';
  btns(box,[['ReLU',()=>{kind='relu';draw();}],['Sigmoid',()=>{kind='sigmoid';draw();}],['tanh',()=>{kind='tanh';draw();}],['纯线性(对比)',()=>{kind='linear';draw();}]]);
  const n=slider(box,'叠加层数 N',1,8,1,3,draw);
  function F(x){ if(kind==='relu')return Math.max(0,x); if(kind==='sigmoid')return 1/(1+Math.exp(-x)); if(kind==='tanh')return Math.tanh(x); return x; }
  function draw(){
    let path='';
    for(let x=-3;x<=3;x+=.06){
      let y=x;
      for(let k=0;k<n.get();k++) y=F(y*.6);
      path+='<circle cx="'+(160+x*45)+'" cy="'+(80-y*32)+'" r=".9" fill="#3E6B8F"/>';
    }
    svg.innerHTML='<line x1="10" y1="80" x2="310" y2="80" stroke="#ddd2ba"/><line x1="160" y1="10" x2="160" y2="150" stroke="#ddd2ba"/>'+path;
    set('当前：'+kind+' × '+n.get()+' 层\n'+(kind==='linear'
      ? '无论叠多少层，输出仍是输入的一次函数 → 整个网络等价于一层，学不到复杂边界。'
      : '每层都引入一次非线性弯折，叠加后能拟合出复杂形状。'));
  }
  draw();
});

reg('lossFn', 2, 10, '损失函数：把「错得多离谱」变成一个数', '调预测概率 p（真实标签 y=1），对比 MSE、交叉熵、0-1 损失。', box => {
  const svg=svgbox(box,320,150), set=outbox(box);
  const p=slider(box,'预测 p',.01,.99,.01,.2,draw);
  function draw(){
    const v=p.get(), mse=(1-v)*(1-v), ce=-Math.log(v), z1=1;
    let a='',b='';
    for(let t=.01;t<=1;t+=.01){ a+='<circle cx="'+(20+t*280)+'" cy="'+(135-Math.min(5,-Math.log(t))*20)+'" r=".8" fill="#C0481E"/>';
      b+='<circle cx="'+(20+t*280)+'" cy="'+(135-(1-t)*(1-t)*80)+'" r=".8" fill="#3E6B8F"/>'; }
    svg.innerHTML=a+b+'<circle cx="'+(20+v*280)+'" cy="'+(135-Math.min(5,-Math.log(v))*20)+'" r="5" fill="#C0481E"/>';
    set('p='+f(v,2)+'（真实 y=1）\n交叉熵 = −log p = '+f(ce)+'   MSE = (1−p)² = '+f(mse)+'   0-1 损失 = '+z1+
      '\n交叉熵在 p→0 时陡增，梯度更大、学得更快；0-1 损失处处导数为 0，没法用梯度下降。');
  }
  draw();
});

reg('softmaxDemo', 2, 11, 'Softmax 与温度：把分数变成概率', '调 4 个 logits 和温度 T，看概率分布怎么被「抹平」或「 sharpen」。', box => {
  const set=outbox(box), bar=bars(box,['A','B','C','D']);
  const ss=[slider(box,'logit A',-3,5,.1,2,draw),slider(box,'logit B',-3,5,.1,1,draw),
            slider(box,'logit C',-3,5,.1,.2,draw),slider(box,'logit D',-3,5,.1,-1,draw)];
  const t=slider(box,'温度 T',.2,3,.1,1,draw);
  function draw(){
    const a=ss.map(s=>s.get()), p=softmax(a,t.get());
    set('logits = ['+a.map(x=>f(x,1)).join(', ')+']   T='+f(t.get(),1)+'\n概率 = ['+p.map(x=>f(x)).join(', ')+']\n总和 = '+f(p.reduce((x,y)=>x+y,0),4)+
      '\nT 越大分布越平（更敢探索）；T→0 时几乎只剩最大 logit 那一项。');
    bar(p);
  }
  draw();
});

reg('optimizer', 2, 12, 'SGD 与动量：下坡为什么要带惯性', '在同一条碗形曲线上对比两种优化器走到谷底需要几步。', box => {
  const svg=svgbox(box,320,160), set=outbox(box);
  const lr=slider(box,'学习率',.01,.5,.01,.12,()=>reset());
  const mo=slider(box,'动量 β',0,.95,.05,.8,()=>reset());
  let xs=-2.2, xm=-2.2, vs=0, vm=0, n=0;
  function reset(){ xs=xm=-2.2; vs=vm=0; n=0; draw(); }
  function draw(){
    let curve='';
    for(let x=-2.5;x<=2.5;x+=.05) curve+='<circle cx="'+(160+x*55)+'" cy="'+(140-x*x*13)+'" r=".7" fill="#d8cdb2"/>';
    const P=x=>[160+x*55,140-x*x*13];
    svg.innerHTML=curve+'<circle cx="'+P(xs)[0]+'" cy="'+P(xs)[1]+'" r="5" fill="#3E6B8F"/><circle cx="'+P(xm)[0]+'" cy="'+P(xm)[1]+'" r="5" fill="#C0481E"/>';
    set('第 '+n+' 步　蓝=SGD  x='+f(xs)+'　红=动量  x='+f(xm)+
      '\n梯度 = 2x；动量会累积历史梯度方向，冲过平坦区更快、也会带来一点过冲。');
  }
  btns(box,[['各走一步',()=>{
    vs=lr.get()*2*xs; xs-=vs;
    vm=mo.get()*vm+lr.get()*2*xm; xm-=vm;
    n++; if(Math.abs(xs)>6)xs=6; if(Math.abs(xm)>6)xm=6; draw();
  }],['重置',reset]]);
  reset();
});

reg('backprop', 2, 13, '反向传播：第一层的权重该负多大责任', '单步执行一个两层小网络的前向、损失、梯度回传与权重更新。', box => {
  const set=outbox(box);
  let step=0, w=0.5, x=2, y=1, b=0.1;
  const steps=[
    ()=>'输入 x=2，真实 y=1，权重 w=0.5，偏置 b=0.1\n（教学用的极简网络，输出 ŷ = w·x + b）',
    ()=>{ const z=w*x+b; return '① 前向：z = 0.5×2 + 0.1 = '+f(z)+' = ŷ'; },
    ()=>{ const z=w*x+b, L=(z-y)*(z-y); return '② 损失：L = (ŷ − y)² = ('+f(z)+' − 1)² = '+f(L); },
    ()=>{ const z=w*x+b, dL=2*(z-y); return '③ 链式法则：∂L/∂ŷ = 2(ŷ − y) = '+f(dL)+'\n    ∂L/∂w = ∂L/∂ŷ · ∂ŷ/∂w = '+f(dL)+' × 2 = '+f(dL*x); },
    ()=>{ const z=w*x+b, g=2*(z-y)*x, nw=w-0.1*g; const L0=(z-y)*(z-y); w=nw; const z2=w*x+b;
      return '④ 更新：w ← 0.5 − 0.1×'+f(g)+' = '+f(nw)+'\n    新 ŷ = '+f(z2)+'，新 loss = '+f((z2-y)*(z2-y))+'（原来 '+f(L0)+'）\n误差变小了：这就是「责任分摊 → 按责任改权重」。'; }
  ];
  btns(box,[['下一步 →',()=>{ set(steps[Math.min(step,steps.length-1)]()); step=Math.min(step+1,steps.length-1); }],
            ['重来',()=>{ step=0; w=0.5; set(steps[0]()); }]]);
  set(steps[0]());
});

/* ---------------- 卷三 · NLP ---------------- */
reg('ngram', 3, 14, 'N-gram：只靠数数能不能接下一个词', '选 n 并改句子，看统计表与「下一个词」的概率。', box => {
  const set=outbox(box);
  const inp=add(box,'input','gloss-search','');
  inp.value='猫 追 老鼠 猫 追 老鼠 猫 追';
  inp.style.margin='0 0 8px';
  const n=slider(box,'n',1,3,1,2,draw);
  inp.addEventListener('input',draw);
  function draw(){
    const toks=inp.value.trim().split(/\s+/).filter(Boolean), k=n.get();
    const cnt={};
    for(let i=0;i+k<toks.length;i++){ const g=toks.slice(i,i+k).join(' '), nx=toks[i+k]; (cnt[g]=cnt[g]||{})[nx]=(cnt[g][nx]||0)+1; }
    let s='语料 '+toks.length+' 个词，'+k+'-gram 统计：\n';
    Object.keys(cnt).slice(0,8).forEach(g=>{
      const tot=Object.values(cnt[g]).reduce((a,b)=>a+b,0);
      s+=g+' → '+Object.keys(cnt[g]).map(w=>w+':'+cnt[g][w]+'/'+tot+' ('+f(cnt[g][w]/tot,2)+')').join('，')+'\n';
    });
    if(!Object.keys(cnt).length) s+='（词太少，先把句子写长一点）';
    s+='\n问题：没见过的组合概率直接是 0 —— 这就是稀疏灾难，后面用词向量来解。';
    set(s);
  }
  draw();
});

reg('wordAnalogy', 3, 15, '词向量：国王 − 男人 + 女人 ≈ ?', '在二维语义坐标上做向量加减，看结果离哪个词最近。', box => {
  const svg=svgbox(box,320,180), set=outbox(box);
  const g=slider(box,'性别轴权重',-2,3,.1,1,draw);
  function draw(){
    const W={ '国王':[2.2,1.8],'女王':[2.2,-1.6],'男人':[.4,1.6],'女人':[.4,-1.4],'猫':[-1.8,.2] };
    const v=[W['国王'][0]-g.get()*W['男人'][0]+g.get()*W['女人'][0], W['国王'][1]-g.get()*W['男人'][1]+g.get()*W['女人'][1]];
    const P=p=>[160+p[0]*55,90-p[1]*38];
    let s='';
    Object.keys(W).forEach(k=>{ const p=P(W[k]); s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#3E6B8F"/><text x="'+(p[0]+6)+'" y="'+(p[1]-5)+'" font-size="11">'+k+'</text>'; });
    const q=P(v); s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="6" fill="#C0481E"/><text x="'+(q[0]+7)+'" y="'+(q[1]-6)+'" font-size="11" fill="#C0481E">运算结果</text>';
    svg.innerHTML='<line x1="10" y1="90" x2="310" y2="90" stroke="#ddd2ba"/><line x1="160" y1="10" x2="160" y2="170" stroke="#ddd2ba"/>'+s;
    const rank=Object.keys(W).map(k=>({k,d:Math.hypot(v[0]-W[k][0],v[1]-W[k][1])})).sort((a,b)=>a.d-b.d);
    set('国王 − '+f(g.get(),1)+'×男人 + '+f(g.get(),1)+'×女人 = ('+f(v[0])+', '+f(v[1])+')\n最近邻：'+rank.slice(0,3).map(r=>r.k+'('+f(r.d)+')').join(' → ')+
      '\n含义可以作为「方向」被加减——这是分布式表示最反直觉也最有用的一点。');
  }
  draw();
});

reg('rnnMemory', 3, 17, 'RNN 的记忆为什么传不远', '调每步的衰减系数与步数，看早期的词还剩多少信息。', box => {
  const svg=svgbox(box,320,150), set=outbox(box);
  const r=slider(box,'每步衰减 r',.1,.99,.01,.6,draw);
  const n=slider(box,'步数 N',1,40,1,20,draw);
  function draw(){
    let pts='';
    for(let k=0;k<=n.get();k++) pts+='<circle cx="'+(20+k*280/n.get())+'" cy="'+(130-Math.pow(r.get(),k)*100)+'" r="1.4" fill="#C0481E"/>';
    svg.innerHTML='<line x1="20" y1="130" x2="300" y2="130" stroke="#ddd2ba"/>'+pts;
    set('第 '+n.get()+' 步时首词信息残留 = '+r.get()+'^'+n.get()+' = '+f(Math.pow(r.get(),n.get()),6)+
      '\n即使 r=0.9，20 步后也只剩 '+f(Math.pow(.9,20),4)+'；长距离依赖基本读不到了 → 需要 LSTM 的门或注意力的一步直达。');
  }
  draw();
});

reg('lstmGate', 3, 18, 'LSTM 的遗忘门：给记忆装阀门', '对比固定衰减的 RNN 与可学习遗忘门的 LSTM 在长序列上的保留率。', box => {
  const svg=svgbox(box,320,150), set=outbox(box);
  const fg=slider(box,'遗忘门 f',.5,.999,.001,.99,draw);
  const n=slider(box,'步数 N',1,60,1,30,draw);
  function draw(){
    let a='',b='';
    for(let k=0;k<=n.get();k++){ const x=20+k*280/n.get();
      a+='<circle cx="'+x+'" cy="'+(130-Math.pow(.6,k)*100)+'" r="1.2" fill="#9aa7b0"/>';
      b+='<circle cx="'+x+'" cy="'+(130-Math.pow(fg.get(),k)*100)+'" r="1.4" fill="#2f7d5d"/>'; }
    svg.innerHTML='<line x1="20" y1="130" x2="300" y2="130" stroke="#ddd2ba"/>'+a+b;
    set('RNN 固定衰减 0.6^'+n.get()+' = '+f(Math.pow(.6,n.get()),8)+'\nLSTM 门控 '+f(fg.get(),3)+'^'+n.get()+' = '+f(Math.pow(fg.get(),n.get()),4)+
      '\nf 接近 1 时梯度可以几乎无损流过很多步；门是「学出来的」，不是写死的常数。');
  }
  draw();
});

reg('ffnnVsNgram', 3, 16, '参数账：N-gram 为什么会爆炸', '调词表 V、上下文长度 n、嵌入维度 d，对比两种语言模型的参数量。', box => {
  const set=outbox(box), bar=bars(box,['N-gram','FFNN LM']);
  const V=slider(box,'词表 V',1000,50000,1000,10000,draw);
  const n=slider(box,'上下文 n',2,6,1,3,draw);
  const d=slider(box,'嵌入维度 d',16,512,16,64,draw);
  function draw(){
    const ng=Math.pow(V.get(),n.get()), ff=n.get()*V.get()*d + d*V.get();
    set('N-gram 需存 V^n = '+V.get()+'^'+n.get()+' = '+ng.toExponential(2)+' 个计数（且大多为 0）\n'+
      'FFNN 语言模型 ≈ n·V·d + d·V = '+ff.toExponential(2)+' 个参数\n'+
      '关键差别：FFNN 用「共享的嵌入」把相似词归到一起，参数只随 V 线性增长，而不是指数增长。');
    bar([Math.log10(ng+1),Math.log10(ff+1)]);
  }
  draw();
});

/* ---------------- 卷四 · 大语言模型 ---------------- */
reg('attentionStep', 4, 19, '注意力：4 个 token 从头算一遍', '单步执行 打分 → 缩放 → softmax → 加权求和，全部给出具体数字。', box => {
  const set=outbox(box), bar=bars(box,['我','追','猫','它']);
  const ss=[slider(box,'K(我)',-2,3,.1,.5,draw),slider(box,'K(追)',-2,3,.1,1.2,draw),
            slider(box,'K(猫)',-2,3,.1,2,draw),slider(box,'K(它)',-2,3,.1,.8,draw)];
  const q=slider(box,'Q(当前词)',-2,3,.1,1.5,draw);
  const V=[[1,0],[0,1],[2,.5],[.5,2]];
  let stage=0;
  function calc(){
    const scores=ss.map(s=>q.get()*s.get());
    const scaled=scores.map(x=>x/2);
    const p=softmax(scaled);
    const out=[0,1].map(j=>p.reduce((acc,pi,i)=>acc+pi*V[i][j],0));
    return {scores,scaled,p,out};
  }
  const texts=()=>{
    const c=calc();
    return [
      '输入：当前词 Q='+f(q.get(),1)+'，四个 K=['+ss.map(s=>f(s.get(),1)).join(', ')+']\n按「下一步」开始计算，d_k=4 → √d_k=2',
      '① 打分 S = Q·Kᵀ = ['+c.scores.map(x=>f(x)).join(', ')+']',
      '② 缩放 S/√d_k = ['+c.scaled.map(x=>f(x)).join(', ')+']\n（不缩放会让点积太大，softmax 饱和、梯度趋零）',
      '③ softmax → 权重 = ['+c.p.map(x=>f(x)).join(', ')+']，合计 '+f(c.p.reduce((a,b)=>a+b,0),3),
      '④ 加权求和 Σ pᵢVᵢ = ['+c.out.map(x=>f(x)).join(', ')+']\n这就是「当前词」吸收完上下文后的新向量。'
    ];
  };
  function draw(){
    const t=texts(), c=calc();
    set(t[Math.min(stage,t.length-1)]);
    bar(stage>=3 ? c.p : c.scores);
  }
  btns(box,[['下一步 →',()=>{ stage=Math.min(stage+1,4); draw(); }],
            ['重来',()=>{ stage=0; draw(); }]]);
  draw();
});

reg('multiHead', 4, 20, '多头注意力：一个头忙不过来', '调头数 h，看每个头的维度 d_k 与「不同头关注不同位置」的直觉。', box => {
  const set=outbox(box), bar=bars(box,['头1','头2','头3','头4']);
  const dm=slider(box,'d_model',64,1024,64,512,draw);
  const h=slider(box,'头数 h',1,8,1,4,draw);
  function draw(){
    const dk=dm.get()/h.get();
    const pats=[.7,.1,.15,.05].slice(0,4).map((v,i)=> (v + (h.get()>1?(i%h.get())*.12:0)));
    set('d_model='+dm.get()+'，h='+h.get()+' → 每头 d_k = '+dm.get()+' / '+h.get()+' = '+f(dk,1)+
      '\n总计算量与单头接近（切分维度而不是复制整层），但每个头能学一种关系：\n指代 / 语法 / 位置 / 语义，最后拼接再用 W_O 混起来。');
    bar(pats);
  }
  draw();
});

reg('transformerFlow', 4, 21, 'Transformer 一层里数据怎么走', '按「下一步」沿 6 个模块走一遍，看每步张量形状与含义。', box => {
  const set=outbox(box);
  const flow=[
    '① Token → ID：输入「轩辕 养了 一只 虎皮」，4 个 token → [4] 个整数 ID',
    '② 嵌入 + 位置编码：查表得 [4, 512]，再加上位置向量（否则模型不知道词序）',
    '③ LayerNorm + 多头自注意力：每个 token 看全句，输出仍是 [4, 512]',
    '④ 残差相加：x + Attention(x) —— 给梯度留一条直达高速路',
    '⑤ LayerNorm + FFN：逐位置升维到 2048 再压回 512，输出 [4, 512]',
    '⑥ 重复 L 层 → 取最后一个位置 → 线性层到词表 → softmax → 下一个词的概率'
  ];
  let i=0;
  btns(box,[['下一步 →',()=>{ i=Math.min(i+1,flow.length-1); set(flow[i]); }],['重来',()=>{i=0;set(flow[0]);}]]);
  set(flow[0]);
});

reg('tokenizerDemo', 4, 22, 'Tokenizer：模型眼里的「字」', '输入文本，模拟 BPE 按最高频相邻对逐步合并，看 token 数怎么变。', box => {
  const set=outbox(box);
  const inp=add(box,'input','gloss-search','');
  inp.value='low lower newest widest';
  inp.style.margin='0 0 8px';
  inp.addEventListener('input',draw);
  function draw(){
    const raw=inp.value.trim() || ' ';
    let toks=raw.split('').map(c=>c===' '?'▁':c);
    const log=['初始：按字符切分 → '+toks.length+' 个 token'];
    const pairs={};
    for(let i=0;i<toks.length-1;i++){ const k=toks[i]+'|'+toks[i+1]; pairs[k]=(pairs[k]||0)+1; }
    const best=Object.keys(pairs).sort((a,b)=>pairs[b]-pairs[a])[0];
    if(best){ const [x,y]=best.split('|'); const merged=[];
      for(let i=0;i<toks.length;i++){ if(toks[i]===x&&toks[i+1]===y){merged.push(x+y);i++;} else merged.push(toks[i]); }
      log.push('最高频相邻对 '+x+'+'+y+'（'+pairs[best]+' 次）→ 合并成 ['+x+y+']');
      toks=merged;
    }
    log.push('合并后 '+toks.length+' 个 token：['+toks.join(' , ')+']');
    log.push('\n真实 BPE 会重复这一步几万次。模型看到的是 token ID，不是字母——所以数不清 strawberry 里有几个 r。');
    set(log.join('\n'));
  }
  draw();
});

reg('residualGrad', 4, 24, '残差连接：96 层的梯度怎么活下来', '调层数，对比有无残差时回传到第 1 层的梯度大小。', box => {
  const svg=svgbox(box,320,150), set=outbox(box);
  const L=slider(box,'层数 L',1,96,1,24,draw);
  const r=slider(box,'每层系数',.5,.99,.01,.8,draw);
  function draw(){
    let a='',b='';
    for(let k=1;k<=L.get();k++){ const x=20+k*280/96;
      a+='<circle cx="'+x+'" cy="'+(130-Math.pow(r.get(),k)*100)+'" r="1.2" fill="#9aa7b0"/>';
      b+='<circle cx="'+x+'" cy="'+(130-Math.min(1,Math.pow(1+0.02,k))*100)+'" r="1.4" fill="#2f7d5d"/>'; }
    svg.innerHTML='<line x1="20" y1="130" x2="300" y2="130" stroke="#ddd2ba"/>'+a+b;
    set('无残差：梯度 ≈ '+f(r.get(),2)+'^'+L.get()+' = '+f(Math.pow(r.get(),L.get()),8)+'（几乎消失）\n'+
      '有残差：∂(x+F(x))/∂x = 1 + ∂F/∂x，那个「1」让梯度沿恒等路径直达底层\n第 1 层梯度 ≈ '+f(1+Math.pow(r.get(),L.get()),6)+'，再深也训得动。');
  }
  draw();
});

reg('kvCache', 4, 26, 'KV Cache：O(n²) 怎么变成 O(n)', '调生成长度 N，对比每步重算全部 K/V 与缓存复用的计算量。', box => {
  const set=outbox(box), bar=bars(box,['无缓存','有缓存']);
  const N=slider(box,'生成 token 数 N',4,2048,4,512,draw);
  function draw(){
    const n=N.get(), no=n*(n+1)/2, yes=n;
    set('无缓存：第 i 步要重算 i 个 token 的 K/V → 1+2+…+N = N(N+1)/2 = '+no.toLocaleString()+' 次\n'+
      '有缓存：每步只算新 token 的 K/V，旧值复用 → N = '+yes.toLocaleString()+' 次\n'+
      '省下 '+f(no/yes,1)+' 倍计算，代价是显存要存下所有层的 K/V（所以才有 MQA/GQA、量化 KV Cache）。');
    bar([Math.log10(no+1),Math.log10(yes+1)]);
  }
  draw();
});

reg('moeDemo', 4, 27, 'MoE：1.8 万亿参数，每次只用一小部分', '调专家数与 top-k，看总参数、激活参数与实际计算量。', box => {
  const set=outbox(box), bar=bars(box,['总参数','激活参数']);
  const E=slider(box,'专家数 E',2,32,1,8,draw);
  const k=slider(box,'top-k',1,4,1,2,draw);
  const p=slider(box,'每专家参数(B)',1,100,1,22,draw);
  function draw(){
    if(k.get()>E.get()) k.set(E.get());
    const total=E.get()*p.get(), active=(k.get()*p.get())+p.get()*0.15;
    set('总参数 = E × 单专家 = '+E.get()+' × '+p.get()+'B = '+f(total,1)+'B\n'+
      '每次前向只激活 top-'+k.get()+' → 激活参数 ≈ '+f(active,1)+'B（共享的注意力层另计）\n'+
      '激活占比 ≈ '+f(active/total*100,1)+'%\n模型「知识容量」按总参数算，「推理算力」按激活参数算 —— 这就是 MoE 的账。');
    bar([total,active]);
  }
  draw();
});

reg('sampling', 4, 11, '采样：温度与 top-p 怎么改变输出', '调温度 T 与 top-p，看候选词被截断与重新归一化的过程。', box => {
  const set=outbox(box), bar=bars(box,['猫','狗','鱼','车','书']);
  const t=slider(box,'温度 T',.2,2,.1,1,draw);
  const tp=slider(box,'top-p',.1,1,.05,.9,draw);
  const logits=[3,2.2,1.5,.4,-.5];
  function draw(){
    let p=softmax(logits,t.get());
    const order=p.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);
    let acc=0; const keep=new Set();
    for(const o of order){ if(acc>=tp.get()&&keep.size) break; keep.add(o.i); acc+=o.v; }
    const q=p.map((v,i)=>keep.has(i)?v:0); const s=q.reduce((a,b)=>a+b,0)||1;
    const fin=q.map(v=>v/s);
    set('原始 logits ['+logits.join(', ')+']，T='+f(t.get(),1)+'\n温度后概率 ['+p.map(x=>f(x,2)).join(', ')+']\n'+
      'top-p='+f(tp.get(),2)+' 保留 '+keep.size+' 个候选（累计 '+f(acc,2)+'）\n重归一化后可抽样概率 ['+fin.map(x=>f(x,2)).join(', ')+']\n'+
      'T 控「平不平」，top-p 控「候选池大小」，两者一起决定敢不敢冒险。');
    bar(fin);
  }
  draw();
});

reg('distill', 4, 28, '模型蒸馏：软标签里的「暗知识」', '调温度，看「猫 0.9 / 狗 0.08 / 车 0.02」这类相对关系怎么被放大。', box => {
  const set=outbox(box), bar=bars(box,['猫','狗','车']);
  const t=slider(box,'蒸馏温度 T',1,20,1,1,draw);
  function draw(){
    const logits=[3,0.6,-1.2];
    const hard=softmax(logits,1), soft=softmax(logits,t.get());
    set('教师 logits ['+logits.join(', ')+']\n硬标签（T=1）= ['+hard.map(x=>f(x,3)).join(', ')+']\n'+
      '软标签（T='+t.get()+'）= ['+soft.map(x=>f(x,3)).join(', ')+']\n'+
      'T 升高后，「猫有点像狗、完全不像车」这种相对相似度被保留下来，学生学到的不只是答案，还有教师的「犹豫」。');
    bar(soft);
  }
  draw();
});

/* ---------------- 卷五 / 综合 ---------------- */
reg('scalingLaw', 4, 25, '算力预算：参数量和数据量怎么分', '调总算力预算，按 Chinchilla C≈6ND 看最优 N 与 D。', box => {
  const set=outbox(box);
  const C=slider(box,'算力 C (1e20 FLOPs)',1,100,1,10,draw);
  function draw(){
    const c=C.get()*1e20, N=Math.sqrt(c/(6*20)), D=20*N;
    set('经验法则：最优时 D ≈ 20 × N，且 C ≈ 6·N·D\nC = '+C.get()+'×10²⁰ FLOPs\n'+
      '→ 最优参数量 N ≈ '+f(N/1e9,1)+'B，训练 token 数 D ≈ '+f(D/1e9,1)+'B\n'+
      '把预算全砸在参数上、数据却不够，模型会「记不住又没学透」；两边要一起放大。');
  }
  draw();
});

reg('flops', 4, 21, '前向算力：2·N 是怎么来的', '调参数量 N 和 token 数，看一次前向的乘加次数与训练总算力。', box => {
  const set=outbox(box);
  const N=slider(box,'参数量 N (B)',1,200,1,7,draw);
  const T=slider(box,'token 数 (B)',1,1000,1,300,draw);
  function draw(){
    const n=N.get()*1e9, t=T.get()*1e9;
    set('每个参数每 token 约 2 次浮点运算（一次乘、一次加）\n前向 = 2·N·D = 2 × '+N.get()+'B × '+T.get()+'B = '+(2*n*t).toExponential(2)+' FLOPs\n'+
      '训练还要反向（约 2× 前向）→ C ≈ 6·N·D = '+(6*n*t).toExponential(2)+' FLOPs\n'+
      '换算成 H100（≈1e15 FLOPs/s 有效算力）约 '+f(6*n*t/1e15/86400,1)+' 卡·天。');
  }
  draw();
});

reg('bandwidth', 4, 26, '算力受限还是带宽受限', '调算术强度，看 GPU 是先撞算力墙还是显存带宽墙。', box => {
  const set=outbox(box);
  const ai=slider(box,'算术强度 (FLOP/Byte)',1,300,1,20,draw);
  function draw(){
    const peak=1e15, bw=3.35e12, ridge=peak/bw;
    const got=Math.min(peak,ai.get()*bw);
    set('H100 峰值算力 ≈ 1000 TFLOPs，显存带宽 ≈ 3.35 TB/s\n屋顶线拐点 = 峰值/带宽 ≈ '+f(ridge,1)+' FLOP/Byte\n'+
      '当前算术强度 '+ai.get()+' → 实际可达 '+f(got/1e12,1)+' TFLOPs\n'+
      (ai.get()<ridge?'⚠ 带宽受限：解码逐 token 读权重就是这种，优化方向是量化、KV Cache、批处理。':'✓ 算力受限：大矩阵乘法属于这类，优化方向是 Tensor Core / 并行度。'));
  }
  draw();
});

window.XY_DEMOS = D;
})();
