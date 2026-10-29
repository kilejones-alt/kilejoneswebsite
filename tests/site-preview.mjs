/* Development-only screenshots/diagnostics of the real site served locally.
   This does not deploy, change, or modify the live website. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript',
 '.json':'application/json','.mp3':'audio/mpeg','.png':'image/png',
 '.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const part=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(root,'.'+part);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);res.end('not found');return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
const url='http://127.0.0.1:'+address.port+'/';
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',
 '--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'
]});
fs.mkdirSync('qa-screenshots',{recursive:true});
try{
  for(const spec of [
    {name:'desktop',width:1440,height:900,isMobile:false,deviceScaleFactor:1},
    {name:'laptop',width:1280,height:800,isMobile:false,deviceScaleFactor:1},
    {name:'tablet',width:820,height:1180,isMobile:false,deviceScaleFactor:1},
    {name:'mobile',width:390,height:844,isMobile:true,deviceScaleFactor:2}
  ]){
    const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
      isMobile:spec.isMobile,deviceScaleFactor:spec.deviceScaleFactor,
      hasTouch:spec.isMobile});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push('exception: '+error.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text().slice(0,200));});
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(10000);
    if(!spec.isMobile) {
      await page.mouse.move(400,410,{steps:12});
      await page.mouse.move(720,490,{steps:12});
      await page.waitForTimeout(600);
    }
    const diagnostic=await page.evaluate(()=>{
      const v=document.querySelector('#hero-video');
      const gpu=document.querySelector('.hero-gpu-layer');
      const wrapper=document.querySelector('.hero-film-window');
      return {
        ...(window.__KBJ_DIAGNOSTICS||{}),
        videoDimensions:v ? [v.videoWidth,v.videoHeight] : null,
        filmRect:v ? {w:Math.round(v.getBoundingClientRect().width),h:Math.round(v.getBoundingClientRect().height)} : null,
        parentMask:!!wrapper && getComputedStyle(wrapper).maskImage!=='none',
        cursorFluidReveal:!!wrapper && (wrapper.style.maskImage||'').includes('radial-gradient'),
        gpuCanvas:gpu ? [gpu.width,gpu.height] : null,
        topLevelControls:[...document.querySelectorAll('.pill-nav button')].map(e=>e.textContent.trim())
      };
    });
    await page.screenshot({path:'qa-screenshots/'+spec.name+'.png'});
    console.log(JSON.stringify({device:spec.name,diagnostic,errors}));
    const world=diagnostic?.gpu?.objectWorlds;
    if (!world?.active || world.frames < 1 ||
        JSON.stringify(world.objectsByScene)!==JSON.stringify([14,15,5,6,4,3])) {
      throw new Error('Expected all real 3D object worlds to be active');
    }
    // Inspect each actual object world on desktop and phone, rather than
    // accidentally validating only whichever random 5-second mode is active.
    for(const [index,label] of [[0,'stars'],[1,'rabbit'],[3,'rhino'],[5,'zio']]){
      await page.evaluate(value=>window.__KBJ_FORCE_SCENE=value,index);
      await page.waitForTimeout(950);
      await page.screenshot({path:'qa-screenshots/'+spec.name+'-'+label+'.png'});
      if(!spec.isMobile){
        const original=await page.evaluate(()=>{
          const w=document.querySelector('.hero-film-window');
          const previous=w.style.maskImage;
          w.style.maskImage='none';w.style.webkitMaskImage='none';
          return previous;
        });
        await page.waitForTimeout(200);
        await page.screenshot({path:'qa-screenshots/world-'+label+'.png'});
        await page.evaluate(original=>{
          const w=document.querySelector('.hero-film-window');
          w.style.maskImage=original;w.style.webkitMaskImage=original;
        },original);
      }
      const active=await page.evaluate(()=>window.__KBJ_DIAGNOSTICS?.gpu?.objectWorlds);
      if(!active?.active)throw new Error('3D scene became inactive '+label);
    }
    await page.evaluate(()=>window.__KBJ_FORCE_SCENE=undefined);
    if(spec.name==='desktop'){
      // Hover only the original fixed K glyph, not its changing zoomed edge.
      // Hold the mouse absolutely stationary to catch the former
      // shrink/expand/shrink/expand feedback oscillation.
      await page.mouse.move(91,208);
      await page.waitForTimeout(2200);
      const first=await page.evaluate(()=>window.__KBJ_DIAGNOSTICS?.letterScale);
      await page.waitForTimeout(1600);
      const later=await page.evaluate(()=>window.__KBJ_DIAGNOSTICS?.letterScale);
      const controls=await page.evaluate(()=>({
        cursor:getComputedStyle(document.querySelector('#hero-canvas')).cursor,
        customCursor:!!document.querySelector('.elite-cursor'),
        paintOutside:(document.querySelector('.hero-film-window')?.style.maskImage||'').includes('radial-gradient'),
        nativeScale:window.__KBJ_DIAGNOSTICS?.gpu?.nativeLetterScale,
        nativeMaskSize:document.querySelector('.hero-film-window')?.style.maskSize||''
      }));
      if(!(first>1.03 && later>=first-.003 && later<=1.086)){
        throw new Error('Stationary hover zoom unstable '+JSON.stringify({first,later}));
      }
      if(controls.customCursor||controls.paintOutside||controls.cursor==='none')
        throw new Error('Old cursor or paint effect remained '+JSON.stringify(controls));
      console.log(JSON.stringify({device:'desktop',steadyHover:{first,later,...controls}}));
      await page.screenshot({path:'qa-screenshots/desktop-hover-expanded.png'});
      await page.mouse.move(710,26);
      await page.waitForTimeout(1600);
      const reset=await page.evaluate(()=>window.__KBJ_DIAGNOSTICS?.letterScale);
      if(!reset||reset>1.025)throw new Error('Hover zoom failed to settle '+reset);
      await page.screenshot({path:'qa-screenshots/desktop-hover-reset.png'});
    }
    const expected=[
      ['Inverted World','https://kilejones.substack.com/subscribe'],
      ['Unlikely Zio','https://kilejones-alt.github.io/the-unlikely-zionists/'],
      ['Glossary','https://kilejones-alt.github.io/TheAntizionistGlossary/'],
      ['AZ Detector','https://antizionistdetector.netlify.app/'],
      ['Media',new URL('media.html',url).href]
    ];
    await page.locator('#menu-toggle').click();
    const links=await page.locator('#mobile-drawer a').evaluateAll(
      els=>els.map(x=>[x.textContent.trim(),x.href])
    );
    if(JSON.stringify(links)!==JSON.stringify(expected)) {
      throw new Error('Menu/link mismatch '+JSON.stringify(links));
    }
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='true') {
      throw new Error('Menu refused to open');
    }
    const menuDesign=await page.locator('#mobile-drawer').evaluate(el=>{
      const a=el.querySelector('a');
      return {width:el.getBoundingClientRect().width,
        fontSize:parseFloat(getComputedStyle(a).fontSize),
        fontWeight:parseInt(getComputedStyle(a).fontWeight,10)};
    });
    if(menuDesign.width>320||menuDesign.fontSize>20||menuDesign.fontWeight>600)
      throw new Error('Menu remains oversized or too bold '+JSON.stringify(menuDesign));
    await page.waitForTimeout(800);
    const menuVisibility=await page.locator('#mobile-drawer').evaluate(el=>({
      visibility:getComputedStyle(el).visibility,
      opacity:parseFloat(getComputedStyle(el).opacity),
      y:el.getBoundingClientRect().y
    }));
    const stillExpanded=await page.locator('#menu-toggle').getAttribute('aria-expanded');
    if(stillExpanded!=='true'||menuVisibility.visibility!=='visible'||menuVisibility.opacity<.55)
      throw new Error('Dropdown did not remain visibly open '+spec.name+': '+JSON.stringify({stillExpanded,...menuVisibility}));
    await page.screenshot({path:'qa-screenshots/'+spec.name+'-menu.png'});
    if(!spec.isMobile){
      // Keep the dropdown open on entry, and close after leaving its region.
      await page.locator('#mobile-drawer a').first().hover();
      await page.waitForTimeout(280);
      if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='true')
        throw new Error('Menu closed while moving into dropdown');
      await page.mouse.move(8,85);
      await page.waitForTimeout(850);
      if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false')
        throw new Error('Menu stayed open after pointer left');
      await page.locator('#menu-toggle').click();
    }
    await page.keyboard.press('Escape');
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false') {
      throw new Error('Menu refused to close on Escape');
    }

    if(diagnostic?.gpu?.objectWorlds?.camera!=='true perspective, 30.3deg FOV') {
      throw new Error('Object world must use a real perspective projection');
    }
    if(!diagnostic?.gpu?.active) throw new Error('GPU not active for '+spec.name);
    if(!diagnostic?.parentMask) throw new Error('Native letter mask missing for '+spec.name);
    const bounds=await page.evaluate(()=>{
      const c=document.querySelector('#hero-canvas');
      const nav=document.querySelector('.site-header');
      const cr=c?.getBoundingClientRect();
      const nr=nav?.getBoundingClientRect();
      return {canvas:[cr?.width,cr?.height],navRight:nr?.right,
        scrollWidth:document.documentElement.scrollWidth,
        innerWidth:window.innerWidth,
        mask:!!document.querySelector('.hero-film-window')};
    });
    if(bounds.scrollWidth>bounds.innerWidth+2 || bounds.navRight>bounds.innerWidth+2)
      throw new Error('Viewport overflow '+spec.name+': '+JSON.stringify(bounds));
    if((diagnostic?.gpu?.scenes?.numberOfCameraTreatments||0)!==6) throw new Error('Expected six scene camera treatments');
    if(errors.length) throw new Error('Browser errors: '+errors.join('; '));
    await context.close();
  }
  // Legacy fallback is a committed feature, not theoretical. Ensure the
  // explicit diagnostic bypass actually loads visible Canvas 2D animation.
  const fallbackContext=await browser.newContext({
    viewport:{width:1000,height:650},deviceScaleFactor:1
  });
  const fallbackPage=await fallbackContext.newPage();
  await fallbackPage.goto(url+'?renderer=legacy',{waitUntil:'domcontentloaded'});
  await fallbackPage.waitForTimeout(1000);
  const fallback=await fallbackPage.evaluate(()=>window.__KBJ_DIAGNOSTICS);
  if(!fallback || fallback.renderer!=='original Canvas 2D fallback'){
    throw new Error('Legacy Canvas 2D fallback failed '+JSON.stringify(fallback));
  }
  console.log(JSON.stringify({device:'legacy',renderer:fallback.renderer}));
  await fallbackContext.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
