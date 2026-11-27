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
    const imageAction=viewer.querySelector('.viewer-examine');
    if(imageAction)imageAction.textContent=index===2?'VIEW IMAGE':'VIEW PHOTOGRAPHS';
    const shareAction=viewer.querySelector('.story-next-action');
    if(shareAction)shareAction.hidden=index!==names.length-1;
  }
  ['uz-viewer-open','uz-story-rotate','uz-chapter-change'].forEach(name=>addEventListener(name,syncRail));
  const explore=document.createElement('button');
  explore.type='button';explore.className='viewer-examine';explore.textContent='VIEW PHOTOGRAPHS';
  viewer.appendChild(explore);
  const share=document.createElement('a');
  share.className='story-next-action';share.href='#submit';share.textContent='Share your story';share.hidden=true;
  share.addEventListener('click',()=>document.getElementById('viewer-close').click());
  document.getElementById('viewer-public-story').appendChild(share);
  syncRail();
  const presentation=document.createElement('dialog');
  presentation.className='story-presentation';
  presentation.setAttribute('aria-label','Photographs');
  presentation.innerHTML='<button type="button" class="presentation-close" aria-label="Close image">×</button><div class="presentation-stage"><img alt=""><blockquote hidden></blockquote></div><div class="presentation-controls"><button type="button" class="presentation-prev" aria-label="Previous photograph">←</button><progress aria-label="Photograph position"></progress><button type="button" class="presentation-next" aria-label="Next photograph">→</button><button type="button" class="presentation-playback">PAUSE</button></div>';
  document.body.appendChild(presentation);
  const photo=presentation.querySelector('img'),quote=presentation.querySelector('blockquote');
  const previous=presentation.querySelector('.presentation-prev'),next=presentation.querySelector('.presentation-next');
  const progress=presentation.querySelector('progress'),close=presentation.querySelector('.presentation-close');
  const photos=story.content.photos.filter(item=>item.src);
  const playback=presentation.querySelector('.presentation-playback');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let index=0,timer=null,previousFocus=null,paused=false,slides=photos;
  progress.max=photos.length;
  function stop(){clearTimeout(timer);timer=null;}
  function show(newIndex){
    index=(newIndex+slides.length)%slides.length;
    photo.src=slides[index].src;
    photo.alt=slides[index].alt||story.content.firstName;
    const text=String(slides[index].quote||'').trim();
    quote.textContent=text?'“'+text+'”':'';
    quote.hidden=!quote.textContent;
    presentation.classList.toggle('has-quote',!quote.hidden);
    progress.value=index+1;
    presentation.dataset.slide=String(index);
    presentation.querySelector('.presentation-stage').scrollTop=0;
  }
  function start(){
    stop();
    const readingTime=Math.max(5000,Math.min(10000,quote.textContent.trim().split(/\s+/).length*300+1500));
    if(!paused&&!document.hidden&&presentation.open&&slides.length>1)timer=setTimeout(()=>{if(photo.complete&&photo.naturalWidth)show(index+1);start();},readingTime);
  }
  function setPaused(value){paused=value;playback.textContent=paused?'PLAY':'PAUSE';playback.setAttribute('aria-label',paused?'Play photograph presentation':'Pause photograph presentation');start();}
  function end(){stop();if(presentation.open)presentation.close();previousFocus?.focus({preventScroll:true});}
  explore.addEventListener('click',()=>{
    if(!photos.length)return;
    previousFocus=document.activeElement;
    const artifact=viewer.classList.contains('is-news-photo');
    slides=artifact?[{src:story.content.reasonImage,quote:'',alt:'New York Times screenshot, October 2023'}]:photos;
    progress.max=slides.length;
    previous.hidden=next.hidden=playback.hidden=slides.length<2;
    presentation.setAttribute('aria-label',artifact?'New York Times screenshot, October 2023':'Photographs');
    show(0);presentation.showModal();close.focus({preventScroll:true});setPaused(reduced.matches);
  });
  close.addEventListener('click',end);
  presentation.addEventListener('close',()=>{stop();photo.removeAttribute('src');});
  presentation.addEventListener('cancel',event=>{event.preventDefault();end();});
  previous.addEventListener('click',()=>{show(index-1);start();});
  next.addEventListener('click',()=>{show(index+1);start();});
  playback.addEventListener('click',()=>setPaused(!paused));
  ['wheel','touchmove'].forEach(name=>presentation.querySelector('.presentation-stage').addEventListener(name,()=>{if(presentation.open&&!paused)setPaused(true);},{passive:true}));
  document.addEventListener('keydown',event=>{
    if(!presentation.open)return;
    if(['ArrowLeft','ArrowRight','Escape'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Escape')end();else{show(index+(event.key==='ArrowRight'?1:-1));start();}
    }
  },true);
  document.addEventListener('visibilitychange',()=>{if(!presentation.open)return;if(document.hidden)stop();else start();});
  reduced.addEventListener('change',()=>{if(presentation.open&&reduced.matches)setPaused(true);});
  addEventListener('uz-viewer-close',end);
  addEventListener('pagehide',stop);
  photos.forEach(item=>{const preload=new Image();preload.src=item.src;});
})();
