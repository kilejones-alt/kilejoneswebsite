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
        JSON.stringify(world.objectsByScene)!==JSON.stringify([14,12,5,19,4,7])) {
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
    if(!spec.isMobile){
      // Confirm the fluid opening comes out of a real opaque letter, rather
      // than forming an unrelated black blob in the white page gutter.
      await page.mouse.move(91,208);
      await page.waitForTimeout(800);
      const cursor=await page.evaluate(()=>{
        const w=document.querySelector('.hero-film-window');
        return !!w && w.style.maskImage.includes('radial-gradient');
      });
      console.log(JSON.stringify({device:'desktop',cursorFluidRevealFromGlyph:cursor}));
      if(!cursor)throw new Error('Pointer over K did not open cursor reveal');
      await page.screenshot({path:'qa-screenshots/desktop-fluid-reveal.png'});
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
    await page.keyboard.press('Escape');
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false') {
      throw new Error('Menu refused to close on Escape');
    }

    if(!diagnostic?.gpu?.active) throw new Error('GPU not active for '+spec.name);
    if(!diagnostic?.parentMask) throw new Error('Native letter mask missing for '+spec.name);
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
