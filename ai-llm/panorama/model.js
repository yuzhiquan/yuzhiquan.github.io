/* A deterministic, untrained micro Transformer for explanatory computation. */
const ToyTransformer=(()=>{
const D=16,H=8,HD=2,F=32;
const val=(a,b,seed)=>Math.sin((a+1)*12.9898+(b+1)*78.233+seed*39.425)*.32;
const mat=(n,m,seed)=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>val(i,j,seed)));
const mul=(x,w)=>w[0].map((_,j)=>x.reduce((s,v,i)=>s+v*w[i][j],0));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const norm=x=>{const m=x.reduce((a,b)=>a+b,0)/x.length;const v=x.reduce((a,b)=>a+(b-m)**2,0)/x.length;return x.map(a=>(a-m)/Math.sqrt(v+1e-5))};
const soft=x=>{const m=Math.max(...x),e=x.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
const weights=Array.from({length:6},(_,l)=>({q:mat(D,D,l*7+1),k:mat(D,D,l*7+2),v:mat(D,D,l*7+3),o:mat(D,D,l*7+4),f1:mat(D,F,l*7+5),f2:mat(F,D,l*7+6)}));
const tokenEmbed=t=>{let h=0;for(const c of t)h=(h*31+c.codePointAt(0))%10007;return Array.from({length:D},(_,j)=>Math.sin(h*.04+j*1.7)*.65)};
const positionEmbed=pos=>Array.from({length:D},(_,j)=>Math.sin(pos/Math.pow(10000,j/D))*.3);
const embed=(t,pos)=>add(tokenEmbed(t),positionEmbed(pos));
function run(tokens,previous=null,useCache=true){let X=tokens.map(embed),blocks=[];const reusable=useCache&&previous&&previous.tokens.length<tokens.length&&previous.tokens.every((t,i)=>tokens[i]===t);const old=reusable?previous.tokens.length:0;
weights.forEach((w,l)=>{const input=X.map(x=>x.slice()),oldB=old?previous.blocks[l]:null,Q=[],K=[],V=[],A=[],heads=[],concat=[],attn=[],residual=[],hidden=[],ffn=[],out=[];
for(let i=0;i<X.length;i++){if(i<old){for(const [arr,key] of [[Q,'Q'],[K,'K'],[V,'V'],[A,'A'],[heads,'heads'],[concat,'concat'],[attn,'attn'],[residual,'residual'],[hidden,'hidden'],[ffn,'ffn'],[out,'out']])arr.push(oldB[key][i]);continue}const n=norm(X[i]);Q.push(mul(n,w.q));K.push(mul(n,w.k));V.push(mul(n,w.v));let a=[],hs=[];for(let h=0;h<H;h++){const q=Q[i].slice(h*HD,h*HD+HD);const scores=K.slice(0,i+1).map(k=>q.reduce((s,v,d)=>s+v*k[h*HD+d],0)/Math.sqrt(HD));const aw=soft(scores);a.push(aw);hs.push(Array.from({length:HD},(_,d)=>aw.reduce((s,v,j)=>s+v*V[j][h*HD+d],0)))}A.push(a);heads.push(hs);concat.push(hs.flat());attn.push(mul(concat[i],w.o));residual.push(add(X[i],attn[i]));hidden.push(mul(norm(residual[i]),w.f1).map(v=>.5*v*(1+Math.tanh(Math.sqrt(2/Math.PI)*(v+.044715*v**3)))));ffn.push(mul(hidden[i],w.f2));out.push(add(residual[i],ffn[i]));}blocks.push({input,Q,K,V,A,heads,concat,attn,residual,hidden,ffn,out});X=out;});const final=norm(X[X.length-1]);const logits=mul(final,mat(D,4,99)).map((v,i)=>v+[1.8,.8,.2,-.4][i]);return {tokens:tokens.slice(),embeddings:tokens.map(embed),tokenEmbeddings:tokens.map(tokenEmbed),positionEmbeddings:tokens.map((_,i)=>positionEmbed(i)),blocks,logits,cached:old};}
return {run,soft};})();
if(typeof module!=='undefined')module.exports=ToyTransformer;
