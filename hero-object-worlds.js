
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
uniform float uType,uAlpha,uTime,uSeed,uScene,uEnergy,uQuality;

float sat(float x){return clamp(x,0.0,1.0);}
float hash31(vec3 p){
 p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
 return fract((p.x+p.y)*p.z);
}
float grain(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
                mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
                mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec3 sceneBase(float scene,vec3 original){
 if(uQuality<1.5)return original;
 if(scene<.5)return mix(original,vec3(.018,.055,.20),.38);
 if(scene<1.5)return vec3(1.0,.018,.30);
 if(scene<2.5)return vec3(1.0,.20,.008);
 if(scene<3.5)return vec3(.020,.022,.025);
 if(scene<4.5)return vec3(.010,.70,.62);
 return vec3(.76,.80,.86);
}
void main(){
 vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);
 float micro=grain(vLocal*vec3(7.0,9.0,6.0)+uSeed*3.7);
 float fine=grain(vLocal*vec3(25.0,29.0,23.0)+uSeed*8.3);
 float wrinkle=sin(vLocal.x*21.+vLocal.z*47.+uSeed*7.)*
               sin(vLocal.y*33.-vLocal.x*14.+uTime*.10);

 // Real surface breakup is encoded in the normal rather than painted on.
 if(uQuality>1.5){
   if(uType>2.5&&uType<3.5){
     vec3 bend=vec3(
       sin(vLocal.y*31.+vLocal.z*17.+uSeed*4.),
       cos(vLocal.x*37.-vLocal.z*22.+uSeed*5.),
       sin((vLocal.x+vLocal.y)*43.+uSeed*6.));
     n=normalize(n+bend*(.055+.025*fine));
   }else if(uType>1.5&&uType<2.5){
     n=normalize(n+vec3(micro-.5,fine-.5,0.)*.018);
   }else if(uType>.5&&uType<1.5){
     n=normalize(n+vec3(fine-.5,micro-.5,0.)*.011);
   }
 }else if(uType>2.5&&uType<3.5){
   n=normalize(n+vec3(sin(vLocal.y*31.),cos(vLocal.x*37.),0.)*.025);
 }

 // Three large photographic softboxes plus a dim floor bounce.
 vec3 lKey=normalize(vec3(-.72+uMouse.x*.18,.92-uMouse.y*.12,1.15));
 vec3 lFill=normalize(vec3(.94-uMouse.x*.12,.30+uMouse.y*.10,.72));
 vec3 lTop=normalize(vec3(.12,.98,.28));
 vec3 lFloor=normalize(vec3(-.18,-.82,.62));
 float ndk=max(dot(n,lKey),0.),ndf=max(dot(n,lFill),0.);
 float ndt=max(dot(n,lTop),0.),ndb=max(dot(n,lFloor),0.);

 float rough=.36;
 if(uType<.5)rough=.20;
 else if(uType<1.5)rough=.13;
 else if(uType<2.5)rough=.82;
 else if(uType<3.5)rough=.24;
 else if(uType<4.5)rough=.42;
 else rough=.58;
 if(uQuality>1.5 && uScene>2.5&&uScene<3.5)rough=max(rough,.88);

 float exponent=mix(145.0,10.0,rough);
 vec3 hk=normalize(lKey+v),hf=normalize(lFill+v),ht=normalize(lTop+v);
 float sk=pow(max(dot(n,hk),0.),exponent);
 float sf=pow(max(dot(n,hf),0.),max(7.0,exponent*.55));
 float st=pow(max(dot(n,ht),0.),max(5.0,exponent*.34));
 float fres=pow(1.-max(dot(n,v),0.),mix(5.0,2.2,rough));
 float diffuse=.12+.54*ndk+.24*ndf+.12*ndt+.07*ndb;

 vec3 base=sceneBase(uScene,uBase);
 vec3 col=base*diffuse;

 if(uType<.5){
   // Midnight enamel: hard highlights and blue-black depth.
   col+=vec3(.38,.66,1.0)*(sk*1.65+sf*.46+fres*.52);
   col+=vec3(.015,.045,.14)*(micro*.16);
 }else if(uType<1.5){
   // Inflated latex: broad white softbox streaks over saturated pigment.
   col=base*(.22+diffuse*.88);
   col+=vec3(1.,.91,.95)*(sk*2.5+sf*.72+st*.28);
   col+=base*fres*.24;
   col*=mix(.94,1.055,micro);
 }else if(uType<2.5){
   // Matte graphite / plaster: nearly no specular, strong grazing edge.
   col=base*(.26+diffuse*.77);
   col+=vec3(.34,.39,.46)*(fres*.30+sf*.055);
   col*=mix(.82,1.04,micro*.72+fine*.28);
 }else if(uType<3.5){
   // Crinkled helium foil: alternating cool/warm panels and sharp broken glints.
   float panel=sat(.5+.5*wrinkle);
   vec3 foil=mix(vec3(.18,.22,.29),vec3(.96,.98,1.0),panel*.72+.16);
   vec3 warm=vec3(1.0,.78,.55)*pow(max(dot(n,normalize(vec3(-.76,.26,.58))),0.),9.);
   col=foil*(.18+diffuse*.75);
   col+=vec3(1.)*(sk*2.25+sf*1.18+st*.46)+warm*.28+vec3(.38,.50,.72)*fres*.56;
   col*=mix(.84,1.10,fine);
 }else if(uType<4.5){
   // Frosted pearl/glass: milky center, cool edge transmission illusion.
   vec3 ice=uQuality>1.5&&uScene>3.5&&uScene<4.5?vec3(.08,.92,.80):base;
   col=ice*(.16+diffuse*.52);
   col+=vec3(.82,.98,1.)*(fres*.76+sf*.25+st*.15);
   col=mix(col,vec3(.78,.95,.96),(.18+.22*micro)*(1.-max(dot(n,v),0.)));
 }else{
   // Dark supporting forms: satin, not plastic.
   col=base*(.25+diffuse*.68)+vec3(.23,.28,.36)*(fres*.28+sf*.10);
 }

 // Pointer energy changes the light, not the geometry, giving a tactile
 // highlight sweep without making materials look rubbery.
 if(uQuality>1.5)col+=vec3(1.)*sk*uEnergy*(uQuality>2.5?.055:.10);
 if(uQuality>2.5){
   // Filmic highlight shoulder: preserve texture without digital clipping.
   col=col/(vec3(.18)+col);
   col=mix(col,vec3(dot(col,vec3(.2126,.7152,.0722))),.025);
 }
 col=pow(clamp(col/(col+vec3(.68)),0.,1.),vec3(.82));
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
uniform float uScene,uNext,uMix,uTime,uSpeed,uQuality;
uniform vec2 uMouse;
float h(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+34.21);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
vec3 palette(float scene,float oil){
 if(scene<.5)return mix(vec3(.003,.010,.028),vec3(.025,.11,.42),oil*.62);
 if(scene<1.5)return mix(vec3(.48,.002,.09),vec3(1.,.016,.39),.22+.78*oil);
 if(scene<2.5)return mix(vec3(.55,.026,0.),vec3(1.,.34,.0),.18+.82*oil);
 if(scene<3.5)return mix(vec3(.001),vec3(.026,.029,.033),oil*.25);
 if(scene<4.5)return mix(vec3(0.,.18,.16),vec3(0.,.92,.72),.18+.82*oil);
 return mix(vec3(.14,.17,.22),vec3(.91,.95,1.),.15+.85*oil);
}
vec3 studio(float scene,vec2 p,float oil,float noiseField){
 vec3 c=palette(scene,oil);
 float horizon=smoothstep(.02,.98,1.-p.y);
 float key=exp(-pow(abs(p.x-.27-uMouse.x*.025)*3.1,4.0)-pow(abs(p.y-.35+uMouse.y*.018)*5.0,4.0));
 float fill=exp(-pow(abs(p.x-.78)*4.6,4.0)-pow(abs(p.y-.62)*6.2,4.0));
 float vignette=1.-smoothstep(.42,.82,length((p-.5)*vec2(1.0,.82)));
 float texture=(noiseField-.5)*.055;
 if(scene<.5){
   c*=.78+.24*horizon+.15*key+.05*vignette+texture;
 }else if(scene<1.5){
   c*=.80+.18*horizon+.22*key+.07*fill+texture;
 }else if(scene<2.5){
   c*=.82+.15*horizon+.20*key+.08*fill+texture;
 }else if(scene<3.5){
   c*=.72+.16*horizon+.10*key+.05*fill+texture*.42;
 }else if(scene<4.5){
   c*=.78+.18*horizon+.18*key+.09*fill+texture*.75;
   c+=vec3(.03,.10,.09)*vignette*.18;
 }else{
   float panel=.5+.5*sin((p.x*.72+p.y*.41)*19.+noiseField*2.4);
   c*=.72+.18*horizon+.18*key+.10*fill;
   c+=vec3(.30,.35,.44)*panel*.12+vec3(1.)*key*.13;
 }
 return c;
}
void main(){
 vec2 mouse=uMouse*.5+.5;
 float d=length((uv-mouse)*vec2(1.15,1.0));
 float a=n(uv*3.0+vec2(uTime*.028,-uTime*.021));
 float b=n(uv.yx*5.2-vec2(uTime*.018,uTime*.034));
 float wake=exp(-d*d*(5.5+uSpeed*5.0));
 float cadence=uQuality>2.5?6.65:8.2;
 float timeRate=uQuality>2.5?.072:.12;
 float oil=.5+.5*sin((uv.x*.72+uv.y*.48+a*.17-b*.11)*cadence+uTime*timeRate+wake*1.8);
 oil=clamp(oil+wake*uSpeed*(uQuality>2.5?.115:.18),0.,1.);
 vec3 c0=uQuality>1.5?studio(uScene,uv,oil,a):palette(uScene,oil);
 vec3 c1=uQuality>1.5?studio(uNext,uv,1.-oil*.70,b):palette(uNext,1.-oil*.76);
 float transition=smoothstep(0.,1.,uMix);
 vec3 c=mix(c0,c1,transition);
 color=vec4(c,1.0);
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
  this.host=host;this.run=Number(new URLSearchParams(location.search).get('try'))||1;
  this.canvas=document.createElement('canvas');
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
  // Production is now the full sculptural world. "?simple=1" remains a
  // diagnostic escape hatch for constrained devices.
  this.modelsVisible=window.__KBJ_PREVIEW_MODELS!==false &&
    new URLSearchParams(location.search).get('simple')!=='1';
  this.program=this.modelsVisible?program(vert,frag):null;
  this.bgProgram=program(bgV,bgF);
  this.meshes={};
  if(this.modelsVisible)for(let [name,data] of Object.entries({sphere:sphere(),star:star(),ring:torus(),cone:cone(),leg:leg(),rhinoBody:rhinoBody(),foilZ:foilGlyph('Z'),foilI:foilGlyph('I')})){
    const vao=gl.createVertexArray(),buffer=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    this.meshes[name]={vao,buffer,count:data.length/6};
  }
  this.bgVao=gl.createVertexArray();
  this.u={};
  if(this.modelsVisible)for(let n of ['uModel','uVP','uBase','uEye','uMouse','uType','uAlpha','uTime','uSeed','uScene','uEnergy','uQuality'])
    this.u[n]=gl.getUniformLocation(this.program,n);
  this.bu={};for(let n of ['uScene','uNext','uMix','uTime','uMouse','uSpeed','uQuality'])
    this.bu[n]=gl.getUniformLocation(this.bgProgram,n);
  this.items=objects();this.pointer=[0,0];this.pointerVel=[0,0];
  this.pointerSlow=[0,0];this.pointerSlowVel=[0,0];
  this.pointerMotion=[0,0];
  this.pointerEnergy=0;this.parallaxGain=1;this.frames=0;
  // Original model definitions remain for later, but are not allocated.
  this.ready=true;this.fault=null;this.width=0;this.height=0;
  this.canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();this.ready=false;this.fault='context lost';
    this.canvas.style.display='none';
  });
 }
 resize(){
  // clientWidth/Height are intentionally used instead of transformed bounds:
  // the physical entrance can squash/translate the hero without reallocating
  // WebGL buffers every animation frame.
  const cw=this.host.clientWidth||innerWidth,ch=this.host.clientHeight||innerHeight;
  const cap=this.run>=9?(cw<700?1.08:1.18):(cw<700?1:1.12);
  const dpr=Math.min(window.devicePixelRatio||1,cap);
  const w=Math.round(cw*dpr),h=Math.round(ch*dpr);
  if(!w||!h)return false;
  if(this.width!==w||this.height!==h){
   this.canvas.width=this.width=w;this.canvas.height=this.height=h;
  }return true;
 }
 matrix(o,t,mobile,scene){
  const p=[...o.p],sc=[...o.sc],rot=[...o.rot];
  const phase=o.phase||o.seed,x=this.pointer[0],y=this.pointer[1];
  const finalQuality=this.materialQuality>2.5;
  const mt=finalQuality?(t*.78+phase*.091):t;
  if(o.kind==='star'){
   // 3D star field: each sculpture has its own position, rotation and drift.
   p[0]+=Math.sin(mt*.19+phase)*.22*o.dir;
   p[1]+=Math.cos(mt*.27+phase)*.18;
   p[2]+=Math.sin(mt*.31+phase)*.41;
   // Most stars remain front-facing; a few rotate through real XYZ angles.
   rot[1]+=(o.axial?mt*.18*o.dir:Math.sin(mt*.26+phase)*.32);
   rot[0]+=Math.sin(mt*.32+phase)*.18;
   rot[2]+=mt*o.spin*o.dir;
   if(mobile){p[0]*=.52;p[1]*=.66;}
  }else if(o.kind==='rabbit'){
   // Orbit the connected balloon assembly around one common origin.
   // Three-quarter, forward-biased hero pose. Keep the ears and muzzle
   // facing the camera instead of showing only a narrow side profile.
   const yaw=-.47+Math.sin(mt*.34)*.105;
   const xx=p[0],zz=p[2];
   p[0]=xx*Math.cos(yaw)+zz*Math.sin(yaw);
   p[2]=zz*Math.cos(yaw)-xx*Math.sin(yaw);
   p[1]+=Math.sin(mt*.61)*.14;
   p[2]+=Math.sin(mt*.38)*.38; // gently approach / recede
   rot[1]+=yaw;rot[2]+=Math.sin(mt*.19)*.036;
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
   const yaw=-.51+Math.sin(mt*.25)*.095;
   const xx=p[0],zz=p[2];
   p[0]=xx*Math.cos(yaw)+zz*Math.sin(yaw);
   p[2]=zz*Math.cos(yaw)-xx*Math.sin(yaw);
   p[0]+=Math.sin(mt*.19)*.055;
   p[2]+=Math.sin(mt*.18)*.22; // much heavier and slower
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
   const yaw=Math.sin(mt*(.29+k*.07)+k*.68)*.11;
   const dx=p[0]-cx,dz=p[2];
   p[0]=cx+dx*Math.cos(yaw)+dz*Math.sin(yaw);
   p[2]=dz*Math.cos(yaw)-dx*Math.sin(yaw);
   p[1]+=Math.sin(mt*(.37+k*.07)+k*1.50)*.13;
   p[2]+=Math.sin(mt*(.24+k*.09)+k*2.30)*.28;
   // O should never disappear edge-on while the word ZIO is displayed.
   // A restrained wobble in XYZ preserves readable lettering; other stars
   // carry the full slow axial spins of the surrounding sequence.
   rot[1]+=yaw+(k===2?Math.sin(mt*.17)*.065:0);
   rot[0]+=(k===2?Math.sin(mt*.28)*.095:0);
   rot[2]+=Math.sin(mt*(.19+k*.06)+k)*.07;
   if(mobile){
     p[0]*=.43;p[1]*=.34;sc[0]*=.43;sc[1]*=.34;sc[2]*=.65;
     p[1]+=.44;
   }else{
     p[0]*=1.18;p[1]*=.72;sc[0]*=1.18;sc[1]*=.72;
     p[1]+=1.44;p[0]-=.29;
   }
  }else{
   p[1]+=Math.sin(mt*.24+phase)*.20;p[2]+=Math.cos(mt*.21+phase)*.28;
   rot[0]+=mt*.045;rot[1]+=mt*.05*o.dir;
   if(mobile){p[0]*=.55;p[1]*=.55;}
  }
  // Increase object size without separating the head, horns, paws or
  // the three 3D letters. Scale group positions around the staged center.
  const groups={
    rabbit: mobile?[-.18,.26,1.16]:[-.43,.43,1.20],
    rhino:mobile?[-.22,.58,1.15]:[-.53,.94,1.18],
    foil:mobile?[0,.44,1.12]:[-.29,1.44,1.14]
  };
  const group=groups[o.kind];
  if(group){
    const [cx,cy,k]=group;
    p[0]=cx+(p[0]-cx)*k;
    p[1]=cy+(p[1]-cy)*k;
    sc[0]*=k;sc[1]*=k;sc[2]*=k;
  }else if(o.kind==='star'){
    sc[0]*=1.12;sc[1]*=1.12;sc[2]*=1.12;
  }
  if(this.materialQuality>2.5 && mobile){
    // Run 9 phone framing: fill the glyph apertures with fewer, larger readable
    // surfaces instead of shrinking the desktop composition into the phone.
    if(scene===0){sc[0]*=1.08;sc[1]*=1.08;sc[2]*=1.08;}
    if(scene===1){sc[0]*=1.07;sc[1]*=1.07;sc[2]*=1.05;p[1]-=.03;}
    if(scene===2){sc[0]*=1.12;sc[1]*=1.12;sc[2]*=1.08;}
    if(scene===3){sc[0]*=1.10;sc[1]*=1.10;sc[2]*=1.06;}
    if(scene===4){sc[0]*=1.09;sc[1]*=1.09;sc[2]*=1.06;}
    if(scene===5){sc[0]*=1.11;sc[1]*=1.11;sc[2]*=1.08;}
  }

  if(this.materialQuality>1.5){
    // Run 8 scene staging: each material world has a different photographic
    // composition instead of reusing identical object scale and spacing.
    if(scene===0){
      // Midnight enamel: wider field with small points at several depths.
      p[0]*=1.04;p[1]*=.96;
      sc[0]*=.96;sc[1]*=.96;sc[2]*=.96;
    }else if(scene===1){
      // Latex hero: one larger, closer sculptural subject.
      p[0]*=.90;p[1]*=.93;p[2]+=.26;
      sc[0]*=1.08;sc[1]*=1.08;sc[2]*=1.08;
    }else if(scene===2){
      // Orange satin: crop large abstract forms through the letters.
      p[0]*=.76;p[1]*=.78;p[2]+=.42;
      sc[0]*=1.24;sc[1]*=1.24;sc[2]*=1.18;
      rot[0]*=.55;rot[1]*=.55;
    }else if(scene===3){
      // Matte black: almost still, heavy and close, like a studio sculpture.
      p[0]*=.92;p[1]*=.94;p[2]+=.18;
      sc[0]*=1.08;sc[1]*=1.08;sc[2]*=1.08;
      rot[0]*=.58;rot[1]*=.62;rot[2]*=.62;
    }else if(scene===4){
      // Frosted teal: open spacing and slower floating forms.
      p[0]*=1.08;p[1]*=.91;p[2]-=.10;
      sc[0]*=1.04;sc[1]*=1.04;sc[2]*=1.04;
    }else if(scene===5){
      // Foil: slightly oversized close-up glyph volumes so crinkles read.
      p[0]*=.91;p[1]*=.90;p[2]+=.34;
      sc[0]*=1.16;sc[1]*=1.16;sc[2]*=1.12;
      rot[0]*=.60;rot[1]*=.64;
    }
  }

  const perspective=1+p[2]*.068,gain=this.parallaxGain||1;
  if(this.interactionMode>=7){
    // Run 7: each object samples a different point between the slow and fast
    // camera states according to depth. This creates layered parallax rather
    // than moving the whole world as one flat slab.
    const depth=clamp(.58+(p[2]+1.45)*.17,.34,1.34);
    const blend=clamp(.18+depth*.63,.22,.95);
    const lx=lerp(this.pointerSlow[0],x,blend);
    const ly=lerp(this.pointerSlow[1],y,blend);
    const mvx=this.pointerMotion[0],mvy=this.pointerMotion[1];
    p[0]-=lx*.57*perspective*gain*depth;
    p[1]+=ly*.39*perspective*gain*depth;
    p[0]-=mvx*.085*depth;
    p[1]+=mvy*.058*depth;
    p[2]+=this.pointerEnergy*.52*Math.sin(phase+mt*.28)*depth;
    rot[1]-=(lx*.046+mvx*.020)*perspective*gain*depth;
    rot[0]+=(ly*.034+mvy*.014)*perspective*gain*depth;
  }else{
    const focus=this.interactionMode>=6?1.0:(this.interactionMode===5?.82:1.0);
    const px=this.interactionMode>=5?.50:.88;
    const py=this.interactionMode>=5?.34:.58;
    const pz=this.interactionMode>=6?.78:(this.interactionMode===5?.46:.56);
    p[0]-=x*px*perspective*gain*focus;p[1]+=y*py*perspective*gain*focus;
    p[2]+=this.pointerEnergy*pz*Math.sin(phase+mt*.31);
    rot[1]-=x*(this.interactionMode>=5?.052:.082)*perspective*gain;
    rot[0]+=y*(this.interactionMode>=5?.038:.058)*perspective*gain;
  }
  p[0]+=Math.sin(mt*.11+scene)*.035;
  if(finalQuality){
    p[0]+=Math.sin(mt*.071+phase*1.73)*.018;
    p[1]+=Math.cos(mt*.093+phase*.89)*.014;
    p[2]+=Math.sin(mt*.057+phase*2.11)*.024;
    rot[2]+=Math.sin(mt*.049+phase*1.37)*.008;
  }
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
  gl.uniform1f(this.u.uScene,index);
  gl.uniform1f(this.u.uEnergy,this.pointerEnergy||0);
  gl.uniform1f(this.u.uQuality,this.materialQuality||0);
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
   const gl=this.gl,t=options.now*.001*.62;
   const p=options.pointer||{},dt=clamp(options.dt||.016,.001,.05);
   this.parallaxGain=options.parallaxGain||1;
   this.interactionMode=options.heroTry||1;
   this.oilGain=options.oilGain||1;
   this.materialQuality=options.materialQuality||0;
   const tx=p.active?p.nx:Math.sin(t*.12)*.045;
   const ty=p.active?p.ny:Math.cos(t*.10)*.035;
   const stiffness=(this.interactionMode>=7?34:this.interactionMode>=6?40:this.interactionMode===5?27:31)*this.parallaxGain;
   const damping=this.interactionMode>=7?10.8:this.interactionMode>=6?6.2:this.interactionMode===5?9.6:7.1;
   for(let i=0;i<2;i++){
     const target=i?ty:tx;
     const legacyImpulse=(i?(p.vy||0):(p.vx||0))*
       (this.interactionMode>=6?0.00245:this.interactionMode===5?0.00135:0.00165)*
       this.parallaxGain;
     const normalizedImpulse=(i?(p.nvy||0):(p.nvx||0))*.026*this.parallaxGain;
     const impulse=this.interactionMode>=7?normalizedImpulse:legacyImpulse;
     this.pointerVel[i]+=((target-this.pointer[i])*stiffness-this.pointerVel[i]*damping)*dt+impulse;
     this.pointer[i]+=this.pointerVel[i]*dt;

     if(this.interactionMode>=7){
       const slowK=8.8*this.parallaxGain,slowD=6.4;
       this.pointerSlowVel[i]+=((target-this.pointerSlow[i])*slowK-this.pointerSlowVel[i]*slowD)*dt;
       this.pointerSlow[i]+=this.pointerSlowVel[i]*dt;
       const motionTarget=i?(p.nvy||0):(p.nvx||0);
       const release=this.interactionMode>=9?1.65:3.2;
       this.pointerMotion[i]=lerp(this.pointerMotion[i],motionTarget,
         1-Math.exp(-dt*(Math.abs(motionTarget)>Math.abs(this.pointerMotion[i])?15:release)));
     }
   }
   const speedSource=this.interactionMode>=7?(p.speedN||0):(p.speed||0);
   const targetEnergy=p.active?Math.min(1.85,speedSource*1.06*this.oilGain):0;
   const energyRelease=this.interactionMode>=9?1.45:(this.interactionMode>=7?2.4:1.55);
   this.pointerEnergy=lerp(this.pointerEnergy,targetEnergy,
     1-Math.exp(-dt*(targetEnergy>this.pointerEnergy?(this.interactionMode>=7?14:11):energyRelease)));
   const aspect=this.width/this.height,mobile=aspect<.76;
   this.vp=perspective(aspect);
   const scene=options.mode%6,next=options.nextMode%6,mix=clamp(options.mix||0,0,1);
   gl.viewport(0,0,this.width,this.height);
   gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
   gl.bindVertexArray(this.bgVao);
   gl.useProgram(this.bgProgram);
   gl.uniform1f(this.bu.uScene,scene);gl.uniform1f(this.bu.uNext,next);
   gl.uniform1f(this.bu.uMix,mix);gl.uniform1f(this.bu.uTime,t);
   gl.uniform2f(this.bu.uMouse,this.pointer[0],this.pointer[1]);
   gl.uniform1f(this.bu.uSpeed,this.pointerEnergy);
   gl.uniform1f(this.bu.uQuality,this.materialQuality||0);
   gl.drawArrays(gl.TRIANGLES,0,3);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
   gl.disable(gl.BLEND);
   if(this.modelsVisible){
     if(this.materialQuality>1.5 && mix>.005){
       // Run 8 choreography: the incoming world arrives before the outgoing
       // world disappears, with a brief editorial overlap rather than a
       // synthetic opacity dissolve.
       const finalQ=this.materialQuality>2.5;
       const incoming=ease(clamp(mix*(finalQ?1.52:1.38),0,1));
       const outgoing=1.-ease(clamp((mix-(finalQ?.24:.30))/(finalQ?.64:.70),0,1));
       this.drawScene(scene,t,outgoing,mobile);
       gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.BLEND);
       gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
       this.drawScene(next,t+.18,incoming,mobile);gl.disable(gl.BLEND);
     }else{
       this.drawScene(scene,t,1,mobile);
       if(mix>.005){
         gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.BLEND);
         gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
         this.drawScene(next,t,mix,mobile);gl.disable(gl.BLEND);
       }
     }
   }
   if((this.frames<3||this.frames%120===0) && gl.getError()!==gl.NO_ERROR)
     throw Error('3D draw failed');
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
   canvas:[this.width,this.height],modelsVisible:this.modelsVisible,
   visualMode:this.modelsVisible?'full interactive material world':'simplified pigment loop',
   pointer:[+this.pointer[0].toFixed(3),+this.pointer[1].toFixed(3)],
   pointerEnergy:+this.pointerEnergy.toFixed(3),
   pointerSlow:[+this.pointerSlow[0].toFixed(3),+this.pointerSlow[1].toFixed(3)],
   pointerMotion:[+this.pointerMotion[0].toFixed(3),+this.pointerMotion[1].toFixed(3)],
   interactionMode:this.interactionMode||1,
   parallaxGain:+(this.parallaxGain||1).toFixed(2),
   oilGain:+(this.oilGain||1).toFixed(2),
   materialQuality:this.materialQuality||0,
   fault:this.fault};
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