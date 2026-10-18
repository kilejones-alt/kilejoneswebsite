/* Original shader materials for the Kile B. Jones typographic stage.
   Progressive enhancement: the main canvas renderer remains usable without WebGL2. */
(() => {
  'use strict';
  const canvas = document.createElement('canvas');
  let gl;
  try { gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: true, powerPreference: 'high-performance'
  }); } catch (_) {}
  if (!gl) return;
  const VS = `#version 300 es
precision highp float;
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  uv = p;
  gl_Position = vec4(p*2.0-1.0,0.0,1.0);
}`;
  const FS = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform vec2 resolution;
uniform vec2 cursor;
uniform float time;
uniform float material;
const float PI=3.14159265359;
float sat(float a){return clamp(a,0.0,1.0);}
vec3 envmap(vec3 v){
  // Multiple long soft-box reflection panels, at different angular offsets.
  float a=atan(v.x,v.z);
  float b=atan(v.y,length(v.xz));
  float strip=pow(sat(cos(a*6.0+sin(b*3.0)*.6)),32.0);
  float broad=pow(sat(cos(a*2.8+b*2.0)),6.0);
  float bar=pow(sat(cos(b*13.0+a*.45)),40.0);
  return vec3(.08)+vec3(1.0,.95,.90)*(strip*.9+broad*.18+bar*.75);
}
void main(){
  vec2 p = (gl_FragCoord.xy-.5*resolution)/max(1.0,resolution.y);
  p -= cursor*.10;
  float tt=time*.21;
  // Analytic folds create moving 3-dimensional normals and view reflections.
  float u=p.x*5.7+sin(p.y*3.8+tt)*.8;
  float v=p.y*7.9+sin(p.x*4.1-tt)*.6;
  float h=sin(u)*.34+cos(v)*.26+sin(u*1.85-v*.92+tt)*.12;
  float dx=cos(u)*1.55+cos(u*1.85-v*.92+tt)*.63;
  float dy=-sin(v)*2.05-sin(u*1.85-v*.92+tt)*.5;
  vec3 n=normalize(vec3(-dx*.45,-dy*.46,2.0));
  vec3 view=normalize(vec3(p*.42,1.9));
  vec3 refl=reflect(-view,n);
  float lambert=sat(dot(n,normalize(vec3(-.5,.75,1.3))))*.68+.23;
  vec3 lights=envmap(refl);
  float highlight=pow(sat(dot(refl,normalize(vec3(.43,.72,.54)))),24.0);
  float edge=pow(1.0-sat(dot(n,view)),3.0);
  vec3 base;
  if(material < .5) {
    base=mix(vec3(.003,.015,.13),vec3(.028,.26,.79),sat((h+.8)*.77));
    base+=vec3(.035,.21,.92)*pow(lambert,2.0);
    base+=lights*vec3(.16,.39,.89)+vec3(.57,.85,1.0)*highlight*.78;
  } else if(material < 1.5) {
    base=mix(vec3(.005,.006,.010),vec3(.16,.19,.24),sat((h+.75)*.6));
    base+=(lights*.25+highlight*.30)*vec3(.9,.94,1.0);
  } else {
    base=mix(vec3(.06,.075,.10),vec3(.72,.77,.83),sat((h+.72)*.65));
    base+=lights*.61+vec3(.7,.85,.99)*highlight*.52;
  }
  base+=edge*(material<.5?vec3(.03,.13,.45):vec3(.12));
  float vignette=1.0-.26*smoothstep(.25,1.3,length(p));
  color=vec4(pow(clamp(base*vignette,0.0,1.0),vec3(.91)),1.0);
}`;
  function makeShader(type, source) {
    const sh=gl.createShader(type);
    gl.shaderSource(sh,source);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
      const err=gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw Error(err);
    }
    return sh;
  }
  let program;
  try {
    program=gl.createProgram();
    gl.attachShader(program,makeShader(gl.VERTEX_SHADER,VS));
    gl.attachShader(program,makeShader(gl.FRAGMENT_SHADER,FS));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  } catch (err) {
    console.warn('Original WebGL material unavailable; using canvas fallback.',err);
    return;
  }
  const resolution=gl.getUniformLocation(program,'resolution');
  const cursor=gl.getUniformLocation(program,'cursor');
  const time=gl.getUniformLocation(program,'time');
  const material=gl.getUniformLocation(program,'material');
  let cacheWidth=0,cacheHeight=0,disabled=false;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();disabled=true;});
  window.KBJEnvironment={
    render(mode,w,h,t,x,y){
      if(disabled)return null;
      const scale = w < 720 ? 0.72 : 0.78;
      const pw=Math.round(w*scale),ph=Math.round(h*scale);
      if(pw!==cacheWidth||ph!==cacheHeight){
        canvas.width=cacheWidth=pw;canvas.height=cacheHeight=ph;
        gl.viewport(0,0,pw,ph);
      }
      gl.useProgram(program);
      gl.uniform2f(resolution,pw,ph);
      gl.uniform2f(cursor,x,y);
      gl.uniform1f(time,t);
      gl.uniform1f(material,mode);
      gl.drawArrays(gl.TRIANGLES,0,3);
      return canvas;
    }
  };
})();
