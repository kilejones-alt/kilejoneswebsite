/* Original ink-reveal renderer for KILE JONES. No third-party assets or code. */
(() => {
  'use strict';
  const VERTEX = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
 vec2 p=gl_VertexID==0?vec2(-1.,-1.):gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.);
 uv=p*.5+.5;gl_Position=vec4(p,0.,1.);
}`;
  const FLOW = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D previous;
uniform vec2 pointer,previousPointer,motion;
uniform float aspect,delta,inject,time;
out vec4 color;
void main(){
 vec2 velocity=(texture(previous,uv).rg-.5)*2.;
 vec2 origin=clamp(uv-velocity*delta*.34,vec2(.002),vec2(.998));
 vec4 old=texture(previous,origin);
 vec2 carried=(old.rg-.5)*2.;
 vec2 p=uv*vec2(aspect,1.),a=previousPointer*vec2(aspect,1.),b=pointer*vec2(aspect,1.);
 vec2 segment=b-a;
 float along=clamp(dot(p-a,segment)/max(dot(segment,segment),.000001),0.,1.);
 vec2 offset=p-mix(a,b,along);
 vec2 cell=1./vec2(textureSize(previous,0));
 float left=texture(previous,uv-vec2(cell.x,0.)).b;
 float right=texture(previous,uv+vec2(cell.x,0.)).b;
 float bottom=texture(previous,uv-vec2(0.,cell.y)).b;
 float top=texture(previous,uv+vec2(0.,cell.y)).b;
 vec2 dyeGradient=vec2(right-left,top-bottom);
 float wobble=sin(p.x*81.+time*1.8)*sin(p.y*73.-time*1.2);
 float brush=exp(-dot(offset,offset)*(255.+wobble*58.));
 vec2 curl=vec2(-offset.y,offset.x)*brush*(.75+.2*sin(time*1.7))+
           vec2(-dyeGradient.y,dyeGradient.x)*.018;
 vec2 newVelocity=clamp(carried*pow(.963,delta*60.)+
   motion*brush*inject*.11+curl*inject*.23,vec2(-.85),vec2(.85));
 float dye=clamp(old.b*pow(.991,delta*60.)+brush*inject*.80,0.,1.);
 color=vec4(newVelocity*.5+.5,dye,1.);
}`;
  const COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D mask,blurred,fluid;
uniform vec2 texel;
uniform float time;
out vec4 color;
void main(){
 float glyph=texture(mask,uv).a,dye=texture(fluid,uv).b;
 float edge=max(fwidth(dye)*.95,.004);
 float torn=(sin(uv.x*113.+time*.9)*sin(uv.y*89.-time*.7)+
             sin(uv.x*53.-uv.y*71.+time*.5))*.009;
 float reveal=smoothstep(.118-edge,.118+edge,dye+torn);
 float height=pow(texture(blurred,uv).a,.53);
 float dx=pow(texture(blurred,uv+vec2(texel.x*3.,0.)).a,.53)-
          pow(texture(blurred,uv-vec2(texel.x*3.,0.)).a,.53);
 float dy=pow(texture(blurred,uv+vec2(0.,texel.y*3.)).a,.53)-
          pow(texture(blurred,uv-vec2(0.,texel.y*3.)).a,.53);
 vec3 normal=normalize(vec3(-dx*13.,-dy*13.,.19+height*.27));
 float horizon=smoothstep(-.72,.54,normal.y);
 float box=pow(max(dot(normal,normalize(vec3(-.47,.67,.59))),0.),12.);
 float strip=pow(max(dot(normal,normalize(vec3(.73,.18,.66))),0.),28.);
 float folded=sin(normal.x*8.+normal.y*4.+time*.18)*.035;
 float value=clamp(.26+horizon*.48+box*.36+strip*.22+folded,.12,1.);
 vec3 silver=vec3(value*.92,value*.94,value);
 vec3 base=mix(vec3(1.),vec3(.012),glyph);
 vec3 underneath=mix(vec3(.012),silver,glyph);
 color=vec4(mix(base,underneath,reveal),1.);
}`;
  function compile(gl,type,source){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Shader failed');
    return shader;
  }
  function program(gl,fragment,names){
    const v=compile(gl,gl.VERTEX_SHADER,VERTEX),f=compile(gl,gl.FRAGMENT_SHADER,fragment);
    const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
    gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Program failed');
    return {p,u:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]))};
  }
  function texture(gl,width=1,height=1){
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    return t;
  }
  function target(gl,w,h){
    const t=texture(gl,w,h),f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Fluid target incomplete');
    gl.viewport(0,0,w,h);gl.clearColor(.5,.5,0.,1.);gl.clear(gl.COLOR_BUFFER_BIT);
    return {t,f};
  }
  function create(sourceCanvas){
    if(!sourceCanvas||!('WebGL2RenderingContext' in window))return null;
    const canvas=document.createElement('canvas');canvas.className='hero-ink-layer';
    canvas.setAttribute('aria-hidden','true');sourceCanvas.parentElement.append(canvas);
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl){canvas.remove();return null;}
    let flow,composite,glyph,soft,fields=[],size=[1,1],ready=false,lost=false,last=null,lastPointer=null,lastMotionAt=0,wasIdle=false;
    const blurCanvas=document.createElement('canvas'),blurContext=blurCanvas.getContext('2d');
    function initialize(){
      flow=program(gl,FLOW,['previous','pointer','previousPointer','motion','aspect','delta','inject','time']);
      composite=program(gl,COMPOSITE,['mask','blurred','fluid','texel','time']);
      glyph=texture(gl);soft=texture(gl);ready=true;
    }
    function resize(maskCanvas){
      if(!ready||lost)return;
      last=maskCanvas;canvas.width=maskCanvas.width;canvas.height=maskCanvas.height;
      blurCanvas.width=maskCanvas.width;blurCanvas.height=maskCanvas.height;
      blurContext.clearRect(0,0,blurCanvas.width,blurCanvas.height);
      blurContext.filter='blur('+Math.max(6,Math.round(maskCanvas.width/120))+'px)';
      blurContext.drawImage(maskCanvas,0,0);blurContext.filter='none';
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      for(const [t,source] of [[glyph,maskCanvas],[soft,blurCanvas]]){
        gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      for(const field of fields){gl.deleteTexture(field.t);gl.deleteFramebuffer(field.f);}
      const w=Math.min(256,Math.max(128,Math.round(maskCanvas.width/5)));
      const h=Math.min(320,Math.max(96,Math.round(w*maskCanvas.height/maskCanvas.width)));
      size=[w,h];fields=[target(gl,w,h),target(gl,w,h)];lastPointer=null;
    }
    try{initialize();}catch(_){canvas.remove();return null;}
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();lost=true;canvas.style.visibility='hidden';sourceCanvas.style.visibility='visible';
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      try{initialize();lost=false;if(last)resize(last);}catch(_){ready=false;}
    });
    return {
      resize,
      render({width,height,pointerX,pointerY,impulseX,impulseY,energy=0,active=false,time=0,dt=.016}){
        if(!ready||lost||!fields.length)return false;
        const userX=(pointerX+1)*.5,userY=(1-pointerY)*.5;
        if(active && energy>.025)lastMotionAt=time;
        const idle=time>3.5 && time-lastMotionAt>3.5;
        const x=idle?.5+.19*Math.sin(time*.64):userX;
        const y=idle?.5+.12*Math.sin(time*1.28):userY;
        const prior=lastPointer && idle===wasIdle?lastPointer:[x,y];lastPointer=[x,y];wasIdle=idle;
        const moved=Math.hypot((x-prior[0])*width/height,y-prior[1]);
        const inject=idle?.13:(active&&moved>.0003?Math.min(1.35,.62+energy*.17):0);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fields[1].f);gl.viewport(0,0,...size);
        gl.useProgram(flow.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fields[0].t);
        gl.uniform1i(flow.u.previous,0);gl.uniform2f(flow.u.pointer,x,y);
        gl.uniform2f(flow.u.previousPointer,...prior);
        gl.uniform2f(flow.u.motion,impulseX,-impulseY);
        gl.uniform1f(flow.u.aspect,width/height);gl.uniform1f(flow.u.delta,Math.max(.008,Math.min(.05,dt)));
        gl.uniform1f(flow.u.inject,inject);gl.uniform1f(flow.u.time,time);
        gl.drawArrays(gl.TRIANGLES,0,3);fields.reverse();
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
        gl.useProgram(composite.p);
        for(const [index,t,name] of [[0,glyph,'mask'],[1,soft,'blurred'],[2,fields[0].t,'fluid']]){
          gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(composite.u[name],index);
        }
        gl.uniform2f(composite.u.texel,1/canvas.width,1/canvas.height);
        gl.uniform1f(composite.u.time,time);gl.drawArrays(gl.TRIANGLES,0,3);
        canvas.style.visibility='visible';return gl.getError()===gl.NO_ERROR;
      }
    };
  }
  window.KBJInkRenderer={create};
})();
