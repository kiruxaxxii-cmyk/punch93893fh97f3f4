(function () {
  const canvas = document.getElementById('cursorShader');
  if (!canvas) return;

  const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

  const FRAGMENT_HIGH = `
precision highp float;
#define STEPS 36
uniform float iTime;
uniform vec2 iResolution;

float tanh1(float x) {
  float e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}
vec4 tanh4(vec4 v) {
  return vec4(tanh1(v.x), tanh1(v.y), tanh1(v.z), tanh1(v.w));
}

void main() {
  vec2 I = gl_FragCoord.xy;
  vec4 O = vec4(0.0);
  float t = 0.0;
  float v = 0.0;
  vec4 phase = vec4(sin(iTime / 10.0), 1.0 + cos(iTime), 2.0 + cos(-iTime), 0.0);
  float zOff = sin(iTime * 0.85) * 5.0;

  for (int k = 0; k < STEPS; k++) {
    vec3 p = t * normalize(vec3(I + I, 1.0) - iResolution.xyy);
    float base = t * 0.75;
    float angC = base + mod(floor(34.0 * t + 0.5), 100.0 - t);
    vec4 c = cos(vec4(base + 1.0, base + 12.0, angC, base + 1.0));
    p.xy = mat2(c.x, c.y, c.z, c.w) * p.xy;
    p.z -= zOff;
    p = mod(p, 4.0) - 2.0;
    v = mix(abs(length(p) - 1.0), length(p.xz), 0.5 - 0.5 * cos(t)) + 0.01;
    t += v * 0.3;
    O += exp(sin(t + phase)) / v;
  }

  O = tanh4(O / 2e2);
  float g = (O.r + O.g + O.b) / 3.0;
  gl_FragColor = vec4(vec3(g), clamp(g * 1.35, 0.0, 0.85));
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
    const fps = reduced ? 20 : 30;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.5);
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
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
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
