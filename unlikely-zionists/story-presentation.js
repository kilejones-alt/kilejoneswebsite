(() => {
  'use strict';
  const viewer=document.getElementById('story-viewer');
  const story=window.UZStory;
  if(!viewer||!story)return;
  const rail=document.createElement('div');
  rail.className='chapter-rail';
  rail.setAttribute('role','group');
  rail.setAttribute('aria-label','Navigate the story');
  const names=story.chapters;
  const buttons=names.map((name,index)=>{
    const button=document.createElement('button');button.type='button';
    button.setAttribute('aria-label',name);button.title=name;
    button.addEventListener('click',()=>story.goTo(index));
    rail.appendChild(button);return button;
  });
  viewer.appendChild(rail);
  function syncRail(){
    const index=Number(document.querySelector('.story-card.is-active')?.dataset.index||0);
    buttons.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  }
  ['uz-viewer-open','uz-story-rotate','uz-chapter-change'].forEach(name=>addEventListener(name,syncRail));
  syncRail();
  const explore=document.createElement('button');
  explore.type='button';explore.className='viewer-examine';explore.textContent='EXPLORE IMAGE';
  viewer.appendChild(explore);
  const presentation=document.createElement('dialog');
  presentation.className='story-presentation';
  presentation.setAttribute('aria-label','EXPLORE IMAGE');
  presentation.innerHTML='<button type="button" class="presentation-close" aria-label="Close image">×</button><div class="presentation-stage"><img alt=""><blockquote hidden></blockquote></div><div class="presentation-controls"><button type="button" class="presentation-prev" aria-label="Previous photograph position">←</button><progress aria-label="EXPLORE IMAGE"></progress><button type="button" class="presentation-next" aria-label="Next photograph position">→</button></div>';
  document.body.appendChild(presentation);
  const photo=presentation.querySelector('img'),quote=presentation.querySelector('blockquote');
  const previous=presentation.querySelector('.presentation-prev'),next=presentation.querySelector('.presentation-next');
  const progress=presentation.querySelector('progress'),close=presentation.querySelector('.presentation-close');
  const photos=story.content.photos.filter(item=>item.src);
  let index=0,timer=null,previousFocus=null;
  progress.max=photos.length;
  function stop(){clearInterval(timer);timer=null;}
  function show(newIndex){
    index=(newIndex+photos.length)%photos.length;
    photo.src=photos[index].src;
    photo.alt=story.content.firstName;
    quote.textContent=photos[index].quote||story.content.introQuote||'';
    quote.hidden=!quote.textContent;
    presentation.classList.toggle('has-quote',!quote.hidden);
    progress.value=index+1;
    presentation.dataset.slide=String(index);
  }
  function start(){stop();if(photos.length>1)timer=setInterval(()=>{if(!document.hidden&&photo.complete&&photo.naturalWidth)show(index+1);},4000);}
  function end(){stop();if(presentation.open)presentation.close();previousFocus?.focus({preventScroll:true});}
  explore.addEventListener('click',()=>{
    if(!photos.length)return;
    previousFocus=document.activeElement;
    show(0);presentation.showModal();close.focus({preventScroll:true});start();
  });
  close.addEventListener('click',end);
  presentation.addEventListener('close',()=>{stop();photo.removeAttribute('src');});
  presentation.addEventListener('cancel',event=>{event.preventDefault();end();});
  previous.addEventListener('click',()=>{show(index-1);start();});
  next.addEventListener('click',()=>{show(index+1);start();});
  document.addEventListener('keydown',event=>{
    if(!presentation.open)return;
    if(['ArrowLeft','ArrowRight','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Escape')end();else{show(index+(event.key==='ArrowRight'?1:-1));start();}
    }
  },true);
  document.addEventListener('visibilitychange',()=>{if(!presentation.open)return;if(document.hidden)stop();else start();});
  addEventListener('uz-viewer-close',end);
  addEventListener('pagehide',stop);
  photos.forEach(item=>{const preload=new Image();preload.src=item.src;});
})();
