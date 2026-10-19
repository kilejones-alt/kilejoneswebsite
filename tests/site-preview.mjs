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
    const diagnostic=await page.evaluate(()=>window.__KBJ_DIAGNOSTICS||null);
    await page.screenshot({path:'qa-screenshots/'+spec.name+'.png'});
    console.log(JSON.stringify({device:spec.name,diagnostic,errors}));
    await context.close();
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
