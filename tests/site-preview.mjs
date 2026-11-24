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
    await page.locator('#menu-toggle').click();
    await page.screenshot({path:'qa-screenshots/'+spec.name+'-hero.png'});

    await page.goto(base+'?scene=6',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>{
      const film=document.querySelector('.hero-art-plate-archive video');
      return film && !film.paused && film.readyState>=2 && film.currentTime>.2;
    },undefined,{timeout:15000});
    await page.screenshot({path:'qa-screenshots/'+spec.name+'-archival-film.png'});
    await page.goto(base+'?scene=7',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>{
      const film=document.querySelector('.hero-art-plate-lenin video');
      return film && !film.paused && film.readyState>=2 && film.currentTime>.2;
    },undefined,{timeout:15000});
    await page.screenshot({path:'qa-screenshots/'+spec.name+'-lenin-film.png'});
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
    console.log(JSON.stringify({device:spec.name,bounds,controls:'passed'}));
    await context.close();
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
