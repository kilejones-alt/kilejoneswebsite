/* Kile B. Jones — cinematic source-footage direction.
 * All scenes currently retain the ORIGINAL video asset. This is genuine
 * camera/grade direction, not an unverified claim of six different 3D worlds.
 * Source media can be expanded only after separate asset review.
 */
(() => {
  'use strict';

  const SCENES = Object.freeze([
    {name:'FILM / REVEAL',        zoom:1.08, x:-.016,y:-.014,roll:-.30,tilt:.65,  bright:1.13,contrast:1.10,sat:1.02,gray:0},
    {name:'DEEP COBALT',          zoom:1.16, x:.021, y:-.020,roll:.42, tilt:-1.2, bright:1.08,contrast:1.20,sat:1.30,gray:.15},
    {name:'MERCURY / STUDIO',     zoom:1.11, x:-.028,y:.012, roll:-.45,tilt:1.65,bright:1.24,contrast:1.31,sat:.34,gray:.78},
    {name:'MONOCHROME / CLOSE',   zoom:1.23, x:.018, y:.024, roll:.52, tilt:-1.2, bright:1.23,contrast:1.27,sat:0,gray:1},
    {name:'HIGH KEY / MOTION',    zoom:1.10, x:-.011,y:.018, roll:-.28,tilt:.85, bright:1.40,contrast:1.08,sat:.62,gray:.45},
    {name:'FILM / OPEN WORLD',    zoom:1.14, x:.020, y:-.009,roll:.31, tilt:-.75,bright:1.18,contrast:1.10,sat:.95,gray:0}
  ]);

  const lerp = (a,b,t)=>a+(b-a)*t;
  const blend = (a,b,t)=>Object.fromEntries(
    ['zoom','x','y','roll','tilt','bright','contrast','sat','gray']
      .map(k=>[k,lerp(a[k],b[k],t)])
  );
  const smooth = t=>t*t*(3-2*t);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  let smoothX=0,smoothY=0,last=0,frame=0;
  let lastFilter='',lastTransform='';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function apply(video, options){
    if(!video || reduce) return;
    const now=options.now * .001;
    const dt=clamp(options.dt, .001, .05);
    const targetX=options.pointer?.active ? options.pointer.nx : 0;
    const targetY=options.pointer?.active ? options.pointer.ny : 0;

    // Follow directly but without cursor discontinuity. This motion runs
    // continuously when nobody is interacting.
    const response=1-Math.exp(-dt*11);
    smoothX=lerp(smoothX,targetX,response);
    smoothY=lerp(smoothY,targetY,response);
    const a=SCENES[options.mode%SCENES.length];
    const b=SCENES[options.nextMode%SCENES.length];
    const c=blend(a,b,smooth(clamp(options.mix||0,0,1)));
    const driftX=.012*Math.sin(now*.43) + .007*Math.sin(now*.17+.3);
    const driftY=.011*Math.cos(now*.37+.9);
    const tx=c.x - smoothX*.029 + driftX;
    const ty=c.y - smoothY*.021 + driftY;
    const pitch=-smoothY*.85+Math.sin(now*.29)*.34;
    const yaw=smoothX*1.10+Math.cos(now*.33)*.35;
    const z=c.zoom + .012*Math.sin(now*.47);
    // Parent is masked; footage moves *behind* stationary glyphs.
    const transform =
      'translate3d('+ (tx*100).toFixed(3)+'%,'+(ty*100).toFixed(3)+'%,0) '+
      'perspective(850px) rotateX('+(pitch).toFixed(2)+'deg) '+
      'rotateY('+(yaw+c.tilt).toFixed(2)+'deg) '+
      'rotateZ('+ (c.roll).toFixed(2)+'deg) scale('+z.toFixed(4)+')';
    if(transform!==lastTransform) video.style.transform=lastTransform=transform;

    // Color grading changes are gradual, not abrupt hue or rainbow overlays.
    if(last===0 || now-last>.045){
      const filter =
        'brightness('+c.bright.toFixed(3)+') '+
        'contrast('+c.contrast.toFixed(3)+') '+
        'saturate('+c.sat.toFixed(3)+') '+
        'grayscale('+c.gray.toFixed(3)+')';
      if(filter!==lastFilter)video.style.filter=lastFilter=filter;
      last=now;
    }
    frame++;
  }

  window.KBJScenes={
    duration:5.20,
    transition:1.65,
    names:SCENES.map(s=>s.name),
    apply,
    diagnostics:()=>({
      numberOfCameraTreatments:SCENES.length,
      sourceCount:1,
      originalFootagePreserved:true,
      animatedFrames:frame,
      kind:'camera+color direction (not distinct source footage)'
    })
  };
})();
