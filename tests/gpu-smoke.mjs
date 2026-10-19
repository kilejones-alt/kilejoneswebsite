import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',
        '--use-gl=angle','--use-angle=swiftshader',
        '--autoplay-policy=no-user-gesture-required']
});
try {
  const page=await browser.newPage({viewport:{width:980,height:700}});
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.setContent('<section class="hero"><canvas id="hero-canvas"></canvas></section>');
  await page.addScriptTag({path:resolve('hero-gpu.js')});
  const result=await page.evaluate(async()=>{
    const original=document.getElementById('hero-canvas');
    const gpu=window.KBJGpuRenderer.create(original,{
      getAttribute:()=> 'about:blank',currentSrc:''
    });
    if(!gpu || gpu.failed) return {phase:'initialize',status:gpu?.status};

    // Same-origin live video from canvas: no CDN or user assets required.
    const source=document.createElement('canvas');
    source.width=640;source.height=360;
    const c=source.getContext('2d');
    c.fillStyle='#2061bd';c.fillRect(0,0,640,360);
    c.fillStyle='#fff';c.fillRect(110,80,230,210);
    gpu.video.pause();
    gpu.video.removeAttribute('src');
    gpu.video.srcObject=source.captureStream(24);
    try {await gpu.video.play();}catch(error) {
      return {phase:'video',reason:String(error)};
    }
    for(let i=0;i<30 && gpu.video.readyState<2;i++){
      await new Promise(resolve=>setTimeout(resolve,50));
    }

    const mask=document.createElement('canvas');
    mask.width=980;mask.height=700;
    const m=mask.getContext('2d');
    m.textAlign='center';m.textBaseline='middle';
    m.font='900 190px Arial';m.fillStyle='#111';
    m.fillText('KILE B.',490,270);
    m.fillText('JONES',490,470);
    gpu.resize(980,700,1,mask);

    const pointer={nx:.22,ny:-.18,active:true,overCanvas:true};
    const frames=[];
    for(let i=0;i<4;i++) {
      frames.push(gpu.render({
        now:performance.now()+i*22,dt:1/50,pointer,
        mode:1,nextMode:2,mix:.25,reducedMotion:false
      }));
    }
    return {phase:'render',frames,status:gpu.status};
  });
  console.log(JSON.stringify(result));
  assert.equal(result.phase,'render');
  assert.ok(result.frames.every(Boolean),'One or more GPU frames failed');
  assert.equal(result.status,'active');
  assert.deepEqual(errors,[]);
}finally { await browser.close(); }
