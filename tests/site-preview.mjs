/* Production homepage smoke check with desktop and phone screenshots. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.mp3':'audio/mpeg','.png':'image/png',
  '.svg':'image/svg+xml','.jpg':'image/jpeg','.mp4':'video/mp4','.ico':'image/x-icon',
  '.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',
  '--use-gl=angle','--use-angle=swiftshader'
]});
fs.mkdirSync('qa-screenshots',{recursive:true});
try{
  for(const spec of [
    {name:'desktop',width:1440,height:900,mobile:false,dpr:1},
    {name:'phone',width:390,height:844,mobile:true,dpr:2}
  ]){
    const context=await browser.newContext({
      viewport:{width:spec.width,height:spec.height},
      isMobile:spec.mobile,hasTouch:spec.mobile,deviceScaleFactor:spec.dpr
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>!!window.__KBJ_DIAGNOSTICS,undefined,{timeout:15000});
    if((await page.locator('h1').textContent())?.trim()!=='Kile Jones')
      throw new Error('The homepage name is not Kile Jones');
    if(await page.locator('main > section').count()!==1)
      throw new Error('The homepage must have a single opening stage');
    if(await page.locator('.pill-nav a').count()!==0)
      throw new Error('Substack should appear only in the dropdown');
    if(await page.locator('.detector-feature').count()!==0)
      throw new Error('Detector image returned to the homepage');
    await page.locator('#menu-toggle').click();
    if(await page.locator('.mobile-drawer a').nth(1).getAttribute('href')!=='https://play.google.com/store/apps/details?id=com.kilejones.antizionismdetector')
      throw new Error('Detector menu link must open Google Play');
    await page.keyboard.press('Escape');
    await page.screenshot({path:'qa-screenshots/'+spec.name+'-hero.png'});

    const clean=await page.evaluate(()=>({
      renderer:window.__KBJ_DIAGNOSTICS?.renderer,
      trail:window.__KBJ_DIAGNOSTICS?.trail,
      materialsEnabled:window.__KBJ_DIAGNOSTICS?.materialsEnabled,
      nativeFilmLoaded:!!document.querySelector('#hero-video')?.getAttribute('src'),
      plateCount:document.querySelectorAll('.hero-art-plate,.hero-gpu-layer').length
    }));
    if(!['Canvas 2D ink reveal','WebGL2 fluid ink reveal'].includes(clean.renderer) || clean.materialsEnabled!==false
      || clean.nativeFilmLoaded || clean.plateCount)
      throw new Error('Artwork is still active on the clean homepage: '+JSON.stringify(clean));
    if(clean.renderer==='WebGL2 fluid ink reveal' && !Array.isArray(clean.trail))
      throw new Error('Ink renderer must expose its delayed pointer state');
    if(!spec.mobile){
      const corner={x:spec.width-260,y:spec.height-230,width:190,height:160};
      const before=await page.screenshot({clip:corner});
      await page.mouse.move(corner.x+95,corner.y+80);
      await page.waitForTimeout(160);
      const after=await page.screenshot({clip:corner});
      if(before.equals(after))throw new Error('The open canvas does not react away from the lettering');
      await page.screenshot({path:'qa-screenshots/desktop-pointer.png'});
      const menuBox=await page.locator('#menu-toggle').evaluate(el=>el.getBoundingClientRect().left);
      await page.mouse.move(spec.width-10,spec.height/2);
      await page.waitForFunction(()=>window.__KBJ_DIAGNOSTICS.scene[0]<-1,undefined,{timeout:4000});
      await page.mouse.move(10,spec.height/2);
      await page.waitForFunction(()=>window.__KBJ_DIAGNOSTICS.scene[0]>1,undefined,{timeout:4000});
      const menuBoxAfter=await page.locator('#menu-toggle').evaluate(el=>el.getBoundingClientRect().left);
      if(Math.abs(menuBoxAfter-menuBox)>.1)throw new Error('The dropdown controls must stay outside the parallax stage');
    }else{
      await page.mouse.move(20,spec.height/2);
      await page.mouse.down();
      await page.mouse.move(spec.width-20,spec.height/2,{steps:8});
      await page.waitForFunction(()=>Math.abs(window.__KBJ_DIAGNOSTICS.scene[0])>1,undefined,{timeout:4000});
      await page.screenshot({path:'qa-screenshots/phone-touch.png'});
      await page.mouse.up();
      await page.waitForFunction(()=>Math.abs(window.__KBJ_DIAGNOSTICS.scene[0])<.5,undefined,{timeout:4000});
    }
    const bounds=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,
      scrollHeight:document.documentElement.scrollHeight,innerHeight:innerHeight
    }));
    if(bounds.scrollWidth>bounds.innerWidth+2 || bounds.scrollHeight>bounds.innerHeight+2)
      throw new Error('Homepage has overflow or extra panels: '+JSON.stringify(bounds));

    await page.locator('#music-toggle').click();
    await page.waitForFunction(()=>{
      const audio=document.querySelector('#background-music');
      return !audio.paused&&audio.readyState>=2&&!audio.error;
    },undefined,{timeout:10000});
    await page.locator('#music-toggle').click();
    await page.locator('#menu-toggle').click();
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='true'
      || await page.locator('#mobile-drawer a').count()!==6
      || await page.locator('#mobile-drawer a').first().innerText()!=='Inverted World')
      throw new Error('Menu failed');
    await page.keyboard.press('Escape');
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false')
      throw new Error('Menu did not close');
    if(errors.length)throw new Error('Browser exceptions: '+errors.join('; '));
    console.log(JSON.stringify({device:spec.name,renderer:clean.renderer,bounds,controls:'passed'}));
    await context.close();
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
