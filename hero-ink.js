/* Monochrome, pointer-responsive wordmark. The mask is the only texture;
   artwork and footage remain in the separate dormant material renderer. */
(() => {
  'use strict';

  const vertexSource = `#version 300 es
  precision highp float;
  out vec2 uv;
  void main() {
    vec2 p = gl_VertexID == 0 ? vec2(-1.,-1.) :
             gl_VertexID == 1 ? vec2( 3.,-1.) : vec2(-1., 3.);
    uv = p * .5 + .5;
    gl_Position = vec4(p,0.,1.);
  }`;
  const fragmentSource = `#version 300 es
  precision highp float;
  in vec2 uv;
  uniform sampler2D mask;
  uniform vec2 pointer;
  uniform vec2 trail;
  uniform vec2 shift;
  uniform vec2 impulse;
  uniform float aspect;
  out vec4 color;
  void main() {
    // A local, velocity-led displacement gives the ink weight without
    // bending the entire wordmark or revealing a second visual layer.
    vec2 distanceToPointer = (uv - pointer) * vec2(aspect,1.);
    vec2 distanceToTrail = (uv - trail) * vec2(aspect,1.);
    float reach = exp(-dot(distanceToPointer,distanceToPointer) * 19.);
    float wake = exp(-dot(distanceToTrail,distanceToTrail) * 11.);
    // Two response times give nearby letter edges a physical drag. The
    // slower field follows the pointer; both fields return to the same mask.
    vec2 lag = clamp(pointer - trail,vec2(-.25),vec2(.25));
    vec2 samplePoint = uv - shift - impulse * reach * .012 - lag * wake * .055;
    float ink = texture(mask, samplePoint).a;
    color = vec4(vec3(1. - ink),1.);
  }`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(reason || 'Ink shader failed');
    }
    return shader;
  }

  function create(sourceCanvas) {
    if (!sourceCanvas || !('WebGL2RenderingContext' in window)) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-ink-layer';
    canvas.setAttribute('aria-hidden','true');
    sourceCanvas.parentElement.appendChild(canvas);
    const gl = canvas.getContext('webgl2', {
      alpha:false, antialias:false, depth:false, stencil:false,
      powerPreference:'low-power', preserveDrawingBuffer:false
    });
    if (!gl) { canvas.remove(); return null; }

    let program, texture, uniforms, lost = false, ready = false;
    let lastMask = null, firstFrame = true;
    function initialize() {
      const vertex = compile(gl,gl.VERTEX_SHADER,vertexSource);
      const fragment = compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program,vertex);
      gl.attachShader(program,fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) || 'Ink program failed');
      uniforms = Object.fromEntries(['mask','pointer','trail','shift','impulse','aspect']
        .map(name => [name,gl.getUniformLocation(program,name)]));
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      firstFrame = true;
      ready = true;
    }
    function uploadMask(maskCanvas) {
      lastMask = maskCanvas;
      canvas.width = maskCanvas.width;
      canvas.height = maskCanvas.height;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,maskCanvas);
    }
    try { initialize(); }
    catch (_) { canvas.remove(); return null; }

    canvas.addEventListener('webglcontextlost',event => {
      event.preventDefault();
      lost = true;
      canvas.style.visibility = 'hidden';
      sourceCanvas.style.visibility = 'visible';
    });
    canvas.addEventListener('webglcontextrestored',() => {
      try { initialize(); if(lastMask) uploadMask(lastMask); lost = false; }
      catch (_) { ready = false; canvas.style.visibility = 'hidden'; }
    });

    return {
      resize(maskCanvas) {
        if (lost || !ready) return;
        uploadMask(maskCanvas);
      },
      render({width,height,x,y,pointerX,pointerY,trailX,trailY,impulseX,impulseY}) {
        if (lost || !ready) return false;
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1i(uniforms.mask,0);
        gl.uniform2f(uniforms.pointer,(pointerX+1)*.5,(1-pointerY)*.5);
        gl.uniform2f(uniforms.trail,(trailX+1)*.5,(1-trailY)*.5);
        gl.uniform2f(uniforms.shift,x/width,-y/height);
        gl.uniform2f(uniforms.impulse,impulseX,-impulseY);
        gl.uniform1f(uniforms.aspect,width/height);
        gl.drawArrays(gl.TRIANGLES,0,3);
        if (firstFrame) {
          firstFrame = false;
          if (gl.getError() !== gl.NO_ERROR) {
            ready = false;
            canvas.style.visibility = 'hidden';
            return false;
          }
        }
        canvas.style.visibility = 'visible';
        return true;
      }
    };
  }

  window.KBJInkRenderer = {create};
})();
