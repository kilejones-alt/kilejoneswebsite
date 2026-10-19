/* Kile B. Jones — cursor-driven GPU fluid wordmark material.
   Low-resolution ping-pong fluid velocity+dye texture, rendered through
   reflective blue/silver surfaces inside the separate high-resolution text mask.
   Progressive fallback remains in script.js if WebGL2 is not available. */
(() => {
  'use strict';
  const canvas = document.createElement('canvas');
  let gl;
  try { gl = canvas.getContext('webgl2', {
    alpha:true, antialias:false, depth:false, stencil:false,
    preserveDrawingBuffer:true, powerPreference:'high-performance'
  }); } catch (_) {}
  if (!gl) return;
  const vertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  vUv=p;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
  const fluidShader = `#version 300 es
precision highp float;
uniform sampler2D oldState;
uniform vec2 point;
uniform vec2 motion;
uniform float injecting;
uniform float aspect;
uniform vec2 resolution;
in vec2 vUv;
out vec4 result;
void main() {
  vec2 uv=gl_FragCoord.xy/resolution;
  vec4 curr=texture(oldState,uv);
  vec2 velocity=(curr.rg-.5)*2.0;
  vec2 origin=clamp(uv-velocity*.026,vec2(.001),vec2(.999));
  vec4 advected=texture(oldState,origin);
  vec2 advVel=(advected.rg-.5)*2.0;
  float dye=advected.b*.988;
  vec2 diff=(uv-point)*vec2(aspect,1.0);
  float radius=exp(-dot(diff,diff)*49.0);
  vec2 swirl=vec2(-diff.y,diff.x)*radius*.26;
  // Neighbor curl feeds a small rotational force back into the fluid field.
  vec2 stepUV=1.0/resolution;
  vec2 vR=(texture(oldState,uv+vec2(stepUV.x,0.0)).rg-.5)*2.0;
  vec2 vL=(texture(oldState,uv-vec2(stepUV.x,0.0)).rg-.5)*2.0;
  vec2 vT=(texture(oldState,uv+vec2(0.0,stepUV.y)).rg-.5)*2.0;
  vec2 vB=(texture(oldState,uv-vec2(0.0,stepUV.y)).rg-.5)*2.0;
  float curl=(vR.y-vL.y)-(vT.x-vB.x);
  vec2 confinement=vec2(-advVel.y,advVel.x)*clamp(curl,-.2,.2)*.048;
  velocity=clamp((advVel*.973)+swirl+confinement+motion*radius*injecting*5.7,vec2(-.9),vec2(.9));
  dye=min(1.0,max(dye,radius*injecting)+radius*injecting*.24);
  result=vec4(velocity*.5+.5,dye,1.0);
}`;
  const surfaceShader = `#version 300 es
precision highp float;
uniform sampler2D fluidField;
uniform vec2 resolution;
uniform vec2 cursor;
uniform float time;
uniform float material;
in vec2 vUv;
out vec4 color;
float sat(float x){return clamp(x,0.0,1.0);}
float ribbon(float a,float b,float c) {
  return pow(max(0.0,cos(a+b*sin(c))),18.0);
}
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;
  vec4 flow=texture(fluidField,uv);
  vec2 velocity=(flow.rg-.5)*2.0;
  float dye=flow.b;
  vec2 p=(gl_FragCoord.xy-resolution*.5)/max(resolution.y,1.0);
  p+=vec2(-velocity.y,velocity.x)*.14;
  p-=cursor*vec2(.078,.048);
  float t=time*.31;
  // Two independent wavelengths supply a changing surface tangent/normal.
  float u=p.x*6.8+sin(p.y*5.7+t)*.72;
  float v=p.y*8.5+sin(p.x*4.9-t*.7)*.65;
  float wave=sin(u)*.37+cos(v)*.27+sin(u*.95-v*1.24+t*.42)*.19+dye*.62;
  float dx=cos(u)*1.7+cos(u*.95-v*1.24+t*.42)*.59+velocity.x*1.5;
  float dy=-sin(v)*2.4-sin(u*.95-v*1.24+t*.42)*.75+velocity.y*1.5;
  vec3 n=normalize(vec3(-dx*.44,-dy*.36,2.15));
  vec3 eye=normalize(vec3(p*.45,1.7));
  vec3 r=reflect(-eye,n);
  float angle=atan(r.x,r.z);
  float elev=atan(r.y,length(r.xz));
  float studio=ribbon(angle*6.0,elev*.8,t*.22);
  float panel=pow(sat(cos(angle*2.5+elev*3.0)),5.0);
  float strip=pow(sat(cos(elev*14.0+angle*.8)),38.0);
  float spec=pow(sat(dot(r,normalize(vec3(-.31,.78,.6)))),36.0);
  vec3 reflected=vec3(.10)+vec3(1.0,.97,.94)*(studio*1.05+panel*.18+strip*.62)+spec*vec3(.65,.84,1.0);
  vec3 base;
  if(material<1.5){
    base=mix(vec3(.003,.008,.078),vec3(.029,.27,.77),sat(wave*.74+.59));
    base+=reflected*vec3(.18,.47,.98);
    base+=vec3(.04,.13,.39)*dye;
  } else {
    base=mix(vec3(.048,.057,.074),vec3(.62,.70,.79),sat(wave*.67+.55));
    base+=reflected*.51;
    base+=vec3(.08,.13,.18)*dye;
  }
  float rim=pow(1.0-sat(dot(n,eye)),3.0);
  base+=rim*(material<1.5?vec3(.09,.29,.75):vec3(.22,.24,.28));
  float vignette=1.0-.24*smoothstep(.35,1.3,length(p));
  // Organic reveal: keep the film visible beneath these moving liquid edges.
  // Dye moves with the field; it is not simply a circular cursor spotlight.
  float feather=smoothstep(.06,.46,dye);
  float turbulence=sat(length(velocity)*2.6);
  float revealed=sat(feather*.93+turbulence*.30);
  float underlying=material<.5?.24:.095;
  float opacity=mix(underlying,.995,revealed);
  color=vec4(pow(clamp(base*vignette,0.0,1.0),vec3(.88)),opacity);
}`;
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(msg);
    }
    return s;
  }
  function program(fragment){
    const p=gl.createProgram();
    gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
    return p;
  }
  let fluidProgram,surfaceProgram;
  try {
    fluidProgram=program(fluidShader);
    surfaceProgram=program(surfaceShader);
  } catch(error){
    console.warn('WebGL fluid stage unavailable; using canvas fallbacks.',error);
    return;
  }
  const fLoc={
    oldState:gl.getUniformLocation(fluidProgram,'oldState'),
    point:gl.getUniformLocation(fluidProgram,'point'),
    motion:gl.getUniformLocation(fluidProgram,'motion'),
    injecting:gl.getUniformLocation(fluidProgram,'injecting'),
    aspect:gl.getUniformLocation(fluidProgram,'aspect'),
    resolution:gl.getUniformLocation(fluidProgram,'resolution')
  };
  const sLoc={
    fluidField:gl.getUniformLocation(surfaceProgram,'fluidField'),
    resolution:gl.getUniformLocation(surfaceProgram,'resolution'),
    cursor:gl.getUniformLocation(surfaceProgram,'cursor'),
    time:gl.getUniformLocation(surfaceProgram,'time'),
    material:gl.getUniformLocation(surfaceProgram,'material')
  };
  const SIM_SIZE=256;
  let cacheW=0,cacheH=0,prevTime=0,oldX=0,oldY=0,front=0,disabled=false;
  const texture=[],framebuffer=[];
  const seed=new Uint8Array(SIM_SIZE*SIM_SIZE*4);
  for(let i=0;i<seed.length;i+=4){seed[i]=128;seed[i+1]=128;seed[i+2]=0;seed[i+3]=255;}
  gl.activeTexture(gl.TEXTURE0);
  for(let i=0;i<2;i++){
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SIM_SIZE,SIM_SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,seed);
    texture.push(tex);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){disabled=true;}
    framebuffer.push(fb);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.bindTexture(gl.TEXTURE_2D,null);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disabled=true;});
  window.KBJEnvironment={
    render(material,w,h,t,nx,ny,active=false,animated=true){
      if(disabled||w<=0||h<=0)return null;
      const scale = w < 720 ? 0.78 : 1.0;
      const pw=Math.max(1,Math.round(w*scale)),ph=Math.max(1,Math.round(h*scale));
      if(pw!==cacheW||ph!==cacheH){
        canvas.width=cacheW=pw;canvas.height=cacheH=ph;
      }
      const elapsed=animated?t:0;
      const idleX=.5+.28*Math.sin(elapsed*.36),idleY=.5+.23*Math.sin(elapsed*.27+.9);
      const px=active?.5+nx*.5:idleX,py=active?.5-ny*.5:idleY;
      const dt=prevTime&&animated?Math.min(.07,Math.max(0,t-prevTime)):0;
      const mx=prevTime?Math.max(-.15,Math.min(.15,px-oldX)):0;
      const my=prevTime?Math.max(-.15,Math.min(.15,py-oldY)):0;
      // A quiet travelling brush keeps the image alive even before interaction.
      const speed=Math.abs(mx)+Math.abs(my);
      const injecting=dt>0?(active?(speed>.0003?1:0):(speed>.0001?.41:0)):0;
      if(dt>0){
        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer[1-front]);
        gl.viewport(0,0,SIM_SIZE,SIM_SIZE);
        gl.useProgram(fluidProgram);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture[front]);
        gl.uniform1i(fLoc.oldState,0);
        gl.uniform2f(fLoc.point,px,py);
        gl.uniform2f(fLoc.motion,mx,my);
        gl.uniform1f(fLoc.injecting,injecting);
        gl.uniform1f(fLoc.aspect,w/h);
        gl.uniform2f(fLoc.resolution,SIM_SIZE,SIM_SIZE);
        gl.drawArrays(gl.TRIANGLES,0,3);
        front=1-front;
      }
      oldX=px;oldY=py;prevTime=t;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,pw,ph);
      gl.disable(gl.BLEND);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(surfaceProgram);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture[front]);
      gl.uniform1i(sLoc.fluidField,0);
      gl.uniform2f(sLoc.resolution,pw,ph);
      gl.uniform2f(sLoc.cursor,nx,ny);
      gl.uniform1f(sLoc.time,animated?t:0);
      gl.uniform1f(sLoc.material,material);
      gl.drawArrays(gl.TRIANGLES,0,3);
      return canvas;
    }
  };
})();
