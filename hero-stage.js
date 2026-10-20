/* Optional, original-asset-friendly cinematic layering.
 * Uses only same-origin files declared in scene-assets.json, never copied
 * Noth.in media. Empty manifests leave the original film exactly as-is.
 */
(() => {
  'use strict';
  let host=null,items=[],loaded=false;
  const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
  const qualityMatch=matchMedia('(prefers-reduced-motion: reduce)');
  function add(item,sceneIndex) {
    if (!host || !item?.src) return;
    if (!['image','video'].includes(item.type)) return;
    const resolved=new URL(item.src,document.baseURI);
    if(resolved.origin!==location.origin) return;
    if(items.length>=18) return;
    const media=document.createElement(item.type==='video'?'video':'img');
    media.className='scene-depth-layer';
    media.setAttribute('aria-hidden','true');
    media.style.opacity='0';
    media.style.zIndex=String(3+items.length);
    if(media instanceof HTMLVideoElement){
      media.muted=true;media.loop=true;media.playsInline=true;
      media.preload='metadata';media.setAttribute('muted','');
      media.setAttribute('playsinline','');
    }else{
      media.decoding='async';media.loading='eager';
      media.alt='';
    }
    media.src=resolved.href;
    host.appendChild(media);
    items.push({
      media,sceneIndex,depth:limit(Number(item.depth)||.6,.15,2.2),
      baseScale:limit(Number(item.scale)||1.0,.7,1.8),
      x:limit(Number(item.x)||0,-.45,.45),
      y:limit(Number(item.y)||0,-.45,.45)
    });
  }

  async function attach(wrapper){
    host=wrapper;
    if(loaded || !host) return;
    loaded=true;
    try{
      const res=await fetch('scene-assets.json',{cache:'no-cache'});
      if(!res.ok)return;
      const manifest=await res.json();
      if(!Array.isArray(manifest.scenes))return;
      manifest.scenes.slice(0,6).forEach((scene,index)=>{
        (Array.isArray(scene.layers)?scene.layers:[])
           .slice(0,3).forEach(layer=>add(layer,index));
      });
    }catch(error){
      // Optional enhancement should never affect first-paint or fallback.
      console.debug('[Kile media layers] no external layers loaded',error);
    }
  }

  function update(options){
    if(!host || qualityMatch.matches || !items.length)return;
    const mix=limit(options.mix||0,0,1);
    const x=options.pointer?.nx||0,y=options.pointer?.ny||0;
    const t=options.now*.001;
    for(const p of items){
      const opacity=(p.sceneIndex===options.mode ? (1-mix):0)
                   +(p.sceneIndex===options.nextMode ? mix:0);
      if(opacity<.002){
        p.media.style.opacity='0';
        if(p.media instanceof HTMLVideoElement && !p.media.paused)p.media.pause();
        continue;
      }
      if(p.media instanceof HTMLVideoElement && p.media.paused){
        p.media.play().catch(()=>{});
      }
      const d=p.depth;
      const tx=(p.x-x*.034*d+Math.sin(t*.19+d)*.005*d)*100;
      const ty=(p.y-y*.026*d+Math.cos(t*.21+d)*.006*d)*100;
      const turnX=-y*d*.72,turnY=x*d*.95;
      p.media.style.opacity=opacity.toFixed(3);
      p.media.style.transform='translate3d('+tx.toFixed(3)+'%,'+
           ty.toFixed(3)+'%,0) perspective(920px) rotateX('+
           turnX.toFixed(2)+'deg) rotateY('+
           turnY.toFixed(2)+'deg) scale('+
           (p.baseScale+0.05).toFixed(3)+')';
    }
  }
  function detach(){
    for(const p of items){
      if(p.media instanceof HTMLVideoElement)p.media.pause();
      p.media.remove();
    }
    items=[];host=null;loaded=false;
  }
  window.KBJStage={attach,update,detach,diagnostics:()=>({
    extraLayers:items.length,manifestLoaded:loaded,
    source:'only author-supplied same-origin media assets'
  })};
})();
