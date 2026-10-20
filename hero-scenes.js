/* Kile B. Jones — scene names and reversible legacy-video treatments.
 * The primary six actual 3D object worlds are implemented independently in
 * hero-object-worlds.js. This script remains the source-footage fallback rig.
 */
(() => {
  'use strict';

  const SCENES = Object.freeze([
    {name:'MIDNIGHT / STARS',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
    {name:'PINK / BALLOON RABBIT',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
    {name:'DARK / SCULPTURE',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
    {name:'MATTE BLACK / RHINO',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
    {name:'WHITE / TRANSLUCENT',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
    {name:'FOIL / ZIO',zoom:1.04,x:0,y:0,roll:0,tilt:0,bright:1.14,contrast:1.08,sat:1,gray:0},
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
    const mobile=window.innerWidth<=700;
    const tx=(c.x - smoothX*.029 + driftX)*(mobile?.52:1);
    const ty=(c.y - smoothY*.021 + driftY)*(mobile?.55:1);
    const pitch=-smoothY*.85+Math.sin(now*.29)*.34;
    const yaw=smoothX*1.10+Math.cos(now*.33)*.35;
    const z=lerp(1,c.zoom,mobile?.42:1) + .008*Math.sin(now*.47);
    // Parent is masked; footage moves *behind* stationary glyphs.
    const transform =
      'translateY(-50%) translate3d('+ (tx*100).toFixed(3)+'%,'+(ty*100).toFixed(3)+'%,0) '+
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
      kind:'legacy video treatment rig; six separate 3D object worlds now render independently'
    })
  };
})();
