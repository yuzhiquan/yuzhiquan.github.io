
(function(){
  'use strict';
  document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('in');});

  /* 「想一想」：有答案就展开，没有则滚动到下一节 */
  document.querySelectorAll('.think').forEach(function(t){
    var btn=t.querySelector('.think-btn'); if(!btn) return;
    var ans=t.querySelector('.think-answer');
    btn.addEventListener('click',function(){
      if(ans){
        ans.hidden=!ans.hidden;
        btn.textContent=ans.hidden?'看答案 ↓':'收起答案 ↑';
      }else{
        var sec=t.closest('section'); var next=sec&&sec.nextElementSibling;
        if(next) next.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  /* 学习小测验：判分 + 讲解 */
  document.querySelectorAll('.quiz-item').forEach(function(item){
    var opts=Array.prototype.slice.call(item.querySelectorAll('.quiz-option'));
    var submit=item.querySelector('.quiz-submit');
    var correct=parseInt(item.getAttribute('data-answer'),10);
    var explain=item.getAttribute('data-explain')||'';
    if(isNaN(correct)||!opts.length) return;
    var sel=-1;
    opts.forEach(function(o,i){
      o.addEventListener('click',function(){
        sel=i;
        opts.forEach(function(x,j){
          x.classList.toggle('is-active',j===i);
          x.setAttribute('aria-checked',j===i?'true':'false');
        });
        if(submit) submit.disabled=false;
      });
    });
    if(!submit) return;
    submit.addEventListener('click',function(){
      if(sel<0) return;
      opts.forEach(function(x,j){
        x.classList.remove('is-active');
        x.classList.toggle('is-correct',j===correct);
        x.classList.toggle('is-wrong',j===sel&&sel!==correct);
        x.disabled=true;
      });
      var box=item.querySelector('.quiz-explain');
      if(!box){box=document.createElement('div');box.className='quiz-explain';item.appendChild(box);}
      box.innerHTML='<strong>'+(sel===correct?'✓ 答对了':'✗ 再想想')+'</strong>　正确答案：'+
        String.fromCharCode(65+correct)+(explain?'<br>'+explain:'');
      submit.disabled=true; submit.style.display='none';
    });
  });

  /* 键盘左右翻课 */
  var prev=document.querySelector('.xy-p-prev'), next=document.querySelector('.xy-p-next');
  document.addEventListener('keydown',function(e){
    if(/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if(e.key==='ArrowLeft'&&prev) location.href=prev.href;
    if(e.key==='ArrowRight'&&next) location.href=next.href;
  });
})();
