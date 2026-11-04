'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const palette=['#267d70','#c2410c','#7956ae','#3e6b8f','#ad4776','#6b792c'];
let tokens=['轩辕','养了','一只','虎皮'],initial=tokens.slice(),generated=[],selected=3,head=0,layer=0,temperature=.8,useCache=true,result=ToyTransformer.run(tokens),playing=false,progress=0,speed=1,last=0,paths=[],packetNodes=[],noticeTimer,headTransition=0,blockTransition=false;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const text=(x,y,s,size=14,color='#435f7f',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${esc(s)}</text>`;
const rect=(x,y,w,h,fill='#f6f4ed',stroke='#cdc5b1',rx=5,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
function wire(d,col='#3e4f60',width=1.3,extra=''){return `<path d="${d}" class="wire" stroke="${col}" stroke-width="${width}" ${extra}/>`}
function group(key,label,body){if(!/^(token|wordembed|position|embeddingadd|cell|candidate|block):/.test(key)&&!['head-prev','head-next'].includes(key))return `<g aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</g>`;return `<g class="interactive" tabindex="0" role="button" aria-label="${esc(label)}" data-info="${key}">${body}</g>`}
const VECTOR_CELL={width:8,height:18,gap:2,padding:3};
function vect(x,y,values,color){if(values.length>8)values=Array.from({length:8},(_,i)=>values[Math.floor(i*values.length/8)]);const {width:cw,height:h,gap,padding:p}=VECTOR_CELL,w=values.length*cw+(values.length-1)*gap;let s=`<g class="vector" data-dim="${values.length}" data-width="${w}" data-height="${h}">`+rect(x-p,y-p,w+2*p,h+2*p,'#f7f4ee',color+'55',3)+`<g class="depth">${rect(x-p,y-p,w+2*p,h+2*p,'none',color+'18',3,'stroke-width="3"')}</g>`;values.forEach((v,j)=>{s+=rect(x+j*(cw+gap),y,cw,h,color+'20',color+'40',1);s+=rect(x+j*(cw+gap),y,cw,h,color,'none',1,`opacity="${.13+.8*Math.min(Math.abs(v),1)}"`)});return s+'</g>'}

function route(d,color,index,start,end){paths.push({d,color,index,start,end});return wire(d,color,selected===index?2:1.2,`opacity="${selected===index?.85:.27}"`)}
function notify(s){$('#status').textContent=s;$('#status').style.display='block';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#status').style.display='none',3500)}
function candidates(){return initial.join('').includes('虎皮')?['鹦鹉','小鸟','宠物','。']:initial.join('').includes('吃')?['苹果','米饭','面包','。']:['模型','语言','世界','。']}
function probabilities(){return ToyTransformer.soft(result.logits.map(x=>x/temperature))}

const BLOCK_GAP=34;
const ACTIVE_GUTTER=52;
function layoutX(x){
 if(x<150)return x;
 if(x<=1260)return x+layer*BLOCK_GAP+(layer?ACTIVE_GUTTER:0)-Math.max(0,Math.min(80,(x-982)*80/234));
 if(x>=1418)return 1418+(x-1418)*.82;
 return x;
}
// SVG routes use absolute M/L/C/Q/H/V commands. Remap only x coordinates.
function layoutPath(d,mapX=layoutX){let command='',index=0;return d.replace(/[MLCQHVZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi,t=>{
 if(/^[a-z]$/i.test(t)){command=t.toUpperCase();index=0;return t}
 const isX=command==='H'||(command!=='V'&&index%2===0);index++;return String(isX?mapX(+t):+t);
})}
function layoutMarkup(markup){const cut=markup.indexOf('</defs>')+7;let defs=markup.slice(0,cut).replace('<rect x="326" y="207"',`<rect x="${326+layer*BLOCK_GAP+(layer?ACTIVE_GUTTER:0)}" y="207"`);
 return defs+markup.slice(cut).replace(/<(?:rect|text|circle|path)\b[^>]*>/g,tag=>{
 if(tag.includes('fill="url(#grid)"'))return tag;
 const x=tag.match(/ x="([^"]+)"/),width=tag.match(/ width="([^"]+)"/);
 if(x&&width)tag=tag.replace(/ width="[^"]+"/,` width="${layoutX(+x[1]+ +width[1])-layoutX(+x[1])}"`);
 tag=tag.replace(/ (x|cx)="([^"]+)"/g,(_,key,v)=>` ${key}="${layoutX(+v)}"`);
 tag=tag.replace(/ d="([^"]+)"/g,(_,d)=>` d="${layoutPath(d)}"`);
 tag=tag.replace(/rotate\((-?[\d.]+) ([\d.-]+) ([\d.-]+)\)/g,(_,a,x,y)=>`rotate(${a} ${layoutX(+x)} ${y})`);
 return tag;
 });
}
// Remove 90 SVG units from the empty E+P → Block gutter. Every shape,
// wire, animation path and clipping region uses the same coordinate mapping.
const compactX=x=>x-Math.max(0,Math.min(90,x-150));
function compactMarkup(markup){return markup.replace(/<(?:rect|text|circle|path)\b[^>]*>/g,tag=>{
 const x=tag.match(/ x="([^"]+)"/),width=tag.match(/ width="([^"]+)"/);
 if(x&&width)tag=tag.replace(/ width="[^"]+"/,` width="${compactX(+x[1]+ +width[1])-compactX(+x[1])}"`);
 return tag.replace(/ (x|cx)="([^"]+)"/g,(_,key,v)=>` ${key}="${compactX(+v)}"`)
  .replace(/ d="([^"]+)"/g,(_,d)=>` d="${layoutPath(d,compactX)}"`)
  .replace(/rotate\((-?[\d.]+) ([\d.-]+) ([\d.-]+)\)/g,(_,a,x,y)=>`rotate(${a} ${compactX(+x)} ${y})`);
})}
function compactBounds(b){return {...b,x:compactX(b.x),width:compactX(b.x+b.width)-compactX(b.x)}}
function blockBounds(index,active=layer){return index===active?{x:290+active*BLOCK_GAP+(active?ACTIVE_GUTTER:0),y:105,width:890,height:600}:index<active?{x:290+index*BLOCK_GAP,y:249,width:26,height:298}:{x:1190+(index-1)*BLOCK_GAP+(active?ACTIVE_GUTTER:0),y:249,width:26,height:298}}
function collapsedBlocks(){let s='';for(let i=0;i<6;i++){if(i===layer)continue;const b=blockBounds(i),x=b.x,c=i<layer?'#408278':'#3d6785';s+=group('block:'+i,`展开 Transformer Block ${i+1}`,`<g data-block-index="${i}">${rect(x,249,26,298,'#f6f3ec99',c,4,'class="node-box"')}${text(x+17,400,'BLOCK 0'+(i+1),11,c,`transform="rotate(-90 ${x+17} 400)"`)}</g>`)}
 if(layer>0)s+=text(290,235,`已过 ${layer} 层`,11,'#408278');
 if(layer<5)s+=text(1190+layer*BLOCK_GAP+(layer?ACTIVE_GUTTER:0),235,`后续 ${5-layer} 层`,11,'#3d6785');
 return s;
}

function redraw(){paths=[];const n=tokens.length,ys=tokens.map((_,i)=>260+i*250/Math.max(n-1,1)),b=result.blocks[layer];let s=`<defs><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#bdb398" opacity=".18"/></pattern><pattern id="mask" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#f7f4ed"/><path d="M-2 2L2-2 M0 7L7 0 M5 9L9 5" stroke="#cec7b3" stroke-width="1"/></pattern><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8" fill="#3c5062"/></marker><marker id="qArrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#2a9886"/></marker><marker id="kArrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#46259d"/></marker><marker id="goldArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8" fill="#9d6b25"/></marker><clipPath id="head-card-clip"><rect x="326" y="207" width="472" height="378" rx="8"/></clipPath><clipPath id="block-clip"><rect x="150" y="150" width="1254" height="560"/></clipPath></defs><rect x="-260" width="1920" height="760" fill="url(#grid)"/>`;
// Global headings belong to one continuous calculation surface.
[[-238,'01','词嵌入 + 位置编码','内容与位置逐元素相加，仍然是 512 维'],[348,'02','Q · K · V','为每个头生成查询、键和值'],[548,'03','因果注意力','匹配，再汇聚上下文'],[995,'04','前馈网络','逐位置组合特征'],[1445,'05','预测下一个词','最后位置 → 词表']].forEach(([x,k,h,sub])=>{s+=text(x,39,k,12,'#3c5362')+text(x+28,39,h,19,'#356d8d')+text(x+28,64,sub,12,'#3a5164')});
s+=rect(238,105,1022,600,'#f7f5ef88','#c5bca4',10,'id="block-frame"')+text(260,133,`TRANSFORMER BLOCK 0${layer+1}`,13,'#3c6886', 'letter-spacing="1.5"')+text(1228,133,`${layer+1} / 6`,15,'#375167','text-anchor="end"');

s+=text(-234,224,'TOKEN',11,'#3d5062','letter-spacing="1.5"')+text(-82,224,'词嵌入 E · 512 维',12,'#43707f')+text(65,224,'E+P · 512维',11,'#358d77');
// Eight whole attention heads occupy a clearly visible deck of parallel cards.
for(let depth=7;depth>=1;depth--){const h=(head+depth)%8;s+=`<g class="head-card-back" data-stacked-head="${h}">`+rect(326+depth*2,207+depth*7,472,378,'#faf8f2','#c4c1ce',8,'stroke-width="1"')+wire(`M ${338+depth*2} ${579+depth*7} H ${786+depth*2}`,'#bcb4ce55',1)+'</g>';}
s+=rect(326,207,472,378,'#f6f4ed','#4f3f83',8,'stroke-width="1.4"')+text(562,651,'8 套并行注意力 · 每头独立 Q / K / V',12,'#5d3d85','text-anchor="middle"');
// Give every token an independent bypass lane. The staggered branch columns and
// top rails make it clear that these are four parallel residual paths.
const residualJoinX=i=>917+i*6;
ys.forEach((y,i)=>{const c=palette[i%6],a=selected===i?.82:.28,laneX=250+i*12,railY=164+i*12,joinX=residualJoinX(i);s+=wire(`M ${laneX} ${y} V ${railY} H ${joinX} V ${y-8}`,c,selected===i?1.9:1.15,`opacity="${a}"`)+`<circle cx="${laneX}" cy="${y}" r="2.2" fill="${c}" opacity="${a}"/>`;s+=wire(`M 951 ${y} V ${582+i*6} H 1220 V ${y}`,c,selected===i?1.8:1,`opacity="${a}"`)});
s+=group('residual','注意力残差旁路',text(570,151,'残差旁路 · 每种颜色对应一个 Token',12,'#405e5c'));
s+=group('residual','FFN 残差旁路',text(1009,625,'残差 · 保留输入',12,'#405e5c'));
// Four heads appear as shallow overlapping planes, rather than hiding the graph in tabs.
s+=`<g class="depth">${rect(332,239,148,311,'none','#3c476218',6,'stroke-width="5"')}</g>`;
s+=rect(332,239,148,311,'#f6f4edaa','#bbb195',6)+group('qkv','QKV 投影',text(340,221,'Q·64维',10,'#2a9886')+text(390,221,'K·64维',10,'#46259d')+text(440,221,'V·64维',10,'#9d6b25'))+group('head-prev','上一个注意力头',rect(477,663,23,26,'#f5f1e9','#414d5d')+text(488,681,'‹',18,'#522e94','text-anchor="middle"'))+text(562,680,`HEAD 0${head+1} / 08`,12,'#56289a','text-anchor="middle"')+group('head-next','下一个注意力头',rect(623,663,23,26,'#f5f1e9','#414d5d')+text(634,681,'›',18,'#522e94','text-anchor="middle"'))+blockButton('block-prev',980,663,layer===0,'‹')+text(1077,680,`BLOCK 0${layer+1} / 06`,12,'#37626b','text-anchor="middle"')+blockButton('block-next',1174,663,layer===5,'›');
// LayerNorm nodes span positions, but compute within each row.
s+=group('norm','注意力前的 LayerNorm',rect(297,245,20,288,'#f6f3ec','#bbb195',4,'class="node-box"')+text(311,390,'LN',11,'#3d7d85','transform="rotate(-90 311 390)"'));
ys.forEach((y,i)=>{const c=palette[i%6],active=selected===i;s+=group('token:'+i,'追踪词元 '+tokens[i],rect(-217,y-19,80,38,active?c+'20':'#f7f4ee',active?c:'#c5bba4',6,'class="node-box"')+text(-177,y+5,tokens[i].length>5?tokens[i].slice(0,4)+'…':tokens[i],15,active?c:'#416181','text-anchor="middle"')+text(-225,y+4,i+1,11,'#3d5061','text-anchor="end"'));s+=route(`M -136 ${y} H -85`,c,i,0,.025);s+=group('wordembed:'+i,'词嵌入：'+tokens[i],vect(-82,y-9,result.tokenEmbeddings[i],c));s+=group('position:'+i,'位置 '+i+' 的编码',text(-118,y+28,'p='+i,10,'#9d6e25')+vect(-82,y+16,result.positionEmbeddings[i],'#9d6e25'));s+=route(`M -1 ${y} H 31`,c,i,.025,.065);s+=route(`M -1 ${y+25} H 17 V ${y} H 31`,'#9d6e25',i,.025,.065);s+=group('embeddingadd:'+i,'词嵌入与位置编码逐元素相加',`<circle cx="42" cy="${y}" r="11" fill="#f6f3ec" stroke="${c}"/>`+text(42,y+5,'+',18,c,'text-anchor="middle"'));s+=route(`M 54 ${y} H 62`,c,i,.065,.08);s+=group('embeddingadd:'+i,'相加后的 512 维输入表征',vect(65,y-9,result.embeddings[i],c));s+=route(`M 147 ${y} H 296`,c,i,.08,.16);s+=route(`M 317 ${y} H 333`,c,i,.16,.2);s+=group('qkv','QKV 数值',vect(343,y-9,b.Q[i].slice(head*2,head*2+2),'#2a9886')+vect(393,y-9,b.K[i].slice(head*2,head*2+2),'#46259d')+vect(443,y-9,b.V[i].slice(head*2,head*2+2),'#9d6b25'));if(result.cached>i&&useCache)s+=group('cache','历史 K/V 已复用',text(421,y+25,'K/V 已缓存',9,'#38665c','text-anchor="middle"'));});
// Each V vector connects at its right frame edge; the shared V path enters the bottom of ×V.
ys.forEach((y,i)=>{s+=wire(`M 464 ${y} H 475`,'#9d6b25',selected===i?2:1.2,`opacity="${selected===i?.9:.55}"`)+`<circle cx="475" cy="${y}" r="1.7" fill="#9d6b25"/>`;paths.push({d:`M 464 ${y} H 475 V 578 H 741.5 V 422`,color:'#9d6b25',index:i,start:.2,end:.4});});
// Q/K feed the attention score matrix; V travels beneath it to weighted summation.
// Dedicated column gutters gather every Q and K without crossing another vector.
ys.forEach((y,i)=>{for(const [edge,bus,color,turn,port] of [[364,379,'#2a9886',232,525],[414,429,'#46259d',242,503]]){s+=wire(`M ${edge} ${y} H ${bus}`,color,selected===i?2:1.2,`opacity="${selected===i?.9:.55}"`)+`<circle cx="${bus}" cy="${y}" r="1.5" fill="${color}"/>`;paths.push({d:`M ${edge} ${y} H ${bus} V ${turn} H ${port} V 259`,color,index:i,start:.2,end:.28});}});
s+=wire(`M 379 ${ys[n-1]} V 232 H 525 V 259`,'#2a9886',1.6,'marker-end="url(#qArrow)"')+wire(`M 429 ${ys[n-1]} V 242 H 503 V 259`,'#46259d',1.6,'marker-end="url(#kArrow)"');
s+=group('attention','Q 与 K 的点积计算',rect(488,259,48,30,'#f5f1e9','#473f5f',5,'class="node-box"')+text(512,279,'QKᵀ',13,'#573290','text-anchor="middle"'))+route('M 536 274 H 546','#4c2d94',selected,.28,.3);
s+=wire(`M 475 ${ys[0]} V 578 H 741.5 V 422`,'#9d6b25bb',1.8,'marker-end="url(#goldArrow)"')+text(592,574,'V：要汇聚的信息',12,'#8e6734');
const mx=550,my=324,ms=156,cell=ms/n;
s+=group('attention','缩放、掩码与 Softmax',rect(546,246,167,42,'#f6f3ec','#414c5d',5,'class="node-box"')+text(555,262,'÷ √dₖ  +  Mask',13,'#473b63')+text(555,280,'Softmax → 注意力权重',12,'#384c67'))+route(`M 713 267 H 723 V ${my+12} H 706`,'#4c2d94',selected,.3,.32)+wire(`M 717 ${my+12} H 706`,'#4c2d94',1.3,'marker-end="url(#arrow)"');
tokens.forEach((tok,j)=>{s+=text(mx+j*cell+cell/2,my-7,tok.length>2?tok.slice(0,2):tok,10,palette[j%6],'text-anchor="middle"');s+=text(mx-8,my+j*cell+cell/2+3,tok.length>2?tok.slice(0,2):tok,10,palette[j%6],'text-anchor="end"');});
tokens.forEach((_,i)=>tokens.forEach((_,j)=>{let w=j<=i?b.A[i][head][j]:0;s+=group('cell:'+i+':'+j,`位置 ${i+1} 关注位置 ${j+1}`,rect(mx+j*cell+1,my+i*cell+1,cell-3,cell-3,j>i?'url(#mask)':`rgba(172,149,225,${.13+w*.77})`,i===selected?'#4e329088':'#beb49a33',3,'class="node-box"')+(n<=5?text(mx+j*cell+cell/2,my+i*cell+cell/2+4,j>i?'×':Math.round(w*100)+'%',10,j>i?'#424c5d':'#54269c','text-anchor="middle"'):''));}));
s+=text(mx,my+ms+26,'每行之和 = 1',12,'#463c62')+text(mx,my+ms+46,'未来位置的权重 = 0',11,'#3e4f60');
s+=group('mix','注意力权重乘以 V',rect(720,382,43,40,'#f5f2eb','#4f435b',5,'class="node-box"')+text(741,408,'× V',16,'#95692c','text-anchor="middle"'))+route('M 707 402 H 720','#4d279b',selected,.32,.4);
s+=text(784,221,'单头输出',10,'#3f6883','text-anchor="end"')+text(784,237,'64维',11,'#3f6883','text-anchor="end"')+text(867,223,'8 × 64 → 512 维',12,'#406082','text-anchor="middle"')+text(853,241,'× Wₒ',13,'#3d5f85');
s+=group('norm','FFN 前的 LayerNorm',rect(962,245,20,288,'#f6f3ec','#bbb195',4,'class="node-box"')+text(976,390,'LN',11,'#3d7d85','transform="rotate(-90 976 390)"'));
s+=group('ffn','前馈网络',rect(998,235,201,315,'#f7f4ee66','#c8bfa8',6,'class="node-box"')+text(1006,221,'512→2048→512',12,'#405b82')+text(1110,569,'GELU',12,'#42607f','text-anchor="middle"'));
ys.forEach((y,i)=>{const c=palette[i%6],joinX=residualJoinX(i);s+=route(`M 763 402 C 771 402,763 ${y},773 ${y}`,c,i,.4,.48);s+=group('mix','当前头的加权结果',vect(774,y-9,b.heads[i][head],c));s+=route(`M 796 ${y} H 824`,c,i,.48,.53);s+=group('concat','拼接与输出投影',vect(827,y-9,b.attn[i],c));s+=route(`M 909 ${y} H ${joinX-8}`,c,i,.53,.56);s+=group('residual','注意力残差相加',`<circle cx="${joinX}" cy="${y}" r="8" fill="#f6f3ec" stroke="${c}"/>`+text(joinX,y+5,'+',15,c,'text-anchor="middle"'));s+=route(`M ${joinX+8} ${y} H 962`,c,i,.56,.6)+route(`M 982 ${y} H 1009`,c,i,.6,.65);
// True feature-mixing topology within one position, shown with representative neurons.
for(let a=0;a<3;a++)for(let j=0;j<5;j++){s+=wire(`M 1021 ${y-15+a*15} L 1086 ${y-24+j*12}`,c,.7,`opacity="${selected===i?.31:.12}"`);s+=wire(`M 1086 ${y-24+j*12} L 1173 ${y-15+a*15}`,c,.7,`opacity="${selected===i?.31:.12}"`)}
for(let j=0;j<3;j++){s+=`<circle cx="1021" cy="${y-15+j*15}" r="3" fill="${c}" opacity=".7"/><circle cx="1173" cy="${y-15+j*15}" r="3" fill="${c}" opacity=".7"/>`;}for(let j=0;j<5;j++)s+=`<circle cx="1086" cy="${y-24+j*12}" r="4" fill="${c}" opacity="${.2+Math.min(.8,Math.abs(b.hidden[i][j]))}"/>`;
s+=route(`M 1021 ${y} H 1173`,c,i,.65,.76)+route(`M 1173 ${y} H 1210`,c,i,.76,.79);s+=group('residual','FFN 残差相加',`<circle cx="1221" cy="${y}" r="11" fill="#f6f3ec" stroke="${c}"/>`+text(1221,y+5,'+',18,c,'text-anchor="middle"'));s+=route(`M 1232 ${y} H 1401`,c,i,.79,.9);s+=`<circle cx="1404" cy="${y}" r="3" fill="${c}" opacity=".6"/>`;
});

const ly=ys[n-1];s+=group('output','最后位置的表征用于预测',route(`M 1407 ${ly} C 1415 ${ly},1407 291,1426 291`,palette[(n-1)%6],n-1,.9,.94)+rect(1418,268,23,45,'#f6f3ec','#61543d',4)+text(1433,297,'LN',11,'#93732f', 'transform="rotate(-90 1433 297)"')+wire('M 1442 291 H 1458','#806a42',1.5,'marker-end="url(#arrow)"')+text(1488,254,'最后一个位置',12,'#936f2f','text-anchor="middle"')+text(1463,291,'词表投影',13,'#655439')+text(1463,315,'Softmax / T',12,'#3f4f5f'));
const p=probabilities();candidates().forEach((tok,i)=>{const y=342+i*52;s+=group('candidate:'+i,'选择候选 '+tok,rect(1454,y-1,142,45,'#f6f4ed','#cdc6b1',5,'class="node-box"')+rect(1455,y,Math.max(2,140*p[i]),43,'#966c2c20','none',4)+text(1465,y+27,tok,15,'#976d2b')+text(1586,y+27,(p[i]*100).toFixed(1)+'%',13,'#836b3f','text-anchor="end"'))});
s+=text(1459,574,'点击选词 / 按概率采样',11,'#3f505f')+group('loop','自回归反馈回路',route(`M 1540 563 V 653 Q 1540 713 1510 713 H -162 Q -188 713 -188 687 V ${ly+28}`,'#986b2a',n-1,.98,1.18)+text(758,737,'采样 1 个新 Token → 接回输入 → 再计算一次',14,'#956d2d','text-anchor="middle"'));
s+=group('position','位置编码说明',text(-170,572,'金色向量 P：只取决于位置',12,'#9d6e25')+text(-170,593,'同一个词换位置：E 不变，P 改变',12,'#385266')+text(-170,614,'本演示使用加法位置编码；不代表 RoPE',11,'#3c5062'));
s+='<g id="packets">'+paths.map((p,i)=>`<circle id="packet-${i}" r="3" fill="${p.color}" opacity="0" class="packet"/>`).join('')+'</g>';
s=layoutMarkup(s);s+=collapsedBlocks();$('#map').innerHTML=compactMarkup(s);paths.forEach(p=>p.d=layoutPath(layoutPath(p.d),compactX));
// Native SVG paths give the moving packets the exact same route as the displayed wires.
const ns='http://www.w3.org/2000/svg';paths.forEach(p=>{p.path=document.createElementNS(ns,'path');p.path.setAttribute('d',p.d);p.length=p.path.getTotalLength()});packetNodes=paths.map((_,i)=>$('#packet-'+i));
$$('[data-info]').forEach(el=>{const act=()=>activate(el.dataset.info);el.onclick=act;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}}});
$('#play').textContent=playing?'Ⅱ 暂停数据流':'▶ 播放数据流';}
function activate(key){
 if(blockTransition)return;
 if(key.startsWith('block:')){switchLayer(+key.split(':')[1]);return}
 if(key==='block-prev'||key==='block-next'){switchLayer(layer+(key==='block-next'?1:-1));return}
 if(key==='head-prev'||key==='head-next'){switchHead((head+(key==='head-next'?1:7))%8);return}
 if(/^(token|wordembed|position|embeddingadd|cell):/.test(key)){selected=+key.split(':')[1];redraw();return}
 if(key.startsWith('candidate:'))generate(+key.split(':')[1]);
}
function generate(index){if(tokens.length>=6){playing=false;redraw();notify('本次全景演示最多展示 6 个 Token；点击 ↺ 可以重新开始。');return}const ps=probabilities();if(index===undefined){let r=Math.random();index=0;while(index<ps.length-1&&r>ps[index])r-=ps[index++];}const token=candidates()[index];tokens.push(token);generated.push(token);selected=tokens.length-1;result=ToyTransformer.run(tokens,result,useCache);progress=0;redraw()}
function resetDemo(){
 playing=false;progress=0;last=performance.now();head=0;layer=0;headTransition=0;
 $('#head-transition')?.remove();tokens=initial.slice();generated=[];selected=tokens.length-1;
 $('#prompt').value=initial.join(' ');result=ToyTransformer.run(tokens);redraw();notify('已重新开始');
}
$('#play').onclick=()=>{if(tokens.length>=6){playing=false;notify('已到 6 个 Token，请点击 ↺ 重新开始。');return}playing=!playing;redraw()};$('#reset').onclick=resetDemo;$('#apply').onclick=()=>{const p=$('#prompt').value.trim();if(!p){notify('请输入至少一个 Token。');return}const ts=p.split(/\s+/).filter(Boolean);if(ts.length>6){notify('最多输入 6 个 Token，用空格分隔。');return}initial=ts;tokens=ts.slice();generated=[];selected=tokens.length-1;playing=false;progress=0;result=ToyTransformer.run(tokens);redraw()};$('#prompt').onkeydown=e=>{if(e.key==='Enter')$('#apply').click()};$('#temperature').oninput=e=>{temperature=+e.target.value;$('#tempValue').textContent=temperature.toFixed(1);redraw()};
$('#immersive').onclick=()=>{const immersive=document.body.classList.toggle('immersive');$('#immersive').textContent=immersive?'✕ 退出沉浸':'⛶ 沉浸模式'};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('immersive'))$('#immersive').click();if(e.code==='Space'&&!['INPUT','BUTTON','SELECT'].includes(document.activeElement.tagName)&&document.activeElement.getAttribute('role')!=='button'){e.preventDefault();$('#play').click()}});
// Snapshot only the attention-card region; the rest of the computation stays stationary.
function headSnapshot(clipId='head-card-clip'){const svg=$('#map'),ns='http://www.w3.org/2000/svg',clip=document.createElementNS(ns,'g');clip.setAttribute('clip-path',`url(#${clipId})`);for(const node of [...svg.children]){if(node.tagName.toLowerCase()==='defs'||node.id==='head-transition'||node.id==='block-transition'||node.id==='packets')continue;const copy=node.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));clip.append(copy)}return clip}
function switchHead(target){if(blockTransition||target===head)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const old=headSnapshot(),serial=++headTransition;head=target;redraw();if(reduced)return;const incoming=headSnapshot(),svg=$('#map'),ns='http://www.w3.org/2000/svg',overlay=document.createElementNS(ns,'g');overlay.id='head-transition';overlay.setAttribute('pointer-events','none');overlay.setAttribute('aria-hidden','true');const cover=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:compactX(326+layer*BLOCK_GAP+(layer?ACTIVE_GUTTER:0)),y:207,width:472,height:378,rx:8,fill:'#f6f4ed'}))cover.setAttribute(k,v);overlay.append(cover,incoming,old);svg.append(overlay);if(typeof old.animate!=='function'){overlay.remove();return}const options={duration:620,easing:'cubic-bezier(.22,.7,.18,1)',fill:'forwards'};old.animate([{transform:'translate(0px,0px)',opacity:1},{transform:'translate(-9px,-8px)',opacity:.95,offset:.28},{transform:'translate(14px,49px)',opacity:0}],options);const enter=incoming.animate([{transform:'translate(14px,49px)',opacity:0},{transform:'translate(4px,12px)',opacity:.5,offset:.35},{transform:'translate(0px,0px)',opacity:1}],options);enter.finished.then(()=>{overlay.remove();if(serial===headTransition)headTransition=0}).catch(()=>overlay.remove());}

function blockButton(key,x,y,disabled,label){return `<g class="interactive block-nav" data-info="${key}" role="button" aria-label="${key==='block-prev'?'上一层 Transformer Block':'下一层 Transformer Block'}" aria-disabled="${disabled}" tabindex="${disabled?-1:0}" opacity="${disabled?.3:1}">${rect(x,y,28,27,'#f6f3eb','#3b5463',5)}${text(x+14,y+20,label,21,'#437f79','text-anchor="middle"')}</g>`}
async function switchLayer(target){
 if(blockTransition||!Number.isInteger(target)||target<0||target>=result.blocks.length||target===layer)return;
 const direction=target>layer?1:-1,previousLayer=layer,old=headSnapshot('block-clip');
 layer=target;redraw();
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){restoreBlockFocus(direction);return}
 const incoming=headSnapshot('block-clip'),svg=$('#map'),ns='http://www.w3.org/2000/svg';
 if(typeof old.animate!=='function')return;
 const overlay=document.createElementNS(ns,'g'),cover=document.createElementNS(ns,'rect');
 overlay.id='block-transition';overlay.setAttribute('clip-path','url(#block-clip)');overlay.setAttribute('pointer-events','none');overlay.setAttribute('aria-hidden','true');
 for(const [k,v] of Object.entries({x:150,y:150,width:1164,height:560,fill:'#f7f5ef'}))cover.setAttribute(k,v);
 overlay.append(cover,incoming,old);svg.append(overlay);
 blockTransition=true;svg.setAttribute('aria-busy','true');document.body.classList.add('switching-block');
 const controls=$$('.toolbar button, .toolbar input, .toolbar select');
 const disabled=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
 const options={duration:800,easing:'cubic-bezier(.22,.7,.18,1)',fill:'forwards'};
 const exit=old.animate([{transform:'translateX(0px) scale(1)',opacity:1},{transform:`translateX(${-direction*110}px) scale(.94)`,opacity:0}],options);
 const enter=incoming.animate([{transform:`translateX(${direction*110}px) scale(.94)`,opacity:0},{transform:'translateX(0px) scale(1)',opacity:1}],options);
 const frames=document.createElementNS(ns,'g');frames.id='block-moving-frames';frames.setAttribute('pointer-events','none');frames.setAttribute('aria-hidden','true');svg.append(frames);
 for(let i=0;i<6;i++){
  const from=compactBounds(blockBounds(i,previousLayer)),to=compactBounds(blockBounds(i,target)),outline=document.createElementNS(ns,'rect');
  for(const [k,v] of Object.entries({...to,rx:5,fill:'none',stroke:i===target?'#2e9381':'#406b82','stroke-width':1.5,'vector-effect':'non-scaling-stroke'}))outline.setAttribute(k,v);
  outline.style.transformOrigin='0 0';frames.append(outline);
  const sx=from.width/to.width,sy=from.height/to.height;
  outline.animate([{transform:`translate(${from.x-to.x*sx}px,${from.y-to.y*sy}px) scale(${sx},${sy})`,opacity:.9},{transform:'translate(0px,0px) scale(1,1)',opacity:0}],options);
 }

 try{await Promise.all([exit.finished,enter.finished])}catch{}finally{
  overlay.remove();frames.remove();blockTransition=false;svg.setAttribute('aria-busy','false');document.body.classList.remove('switching-block');controls.forEach((el,i)=>el.disabled=disabled[i]);restoreBlockFocus(direction);
 }
}
function restoreBlockFocus(direction){const key=direction>0?(layer===5?'block-prev':'block-next'):(layer===0?'block-next':'block-prev');$(`[data-info="${key}"]`)?.focus({preventScroll:true})}

function animate(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(playing&&!blockTransition){progress+=dt*.09*speed;if(progress>1.25){generate();progress=0}}paths.forEach((p,i)=>{const v=(progress-p.start)/(p.end-p.start),el=packetNodes[i];if(playing&&!blockTransition&&v>=0&&v<=1){const pt=p.path.getPointAtLength(v*p.length);el.setAttribute('cx',pt.x);el.setAttribute('cy',pt.y);el.setAttribute('opacity',p.index===selected?1:.5)}else el.setAttribute('opacity',0)});requestAnimationFrame(animate)}redraw();requestAnimationFrame(animate);
