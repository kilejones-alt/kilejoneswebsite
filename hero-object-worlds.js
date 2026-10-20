
/* Original native-WebGL2 sculptural objects for KILE B. / JONES.
 * Procedural geometry. Not copied from Noth.in, not AI imagery.
 * Failure is nonfatal: the untouched native video remains underneath.
 */
(()=>{'use strict';
const PI=Math.PI,TAU=PI*2;
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const names=['MIDNIGHT / STARS','PINK / RABBIT','DARK / DEPTH','BLACK / RHINO','WHITE / GLASS','FOIL / ZIO'];
const vert=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
uniform mat4 uModel,uVP;
out vec3 vNormal,vPosition,vLocal;
void main(){
 vec4 p=uModel*vec4(aPos,1.);
 vPosition=p.xyz;vLocal=aPos;
 vNormal=normalize(mat3(transpose(inverse(uModel)))*aNormal);
 gl_Position=uVP*p;
}`;
const frag=`#version 300 es
precision highp float;
in vec3 vNormal,vPosition,vLocal;
out vec4 color;
uniform vec3 uBase;
uniform vec3 uEye;
uniform float uType,uAlpha,uTime,uSeed;
void main(){
 vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);
 vec3 l1=normalize(vec3(-.73,.89,1.1)),l2=normalize(vec3(.9,.38,.62));
 vec3 l3=normalize(vec3(.15,-.9,.83));
 float diff=.52*max(dot(n,l1),0.)+.35*max(dot(n,l2),0.)+
 .24*max(dot(n,l3),0.);
 float spec=pow(max(dot(reflect(-l1,n),v),0.),80.);
 float band=pow(max(dot(reflect(-l2,n),v),0.),24.);
 float soft=pow(max(dot(reflect(-l3,n),v),0.),9.);
 float rim=pow(1.-max(dot(n,v),0.),3.);
 float wrinkle=sin(vLocal.x*21.+vLocal.z*47.+uSeed*7.)*
                sin(vLocal.y*33.-vLocal.x*14.+uTime*.12);
 vec3 col=uBase*(.23+diff*1.09);
 if(uType<.5){col+=vec3(.28,.48,.91)*(spec*1.5+band*.34+rim*.30);}
 else if(uType<1.5){col+=vec3(1.,.83,.94)*(spec*2.1+band*.26)+uBase*rim*.33;}
 else if(uType<2.5){col+=vec3(.30,.40,.52)*(spec*.27+band*.18+rim*.16);}
 else if(uType<3.5){
   vec3 foil=mix(vec3(.33,.40,.47),vec3(.95,.96,.97),.5+.5*wrinkle);
   col=foil*(.22+diff*.78)+vec3(1.)*(spec*1.55+band*.94)+vec3(.31,.40,.51)*rim*.65;
 }
 else if(uType<4.5){col+=vec3(.84,.95,1.)*(spec*.81+rim*.51+soft*.24);}
 else {col+=vec3(.31,.38,.49)*(spec*.55+rim*.27);}
 col=pow(clamp(col/(col+vec3(.75)),0.,1.),vec3(.83));
 color=vec4(col,uAlpha);
}`;
const bgV=`#version 300 es
precision highp float;
out vec2 uv;
void main(){
 vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
 uv=p;gl_Position=vec4(p*2.-1.,0.,1.);
}`;
const bgF=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform float uScene,uNext,uMix,uTime;
vec3 background(float scene,vec2 p){
 vec2 d=p*2.-1.;float v=exp(-dot(d,d)*.86);
 if(scene<.5)return mix(vec3(.002,.004,.023),vec3(.02,.052,.14),v);
 if(scene<1.5)return mix(vec3(.037,.015,.026),vec3(.17,.077,.119),v*.72);
 if(scene<2.5)return mix(vec3(.006,.009,.016),vec3(.066,.074,.092),v);
 if(scene<3.5)return mix(vec3(.002,.003,.006),vec3(.047,.049,.056),v);
 if(scene<4.5)return mix(vec3(.20,.26,.31),vec3(.55,.59,.63),v);
 return mix(vec3(.011,.017,.023),vec3(.073,.085,.10),v);
}
void main(){
 vec3 c=mix(background(uScene,uv),background(uNext,uv),uMix);
 float n=fract(sin(dot(floor(uv*vec2(1001.,601.)+uTime*2.),
 vec2(12.9898,78.233)))*43758.5453);
 color=vec4(c+(n-.5)*.006,1.);
}`;
const id=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const mm=(a,b)=>{const o=new Float32Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++){
 let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;
 }return o;};
const trans=(x,y,z)=>{let a=id();a[12]=x;a[13]=y;a[14]=z;return a};
const scale=(x,y,z)=>{let a=id();a[0]=x;a[5]=y;a[10]=z;return a};
const rx=t=>{let a=id(),c=Math.cos(t),s=Math.sin(t);
 a[5]=c;a[6]=s;a[9]=-s;a[10]=c;return a};
const ry=t=>{let a=id(),c=Math.cos(t),s=Math.sin(t);
 a[0]=c;a[2]=-s;a[8]=s;a[10]=c;return a};
const rz=t=>{let a=id(),c=Math.cos(t),s=Math.sin(t);
 a[0]=c;a[1]=s;a[4]=-s;a[5]=c;return a};
const model=(p,s,r)=>mm(trans(...p),mm(ry(r[1]),mm(rx(r[0]),mm(rz(r[2]),scale(...s)))));
const ortho=(aspect)=>new Float32Array([1/(3.25*aspect),0,0,0,
 0,1/3.25,0,0,0,0,-1/25,0,0,0,-12/25,1]);
function geometry(){
 let a=[];
 function tri(p,q,r,n){
  if(!n){
   const x=q.map((v,i)=>v-p[i]),y=r.map((v,i)=>v-p[i]);
   n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
   let d=Math.hypot(...n)||1;n=n.map(v=>v/d);
  }
  for(const v of [p,q,r])a.push(...v,...n);
 }
 function quad(p,q,r,s,n){tri(p,q,r,n);tri(p,r,s,n)}
 return {a,tri,quad};
}
function sphere(){
 let a=[],rows=18,cols=28;
 const v=(i,j)=>{let t=PI*i/rows,p=TAU*j/cols;
 return [Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)]};
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
  let p=[v(i,j),v(i+1,j),v(i+1,j+1),v(i,j+1)];
  for(let k of [0,1,2,0,2,3])a.push(...p[k],...p[k]);
 }
 return new Float32Array(a);
}
function torus(){
 let a=[],n=48,m=12,rx0=.76,ry0=1,tube=.20;
 const sample=(i,j)=>{let th=TAU*i/n,ph=TAU*j/m;
 let c=Math.cos(th),s=Math.sin(th),rad=[c/rx0,s/ry0],len=Math.hypot(...rad);
 rad=rad.map(x=>x/len);
 let normal=[rad[0]*Math.cos(ph),rad[1]*Math.cos(ph),Math.sin(ph)];
 return [rx0*c+tube*normal[0],ry0*s+tube*normal[1],tube*normal[2],...normal];
 };
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
 let p=sample(i,j),q=sample(i+1,j),r=sample(i+1,j+1),s=sample(i,j+1);
 a.push(...p,...q,...r,...p,...r,...s);}
 return new Float32Array(a);
}
function star(){
 let {a,tri,quad}=geometry(),points=[],thick=.24;
 for(let j=0;j<10;j++){
 let t=-PI/2+j*PI/5,rad=j%2?.46:1;
 points.push([Math.cos(t)*rad,Math.sin(t)*rad]);
 }
 for(let j=0;j<10;j++){
 const k=(j+1)%10;
 const f=p=>[p[0]*.94,p[1]*.94,thick/2],b=p=>[p[0]*.94,p[1]*.94,-thick/2];
 tri([0,0,thick/2],f(points[j]),f(points[k]),[0,0,1]);
 tri([0,0,-thick/2],b(points[k]),b(points[j]),[0,0,-1]);
 }
 const rings=[[-.12,.94],[-.09,1],[.09,1],[.12,.94]];
 for(let i=0;i<3;i++)for(let j=0;j<10;j++){
  let k=(j+1)%10,[z,s]=rings[i],[zz,ss]=rings[i+1];
  quad([points[j][0]*s,points[j][1]*s,z],
  [points[k][0]*s,points[k][1]*s,z],
  [points[k][0]*ss,points[k][1]*ss,zz],
  [points[j][0]*ss,points[j][1]*ss,zz]);
 }return new Float32Array(a);
}
function cone(){
 let {a,tri,quad}=geometry();
 for(let i=0;i<28;i++){
  let p=TAU*i/28,q=TAU*(i+1)/28;
  let v=(r,y,t)=>[r*Math.cos(t),y,r*Math.sin(t)];
  quad(v(.40,-1,p),v(.40,-1,q),v(.045,1,q),v(.045,1,p));
  tri([0,-1,0],v(.4,-1,q),v(.4,-1,p),[0,-1,0]);
 }return new Float32Array(a);
}
const material={star:0,pink:1,black:2,foil:3,white:4,dark:5};
function objects(){
 let worlds=[[],[],[],[],[],[]];
 const add=(s,geo,type,color,p,sc=[1,1,1],rot=[0,0,0],other={})=>
 worlds[s].push({geo,type,color,p,sc,rot,seed:worlds[s].length*.41,...other});
 for(let i=0;i<14;i++){
  const t=(i*.6180339887)%1*TAU,r=.70+Math.sqrt((i*.37027)%1)*2.8;
  const sz=.38+(i%4)*.19;
  add(0,'star',0,i%3?[.027,.089,.29]:[.075,.17,.49],
   [Math.cos(t)*r,Math.sin(t)*r*.80,-1.8+(i%5)*.80],
   [sz,sz,sz],[.11*i,.24*i,.20*i],
   {kind:'star',phase:i*1.73,spin:.04+(i%4)*.045,dir:i%2?1:-1});
 }
 const pink=[.98,.015,.27],dark=[.064,.070,.075],grey=[.11,.12,.13];
 const rabbit=(geo,p,s,r=[0,0,0])=>add(1,geo,1,pink,p,s,r,{kind:'rabbit'});
 rabbit('sphere',[-.20,-.21,0],[.99,.43,.47],[0,0,-.10]);
 rabbit('sphere',[.70,.30,.02],[.46,.48,.47]);
 rabbit('sphere',[.29,.03,0],[.37,.29,.29],[0,0,.38]);
 rabbit('sphere',[-1.05,.01,0],[.23,.23,.23]);
 for(let x of [-.74,.39])for(let z of [-.29,.29]){
 rabbit('sphere',[x,-.60,z],[.27,.40,.25],[0,0,x<0?-.12:.13]);}
 rabbit('ring',[.45,1.34,.02],[.25,.82,.96],[0,-.17,.17]);
 rabbit('ring',[.99,1.31,-.03],[.25,.83,.96],[0,.17,-.13]);
 rabbit('sphere',[.47,.65,0],[.19,.18,.24]);
 rabbit('sphere',[.98,.64,0],[.19,.18,.24]);
 for(let i=0;i<5;i++){
 add(2,i%2?'ring':'sphere',5,[.076,.086,.099],
 [(-2+i)*1.08,Math.sin(i*1.78)*.79,-1+i*.56],
 i%2?[.48,.73,.63]:[.47,.74,.39],
 [i*.32,i*.24,i*.17],{kind:'support',phase:i*1.1,dir:i%2?1:-1});
 }
 const rhino=(geo,p,s,r=[0,0,0],color=dark)=>add(3,geo,2,color,p,s,r,{kind:'rhino'});
 rhino('sphere',[-.21,-.18,0],[1.32,.73,.70]);
 rhino('sphere',[.52,.17,-.04],[.68,.85,.66],[0,0,-.20]);
 rhino('sphere',[-1.22,.03,0],[.43,.54,.55]);
 rhino('sphere',[1.22,-.43,0],[.69,.49,.44],[0,0,-.41]);
 rhino('sphere',[1.64,-.66,.0],[.56,.27,.33],[0,0,-.08]);
 rhino('sphere',[1.80,-.86,0],[.24,.14,.28]);
 for(let x of [-.95,.73])for(let z of [-.39,.39]){
  rhino('sphere',[x,-.84,z],[.30,.51,.26],[0,0,x>0?.10:-.05]);
  rhino('sphere',[x,-1.23,z],[.29,.18,.28]);}
 rhino('cone',[1.53,-.19,.05],[.28,.67,.29],[0,0,-.55],grey);
 rhino('cone',[1.13,.04,.08],[.19,.34,.20],[0,0,-.26],grey);
 rhino('cone',[1.0,.63,.28],[.14,.24,.14],[0,0,-.19]);
 rhino('cone',[1.02,.59,-.28],[.14,.22,.14],[0,0,.16]);
 rhino('sphere',[1.47,-.30,.41],[.050,.034,.026],[0,0,-.39],grey);
 for(let i=0;i<4;i++)add(4,i%2?'ring':'sphere',4,[.77,.85,.90],
 [(i-1.5)*1.19,i%2?.48:-.41,-1+i*.61],
 i%2?[.66,.95,.78]:[.49,.82,.49],
 [i*.29,i*.19,i*.18],{kind:'support',phase:i*1.7,dir:i%2?-1:1});
 const foil=(letter,geo,p,s,r=[0,0,0])=>
 add(5,geo,3,[.75,.78,.82],p,s,r,{kind:'foil',letter,phase:letter*1.5});
 foil(0,'sphere',[-2.03,.72,0],[.64,.15,.22]);
 foil(0,'sphere',[-2.03,-.72,0],[.64,.15,.22]);
 foil(0,'sphere',[-2.03,0,0],[.14,.87,.22],[0,0,-.68]);
 foil(1,'sphere',[-.06,.72,0],[.46,.15,.22]);
 foil(1,'sphere',[-.06,0,0],[.15,.76,.22]);
 foil(1,'sphere',[-.06,-.72,0],[.46,.15,.22]);
 foil(2,'ring',[1.78,0,0],[.74,.93,1.16]);
 return worlds;
}
class Stage{
 constructor(host){
  this.host=host;this.canvas=document.createElement('canvas');
  this.canvas.className='hero-object-canvas';
  this.canvas.setAttribute('aria-hidden','true');host.appendChild(this.canvas);
  this.gl=this.canvas.getContext('webgl2',{
    alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:false,
    powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL2 unavailable');
  const gl=this.gl;
  const compile=(kind,code)=>{
   const sh=gl.createShader(kind);gl.shaderSource(sh,code);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
   return sh;
  };
  const program=(v,f)=>{
   const p=gl.createProgram(),a=compile(gl.VERTEX_SHADER,v),b=compile(gl.FRAGMENT_SHADER,f);
   gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);
   gl.deleteShader(a);gl.deleteShader(b);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
   return p;
  };
  this.program=program(vert,frag);
  this.bgProgram=program(bgV,bgF);
  this.meshes={};
  for(let [name,data] of Object.entries({sphere:sphere(),star:star(),ring:torus(),cone:cone()})){
    const vao=gl.createVertexArray(),buffer=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    this.meshes[name]={vao,buffer,count:data.length/6};
  }
  this.bgVao=gl.createVertexArray();
  this.u={};for(let n of ['uModel','uVP','uBase','uEye','uType','uAlpha','uTime','uSeed'])
    this.u[n]=gl.getUniformLocation(this.program,n);
  this.bu={};for(let n of ['uScene','uNext','uMix','uTime'])
    this.bu[n]=gl.getUniformLocation(this.bgProgram,n);
  this.items=objects();this.pointer=[0,0];this.frames=0;
  this.ready=true;this.fault=null;this.width=0;this.height=0;
  this.canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();this.ready=false;this.fault='context lost';
    this.canvas.style.display='none';
  });
 }
 resize(){
  let rect=this.host.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,rect.width<700?1:1.12);
  const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
  if(!w||!h)return false;
  if(this.width!==w||this.height!==h){
   this.canvas.width=this.width=w;this.canvas.height=this.height=h;
  }return true;
 }
 matrix(o,t,mobile,scene){
  let p=[...o.p],sc=[...o.sc],rot=[...o.rot];
  const phase=o.phase||o.seed,x=this.pointer[0],y=this.pointer[1];
  if(o.kind==='star'){
   p[0]+=Math.sin(t*.19+phase)*.22*o.dir;
   p[1]+=Math.cos(t*.27+phase)*.18;
   p[2]+=Math.sin(t*.31+phase)*.41;
   rot[1]+=t*o.spin*o.dir;rot[0]+=t*o.spin*.78;rot[2]+=t*o.spin*.45;
   if(mobile)p[0]*=.52;
  }else if(o.kind==='rabbit'){
   p[1]+=Math.sin(t*.61)*.17;p[0]+=Math.sin(t*.35)*.12;
   rot[1]+=Math.sin(t*.34)*.19;rot[2]+=Math.sin(t*.19)*.039;
  }else if(o.kind==='rhino'){
   p[0]+=Math.sin(t*.19)*.06;rot[1]+=Math.sin(t*.26)*.17;
   if(mobile){p[0]*=.66;sc[0]*=.66;sc[1]*=.82;sc[2]*=.82;}
  }else if(o.kind==='foil'){
   const k=o.letter;
   p[1]+=Math.sin(t*(.37+k*.07)+k*1.50)*.16;
   p[2]+=Math.sin(t*(.24+k*.09)+k*2.30)*.34;
   rot[1]+=Math.sin(t*(.29+k*.07)+k*.68)*.23;
   rot[2]+=Math.sin(t*(.19+k*.06)+k)*.08;
   if(mobile){p[0]*=.43;sc[0]*=.43;sc[1]*=.73;sc[2]*=.73;}
  }else{
   p[1]+=Math.sin(t*.24+phase)*.20;p[2]+=Math.cos(t*.21+phase)*.28;
   rot[0]+=t*.045;rot[1]+=t*.05*o.dir;
   if(mobile)p[0]*=.55;
  }
  p[0]-=x*.35;p[1]+=y*.23;
  p[0]+=Math.sin(t*.11+scene)*.025;
  return model(p,sc,rot);
 }
 drawScene(index,t,alpha,mobile){
  if(alpha<.005)return;
  const gl=this.gl;
  gl.useProgram(this.program);
  gl.uniformMatrix4fv(this.u.uVP,false,this.vp);
  gl.uniform3f(this.u.uEye,0,0,12);
  gl.uniform1f(this.u.uTime,t);
  gl.uniform1f(this.u.uAlpha,alpha);
  for(const o of this.items[index]){
   gl.uniformMatrix4fv(this.u.uModel,false,this.matrix(o,t,mobile,index));
   gl.uniform3fv(this.u.uBase,o.color);
   gl.uniform1f(this.u.uType,o.type);
   gl.uniform1f(this.u.uSeed,o.seed);
   let m=this.meshes[o.geo];gl.bindVertexArray(m.vao);
   gl.drawArrays(gl.TRIANGLES,0,m.count);
  }
 }
 render(options){
  if(!this.ready)return false;
  try{
   if(!this.resize())return false;
   const gl=this.gl,t=options.now*.001;
   const p=options.pointer||{},a=1-Math.exp(-clamp(options.dt||.016,.001,.05)*9);
   this.pointer[0]=lerp(this.pointer[0],p.active?p.nx:0,a);
   this.pointer[1]=lerp(this.pointer[1],p.active?p.ny:0,a);
   const aspect=this.width/this.height,mobile=aspect<.76;
   this.vp=ortho(aspect);
   const scene=options.mode%6,next=options.nextMode%6,mix=ease(options.mix||0);
   gl.viewport(0,0,this.width,this.height);
   gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
   gl.bindVertexArray(this.bgVao);
   gl.useProgram(this.bgProgram);
   gl.uniform1f(this.bu.uScene,scene);gl.uniform1f(this.bu.uNext,next);
   gl.uniform1f(this.bu.uMix,mix);gl.uniform1f(this.bu.uTime,t);
   gl.drawArrays(gl.TRIANGLES,0,3);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
   gl.disable(gl.BLEND);
   this.drawScene(scene,t,1,mobile);
   if(mix>.005){
    gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    this.drawScene(next,t,mix,mobile);gl.disable(gl.BLEND);
   }
   if(gl.getError()!==gl.NO_ERROR)throw Error('3D draw failed');
   this.frames++;return true;
  }catch(error){
   this.ready=false;this.fault=String(error.message||error);
   this.canvas.style.display='none';
   console.warn('[Kile 3D stage]',error);
   return false;
  }
 }
 destroy(){
  this.ready=false;const gl=this.gl;
  for(const m of Object.values(this.meshes)){
   gl.deleteBuffer(m.buffer);gl.deleteVertexArray(m.vao);
  }
  gl.deleteProgram(this.program);gl.deleteProgram(this.bgProgram);
  gl.deleteVertexArray(this.bgVao);this.canvas.remove();
 }
 diagnostic(){
  return {active:this.ready,frames:this.frames,worlds:names,
   objectsByScene:this.items.map(x=>x.length),
   proceduralMeshes:Object.keys(this.meshes),
   canvas:[this.width,this.height],fault:this.fault};
 }
}
let current=null;
window.KBJObjectWorlds={
 create(host){
  if(current)current.destroy();
  try{return(current=new Stage(host))}
  catch(e){console.warn('[Kile 3D stage] falling back to video',e);current=null;return null}
 },
 render(options){return current?.render(options)||false},
 diagnostic(){return current?.diagnostic()||{active:false,frames:0,fault:'not created'}},
 destroy(){if(current){current.destroy();current=null}}
};
})();