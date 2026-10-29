
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
uniform vec2 uMouse;
uniform float uType,uAlpha,uTime,uSeed;
void main(){
 vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);
 // Procedural foil creases alter the actual shading normal, not merely
 // the painted color. Two frequencies form different scales of crumpling.
 if(uType>2.5 && uType<3.5){
   vec3 p=vLocal;
   float a=p.x*24.0+p.z*15.0+uSeed*6.1;
   float b=p.y*31.0-p.x*17.0;
   float c=p.x*63.0-p.z*48.0+p.y*19.0+uSeed*4.4;
   vec3 bend=vec3(
     cos(a)*sin(b)*24.0-sin(a)*cos(b)*17.0,
     sin(a)*cos(b)*31.0,
     cos(a)*sin(b)*15.0);
   bend+=vec3(63.0,-19.0,-48.0)*cos(c)*.23;
   n=normalize(n+bend*.0065);
 }
 vec3 l1=normalize(vec3(-.73+uMouse.x*.37,.89-uMouse.y*.23,1.1));
 vec3 l2=normalize(vec3(.9-uMouse.x*.28,.38+uMouse.y*.25,.62));
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
 if(uType<.5){
   col+=vec3(.35,.62,1.0)*(spec*1.9+band*.52+rim*.60);
   col+=vec3(.03,.10,.24)*soft*.35;
 }
 else if(uType<1.5){
   // Glossy hot-pink latex under two broad photographic softboxes.
   col=uBase*(.34+diff*.94)+vec3(1.,.87,.95)*
       (spec*2.6+band*.38+soft*.19)+uBase*rim*.30;
 }
 else if(uType<2.5){
   // Matte-black velvet/plaster reads through bright edge and softbox lights,
   // not artificial gloss. Silhouette stays black on a lighter studio field.
   col=uBase*(.33+diff*.91)+vec3(.38,.47,.60)*(spec*.12+band*.20+rim*.48);
 }
 else if(uType<3.5){
   float dither=.5+.5*wrinkle;
   vec3 foil=mix(vec3(.30,.35,.41),vec3(.92,.94,.98),dither);
   float panel=pow(max(dot(reflect(-v,n),normalize(vec3(-.76,.35,.55))),0.),8.0);
   col=foil*(.27+diff*.93)+vec3(1.,.99,.98)*
       (spec*2.2+band*1.1+panel*.44)+vec3(.41,.53,.69)*rim*.61;
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
 if(scene<.5)return mix(vec3(.008,.021,.062),vec3(.050,.115,.265),v);
 if(scene<1.5)return mix(vec3(.140,.027,.075),vec3(.34,.074,.18),v*.80);
 if(scene<2.5)return mix(vec3(.006,.009,.016),vec3(.066,.074,.092),v);
 if(scene<3.5)return mix(vec3(.255,.279,.308),vec3(.47,.49,.53),v);
 if(scene<4.5)return mix(vec3(.20,.26,.31),vec3(.55,.59,.63),v);
 return mix(vec3(.034,.047,.061),vec3(.14,.17,.20),v);
}
void main(){
 vec3 c=mix(background(uScene,uv),background(uNext,uv),uMix);
 // Moving softbox strips and photographic haze create spatial depth
 // across both letter lines while leaving the hero object dominant.
 vec2 p=uv*2.-1.;
 float strip=exp(-pow((p.x-.37*sin(uTime*.12)-.17)*5.2,2.0));
 float softbox=strip*exp(-pow((p.y-.15)*1.02,2.0));
 float haze=exp(-dot(p+vec2(.40,-.33),p+vec2(.40,-.33))*2.2);
 float sceneLight=mix(uScene,uNext,uMix);
 vec3 lightTint=sceneLight<.5?vec3(.075,.14,.40):
   sceneLight<1.5?vec3(.16,.025,.06):
   sceneLight<2.5?vec3(.037,.042,.057):
   sceneLight<3.5?vec3(.043,.048,.055):
   sceneLight<4.5?vec3(.12,.13,.14):vec3(.085,.10,.15);
 c+=lightTint*(softbox*.32+haze*.13);
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
// True physical camera perspective: at z=0 the framing matches the
// previous 3.25-unit orthographic half-height, but forward objects now grow
// and distant objects recede. This makes XYZ parallax actual depth motion.
const perspective=(aspect)=>{
 const f=1/Math.tan((30.3*PI/180)*.5),n=.10,far=55;
 const proj=new Float32Array([
   f/aspect,0,0,0,
   0,f,0,0,
   0,0,(far+n)/(n-far),-1,
   0,0,(2*far*n)/(n-far),0]);
 return mm(proj,trans(0,0,-12));
};
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

/* Balloon-foil text is sculpted as three continuous extruded glyph
 * volumes, not as loose ellipsoid bars. Z and I use exact polygon outlines.
 * Rounded edges catch narrow studio highlights; O is an inflated torus.
 */
function foilGlyph(shape){
 const outlines={
   Z:[[-.79,.79],[.79,.79],[.79,.43],[-.19,-.43],
       [.79,-.43],[.79,-.79],[-.79,-.79],[-.79,-.43],
       [.19,.43],[-.79,.43]],
   I:[[-.56,.79],[.56,.79],[.56,.47],[.19,.47],
       [.19,-.47],[.56,-.47],[.56,-.79],[-.56,-.79],
       [-.56,-.47],[-.19,-.47],[-.19,.47],[-.56,.47]]
 };
 const pts=outlines[shape];
 const {a,tri,quad}=geometry();
 // Ear clipping ensures the diagonal cut of Z and recessed sides of I do
 // not get filled by a convex fan. Winding is normalized CCW.
 let area=0;for(let i=0;i<pts.length;i++){
   const u=pts[i],v=pts[(i+1)%pts.length];
   area+=u[0]*v[1]-v[0]*u[1];
 }
 const outline=area>0?pts:[...pts].reverse();
 function face(z,forward){
   const p=[...outline.keys()];
   function cross(i,j,k){
     const a=outline[i],b=outline[j],c=outline[k];
     return (b[0]-a[0])*(c[1]-a[1])-
       (b[1]-a[1])*(c[0]-a[0]);
   }
   function inside(pt,A,B,C){
     const det=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-
       (q[1]-p[1])*(r[0]-p[0]);
     return det(A,B,pt)>=0 && det(B,C,pt)>=0 && det(C,A,pt)>=0;
   }
   let limit=0;
   while(p.length>=3 && limit++<100){
     let clipped=false;
     for(let i=0;i<p.length;i++){
       const i0=p[(i+p.length-1)%p.length],i1=p[i],
         i2=p[(i+1)%p.length];
       if(cross(i0,i1,i2)<1e-6)continue;
       if(p.some(q=>q!==i0&&q!==i1&&q!==i2&&
           inside(outline[q],outline[i0],outline[i1],outline[i2])))continue;
       const v=j=>[...outline[j],z];
       if(forward)tri(v(i0),v(i1),v(i2),[0,0,1]);
       else tri(v(i2),v(i1),v(i0),[0,0,-1]);
       p.splice(i,1);clipped=true;break;
     }
     if(!clipped)break;
   }
 }
 face(.255,true);face(-.255,false);
 const rings=[[-.255,.93],[-.225,.98],[-.14,1],
              [.14,1],[.225,.98],[.255,.93]];
 for(let j=0;j<rings.length-1;j++){
   const [z,f]=rings[j],[nz,g]=rings[j+1];
   for(let i=0;i<outline.length;i++){
     const k=(i+1)%outline.length,u=outline[i],v=outline[k];
     quad([u[0]*f,u[1]*f,z],[v[0]*f,v[1]*f,z],
       [v[0]*g,v[1]*g,nz],[u[0]*g,u[1]*g,nz]);
   }
 }
 return new Float32Array(a);
}
function leg(){
  // Four tapering weight-bearing rhino legs. A cylinder silhouette avoids
  // the wheel/balloon appearance of four stacked ellipsoid paws.
  const {a,tri,quad}=geometry();
  const sides=32;
  for(let i=0;i<sides;i++){
    const t=TAU*i/sides,q=TAU*(i+1)/sides;
    const v=(rad,y,angle)=>[rad*Math.cos(angle),y,rad*Math.sin(angle)];
    quad(v(.32,-1,t),v(.32,-1,q),v(.46,1,q),v(.46,1,t));
    tri([0,-1,0],v(.32,-1,q),v(.32,-1,t),[0,-1,0]);
    tri([0,1,0],v(.46,1,t),v(.46,1,q),[0,1,0]);
  }
  return new Float32Array(a);
}

/* Anatomically staged one-piece rhino sculpture from a continuous smooth
 * union of volume primitives, meshed with marching tetrahedra.
 * Eliminates the obvious 'balloon wheels' and floating intersecting spheres.
 * Real triangles and interpolated surface normals, no generated raster art.
 */
function rhinoBody(){
 const forms=[
  [[-.22,-.14,0],[1.35,.70,.68]],
  [[.53,.13,0],[.67,.84,.66]],
  [[-1.20,-.09,0],[.51,.61,.57]],
  [[1.20,-.39,0],[.72,.49,.48]],
  [[1.62,-.65,0],[.53,.30,.34]],
  [[1.81,-.79,0],[.20,.15,.28]]
 ];
 // Flat-foot, weight-bearing legs instead of ellipsoid "wheel" hooves.
 const legs=[[-.99,-.43],[.71,-.43],[-.99,.43],[.71,.43]];
 function sdRhinoLeg(p,x,z){
   const h=.44,cy=-.86,dy=p[1]-cy;
   const tapered=.258+.065*clamp((dy+h)/(2*h),0,1);
   const radial=Math.hypot(p[0]-x,p[2]-z)-tapered;
   const cap=Math.abs(dy)-h;
   return Math.min(Math.max(radial,cap),0)+
     Math.hypot(Math.max(radial,0),Math.max(cap,0));
 }
 function sdEllipse(p,center,radius){
   const dx=p[0]-center[0],dy=p[1]-center[1],dz=p[2]-center[2];
   const x=dx/radius[0],y=dy/radius[1],z=dz/radius[2];
   const a=Math.hypot(x,y,z),
     b=Math.hypot(dx/(radius[0]*radius[0]),
       dy/(radius[1]*radius[1]),dz/(radius[2]*radius[2]));
   return b<1e-7 ? -Math.min(...radius) : a*(a-1)/b;
 }
 function combine(a,b,k){
   const h=Math.max(k-Math.abs(a-b),0)/k;
   return Math.min(a,b)-h*h*k*.25;
 }
 function field(p){
   let d=sdEllipse(p,...forms[0]);
   for(let j=1;j<forms.length;j++)
     d=combine(d,sdEllipse(p,...forms[j]),.24);
   for(const [x,z] of legs)d=combine(d,sdRhinoLeg(p,x,z),.19);
   return d;
 }
 const nx=46,ny=30,nz=28;
 const min=[-2.20,-1.55,-1.24],max=[2.20,1.22,1.24];
 const step=[(max[0]-min[0])/nx,(max[1]-min[1])/ny,(max[2]-min[2])/nz];
 const idx=(x,y,z)=>(x*(ny+1)+y)*(nz+1)+z;
 const num=(nx+1)*(ny+1)*(nz+1);
 const scalar=new Float32Array(num),grad=new Float32Array(num*3);
 for(let x=0;x<=nx;x++)for(let y=0;y<=ny;y++)for(let z=0;z<=nz;z++){
   scalar[idx(x,y,z)]=field([
     min[0]+step[0]*x,min[1]+step[1]*y,min[2]+step[2]*z]);
 }
 for(let x=0;x<=nx;x++)for(let y=0;y<=ny;y++)for(let z=0;z<=nz;z++){
   const i=idx(x,y,z),dx=(scalar[idx(Math.min(nx,x+1),y,z)]-
     scalar[idx(Math.max(0,x-1),y,z)])/((x===0||x===nx)?step[0]:2*step[0]);
   const dy=(scalar[idx(x,Math.min(ny,y+1),z)]-
     scalar[idx(x,Math.max(0,y-1),z)])/((y===0||y===ny)?step[1]:2*step[1]);
   const dz=(scalar[idx(x,y,Math.min(nz,z+1))]-
     scalar[idx(x,y,Math.max(0,z-1))])/((z===0||z===nz)?step[2]:2*step[2]);
   const n=Math.hypot(dx,dy,dz)||1;
   grad[i*3]=dx/n;grad[i*3+1]=dy/n;grad[i*3+2]=dz/n;
 }
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],
   [0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],
              [0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const data=[];
 function vertex(a,b){
   const t=clamp(a.d/(a.d-b.d),0,1);
   const p=a.p.map((v,i)=>lerp(v,b.p[i],t));
   const n=a.n.map((v,i)=>lerp(v,b.n[i],t));
   const l=Math.hypot(...n)||1;
   return [...p,...n.map(v=>v/l)];
 }
 function tri(a,b,c){data.push(...a,...b,...c)}
 for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++){
   const c=corners.map(([a,b,d])=>{
     const ix=x+a,iy=y+b,iz=z+d,i=idx(ix,iy,iz);
     return {d:scalar[i],p:[min[0]+ix*step[0],
             min[1]+iy*step[1],min[2]+iz*step[2]],
             n:[grad[i*3],grad[i*3+1],grad[i*3+2]]};
   });
   let insideCount=c.reduce((a,p)=>a+(p.d<0?1:0),0);
   if(insideCount===0||insideCount===8)continue;
   for(const ids of tetra){
     const inside=ids.filter(k=>c[k].d<0),
           outside=ids.filter(k=>c[k].d>=0);
     if(inside.length===1){
       let i=inside[0];
       tri(vertex(c[i],c[outside[0]]),
           vertex(c[i],c[outside[1]]),
           vertex(c[i],c[outside[2]]));
     }else if(inside.length===3){
       let o=outside[0];
       tri(vertex(c[o],c[inside[2]]),
           vertex(c[o],c[inside[1]]),
           vertex(c[o],c[inside[0]]));
     }else if(inside.length===2){
       let a=vertex(c[inside[0]],c[outside[0]]),
           b=vertex(c[inside[0]],c[outside[1]]),
           cc=vertex(c[inside[1]],c[outside[0]]),
           d=vertex(c[inside[1]],c[outside[1]]);
       tri(a,b,cc);tri(b,d,cc);
     }
   }
 }
 return new Float32Array(data);
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
   [sz,sz,sz],[.12*Math.sin(i*1.3),.30*Math.sin(i*2.1),.42*i],
   {kind:'star',phase:i*1.73,spin:.04+(i%4)*.045,
     dir:i%2?1:-1,axial:i%5===0});
 }
 const pink=[.98,.015,.27],dark=[.064,.070,.075],grey=[.11,.12,.13];
 // Upright sculptural balloon rabbit: recognizable arched back, haunch,
 // head, two inflated loop ears, pinched neck and separate tied paws.
 // This is one animated hero, not an array of duplicate pink animals.
 const rabbit=(geo,p,sc,rot=[0,0,0],color=[.98,.015,.27])=>
   add(1,geo,1,color,p,sc,rot,{kind:'rabbit'});
 rabbit('sphere',[-.21,-.20,0],[.69,.88,.55],[0,0,-.18]); // upright body
 rabbit('sphere',[-.46,-.65,.02],[.58,.48,.51]); // round haunch
 rabbit('sphere',[.22,.11,.18],[.47,.52,.43],[0,0,.21]); // chest
 rabbit('sphere',[.20,.62,0],[.30,.32,.36]); // balloon neck
 rabbit('sphere',[.28,.93,0],[.53,.46,.48],[0,0,-.10]); // large head
 rabbit('sphere',[.63,.78,.28],[.26,.20,.25],[0,0,-.12]); // short muzzle
 rabbit('sphere',[-.94,-.59,-.04],[.21,.22,.22]); // tail
 rabbit('ring',[.03,1.88,-.055],[.30,.72,.91],[0,-.06,.13]); // left long ear
 rabbit('ring',[.59,1.83,-.09],[.30,.69,.91],[0,.07,-.12]); // right long ear
 rabbit('sphere',[.12,1.26,-.03],[.15,.14,.20]); // ear pinch left
 rabbit('sphere',[.54,1.23,-.04],[.15,.14,.20]); // ear pinch right
 for(const z of [-.35,.35]){
   rabbit('sphere',[-.44,-1.04,z],[.35,.21,.24],[0,0,-.08]);
   rabbit('sphere',[.38,-.96,z],[.23,.35,.22],[0,0,.22]);
 }
 for(let i=0;i<5;i++){
 add(2,i%2?'ring':'sphere',5,[.076,.086,.099],
 [(-2+i)*1.08,Math.sin(i*1.78)*.79,-1+i*.56],
 i%2?[.48,.73,.63]:[.47,.74,.39],
 [i*.32,i*.24,i*.17],{kind:'support',phase:i*1.1,dir:i%2?1:-1});
 }
 const rhino=(geo,p,sz,r=[0,0,0],color=dark)=>
  add(3,geo,2,color,p,sz,r,{kind:'rhino'});
 // Unified body, head, shoulders, muzzle and four weight-bearing legs.
 // Only horns, ears and a tiny dark eye stay as separate sculpted accents.
 rhino('rhinoBody',[0,0,0],[1,1,1]);
 // Two prominent rhino horns rooted on the nose.
 rhino('cone',[1.57,-.11,.06],[.36,.67,.34],[0,0,-.31],[.27,.29,.30]);
 rhino('cone',[1.19,.27,.055],[.22,.40,.22],[0,0,-.17],[.24,.26,.28]);
 rhino('cone',[.90,.68,.30],[.13,.25,.16],[0,0,-.16]);
 rhino('cone',[.98,.66,-.30],[.13,.25,.16],[0,0,.14]);
 rhino('sphere',[1.43,-.28,.43],[.072,.050,.034],[0,0,-.30],[.33,.36,.38]);
 for(let i=0;i<4;i++)add(4,i%2?'ring':'sphere',4,[.77,.85,.90],
 [(i-1.5)*1.19,i%2?.48:-.41,-1+i*.61],
 i%2?[.66,.95,.78]:[.49,.82,.49],
 [i*.29,i*.19,i*.18],{kind:'support',phase:i*1.7,dir:i%2?-1:1});
 // Three complete, readable helium-foil glyph solids. Their
 // independently changing yaw/position never separates a letter's strokes.
 const foil=(letter,geo,p,sc)=>
   add(5,geo,3,[.91,.94,.98],p,sc,[0,0,0],
     {kind:'foil',letter,phase:letter*1.5});
 foil(0,'foilZ',[-2.05,0,0],[1.05,1.07,1]);
 foil(1,'foilI',[-.08,0,0],[.84,1.05,1]);
 foil(2,'ring',[1.83,0,0],[.90,.97,1.50]);
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
  for(let [name,data] of Object.entries({sphere:sphere(),star:star(),ring:torus(),cone:cone(),leg:leg(),rhinoBody:rhinoBody(),foilZ:foilGlyph('Z'),foilI:foilGlyph('I')})){
    const vao=gl.createVertexArray(),buffer=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    this.meshes[name]={vao,buffer,count:data.length/6};
  }
  this.bgVao=gl.createVertexArray();
  this.u={};for(let n of ['uModel','uVP','uBase','uEye','uMouse','uType','uAlpha','uTime','uSeed'])
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
  const p=[...o.p],sc=[...o.sc],rot=[...o.rot];
  const phase=o.phase||o.seed,x=this.pointer[0],y=this.pointer[1];
  if(o.kind==='star'){
   // 3D star field: each sculpture has its own position, rotation and drift.
   p[0]+=Math.sin(t*.19+phase)*.22*o.dir;
   p[1]+=Math.cos(t*.27+phase)*.18;
   p[2]+=Math.sin(t*.31+phase)*.41;
   // Most stars remain front-facing; a few rotate through real XYZ angles.
   rot[1]+=(o.axial?t*.18*o.dir:Math.sin(t*.26+phase)*.32);
   rot[0]+=Math.sin(t*.32+phase)*.18;
   rot[2]+=t*o.spin*o.dir;
   if(mobile){p[0]*=.52;p[1]*=.66;}
  }else if(o.kind==='rabbit'){
   // Orbit the connected balloon assembly around one common origin.
   // Three-quarter, forward-biased hero pose. Keep the ears and muzzle
   // facing the camera instead of showing only a narrow side profile.
   const yaw=-.47+Math.sin(t*.34)*.105;
   const xx=p[0],zz=p[2];
   p[0]=xx*Math.cos(yaw)+zz*Math.sin(yaw);
   p[2]=zz*Math.cos(yaw)-xx*Math.sin(yaw);
   p[1]+=Math.sin(t*.61)*.14;
   p[2]+=Math.sin(t*.38)*.38; // gently approach / recede
   rot[1]+=yaw;rot[2]+=Math.sin(t*.19)*.036;
   if(mobile){
     // Tall silhouettes are slightly compressed behind the phone wordmark.
     // Fit the upright rabbit largely within the upper phone word,
     // rather than putting the head in KILE and its feet in JONES.
     // Use both stacked lines for a large moving inflatable subject.
     // A reduced field of view in the previous pass hid the hero almost
     // entirely behind a single 'L' stroke on phones.
     p[0]*=.78;p[1]*=.76;sc[0]*=.78;sc[1]*=.76;sc[2]*=.74;
     p[1]+=.26;p[0]-=.18;
   }else{
     // The ears penetrate the upper word and the inflated haunch reaches
     // toward the lower word; pointer reveal exposes the full silhouette.
     // Front-biased portrait sits behind the upper KILE letters:
     // ears/head/body can share one continuous viewing aperture.
     p[0]*=1.23;p[1]*=.92;sc[0]*=1.23;sc[1]*=.92;
     p[1]+=.43;p[0]-=.43;
   }
  }else if(o.kind==='rhino'){
   // Rhino: look toward camera in a restrained 3/4 profile, leaving
   // both horns and the full weight-bearing body readable.
   const yaw=-.51+Math.sin(t*.25)*.095;
   const xx=p[0],zz=p[2];
   p[0]=xx*Math.cos(yaw)+zz*Math.sin(yaw);
   p[2]=zz*Math.cos(yaw)-xx*Math.sin(yaw);
   p[0]+=Math.sin(t*.19)*.055;
   p[2]+=Math.sin(t*.18)*.22; // much heavier and slower
   rot[1]+=yaw;
   if(mobile){
     p[0]*=.53;p[1]*=.50;sc[0]*=.53;sc[1]*=.50;sc[2]*=.62;
     p[1]+=.58;p[0]-=.22;
   }else{
     p[0]*=1.27;p[1]*=.78;sc[0]*=1.27;sc[1]*=.78;
     p[1]+=.94;p[0]-=.53;
   }
  }else if(o.kind==='foil'){
   // Separate letter actors, with each welded set of inflated strokes
   // rotating together around its letter's center (not individually).
   const k=o.letter,cx=[-2.03,-.06,1.78][k];
   // "ZIO" must always face forward. A slight per-letter 3D turn
   // maintains material reflection without letting glyphs disappear.
   const yaw=Math.sin(t*(.29+k*.07)+k*.68)*.11;
   const dx=p[0]-cx,dz=p[2];
   p[0]=cx+dx*Math.cos(yaw)+dz*Math.sin(yaw);
   p[2]=dz*Math.cos(yaw)-dx*Math.sin(yaw);
   p[1]+=Math.sin(t*(.37+k*.07)+k*1.50)*.13;
   p[2]+=Math.sin(t*(.24+k*.09)+k*2.30)*.28;
   // O should never disappear edge-on while the word ZIO is displayed.
   // A restrained wobble in XYZ preserves readable lettering; other stars
   // carry the full slow axial spins of the surrounding sequence.
   rot[1]+=yaw+(k===2?Math.sin(t*.17)*.065:0);
   rot[0]+=(k===2?Math.sin(t*.28)*.095:0);
   rot[2]+=Math.sin(t*(.19+k*.06)+k)*.07;
   if(mobile){
     p[0]*=.43;p[1]*=.34;sc[0]*=.43;sc[1]*=.34;sc[2]*=.65;
     p[1]+=.44;
   }else{
     p[0]*=1.18;p[1]*=.72;sc[0]*=1.18;sc[1]*=.72;
     p[1]+=1.44;p[0]-=.29;
   }
  }else{
   p[1]+=Math.sin(t*.24+phase)*.20;p[2]+=Math.cos(t*.21+phase)*.28;
   rot[0]+=t*.045;rot[1]+=t*.05*o.dir;
   if(mobile){p[0]*=.55;p[1]*=.55;}
  }
  const perspective=1+p[2]*.068;
  p[0]-=x*.62*perspective;p[1]+=y*.39*perspective;
  rot[1]-=x*.075*perspective;rot[0]+=y*.055*perspective;
  p[0]+=Math.sin(t*.11+scene)*.035;
  return model(p,sc,rot);
 }
 drawScene(index,t,alpha,mobile){
  if(alpha<.005)return;
  const gl=this.gl;
  gl.useProgram(this.program);
  gl.uniformMatrix4fv(this.u.uVP,false,this.vp);
  gl.uniform3f(this.u.uEye,0,0,12);
  gl.uniform2f(this.u.uMouse,this.pointer[0],this.pointer[1]);
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
   const p=options.pointer||{},a=1-Math.exp(-clamp(options.dt||.016,.001,.05)*16);
   this.pointer[0]=lerp(this.pointer[0],p.active?p.nx:0,a);
   this.pointer[1]=lerp(this.pointer[1],p.active?p.ny:0,a);
   const aspect=this.width/this.height,mobile=aspect<.76;
   this.vp=perspective(aspect);
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
   camera:'true perspective, 30.3deg FOV',
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