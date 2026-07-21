(function () {
  const canvas = document.getElementById('purpleRays');
  if (!canvas) return;

  const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

  const FRAGMENT_HIGH = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  // shear the field so the shafts lean (slightly tilted rays)
  float tilt = 0.45;
  vec2 p = vec2(uv.x * aspect + uv.y * tilt * aspect, uv.y);

  float t = iTime;

  // cheap moving warp + slow sideways slide => clearly animated (no noise, fast)
  p.x += sin(uv.y * 6.0 + t * 0.4) * 0.12;
  p.x += t * 0.05;

  // layered, high-contrast ray bands (distinct shafts)
  float r1 = pow(0.5 + 0.5 * sin(p.x * 15.0), 8.0);
  float r2 = pow(0.5 + 0.5 * sin(p.x * 29.0 + 1.7), 14.0);
  float r3 = pow(0.5 + 0.5 * sin(p.x * 6.0 - 0.8 + t * 0.25), 5.0);
  float rays = r1 * 0.95 + r2 * 0.5 + r3 * 0.45;

  // brightest at the top, fading downward (light from above)
  float topFade = mix(0.32, 1.0, uv.y);

  float intensity = rays * topFade;

  // purple palette with a gentle per-shaft hue shift
  vec3 colA = vec3(0.45, 0.13, 0.95);
  vec3 colB = vec3(0.74, 0.38, 1.00);
  float hm = 0.5 + 0.5 * sin(p.x * 15.0 + t * 0.5);
  vec3 col = mix(colA, colB, hm);

  vec3 outc = col * intensity * 1.5;

  // only a faint top source glow, not a blob
  float glow = exp(-(1.0 - uv.y) * 4.0) * 0.16;
  outc += vec3(0.32, 0.13, 0.62) * glow;

  // dark purple base
  outc += vec3(0.022, 0.010, 0.042);

  // vignette
  float vig = smoothstep(1.35, 0.25, length(uv - 0.5));
  outc *= mix(0.5, 1.0, vig);

  gl_FragColor = vec4(outc, 1.0);
}
`;

  const FRAGMENT_MED = FRAGMENT_HIGH.replace('highp', 'mediump');

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function buildProgram(gl) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    if (!vs) return null;

    let fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_HIGH);
    if (!fs) fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_MED);
    if (!fs) {
      gl.deleteShader(vs);
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return null;
    }
    return { program, vs, fs };
  }

  function init() {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })
      || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const built = buildProgram(gl);
    if (!built) return;

    const { program, vs, fs } = built;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'iTime');
    const uResolution = gl.getUniformLocation(program, 'iResolution');

    let raf = 0;
    let hidden = false;
    const start = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fps = reduced ? 1 : 30;

    function resize() {
      // render at reduced internal resolution and let CSS upscale — much cheaper
      const RENDER_SCALE = reduced ? 1.0 : 0.65;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.0) * RENDER_SCALE;
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResolution, w, h);
    }

    let last = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (hidden) return;
      if (now - last < 1000 / fps) return;
      last = now;
      const t = reduced ? 0 : (now - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    resize();
    canvas.classList.add('is-running');
    document.documentElement.classList.add('app-ready');
    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
    });

    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
