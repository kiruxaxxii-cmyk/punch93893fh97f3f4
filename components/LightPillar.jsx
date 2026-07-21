'use client';

import { useRef, useEffect } from 'react';

const VERT = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);

    float rot = uTime * 0.08;
    vec2 ruv;
    ruv.x = uv.x * cos(rot) - uv.y * sin(rot);
    ruv.y = uv.x * sin(rot) + uv.y * cos(rot);

    float angle = atan(ruv.y, ruv.x);
    float radius = length(ruv);

    float band1 = sin(radius * 8.0 - uTime * 1.2) * 0.5 + 0.5;
    float band2 = sin(radius * 5.0 + uTime * 0.9 + angle * 3.0) * 0.5 + 0.5;
    float band3 = sin((ruv.y + uTime * 0.6) * 4.0) * 0.5 + 0.5;

    float glow = exp(-radius * 1.2) * 0.8;
    float pillar = band1 * band2 * 0.4 + band3 * 0.2 + glow * 0.4;

    float n = noise(vec2(vUv.x * 4.0 + uTime * 0.05, vUv.y * 4.0)) * 0.15;

    float fade = clamp(1.0 - radius * 0.5, 0.0, 1.0);
    float grad = clamp((ruv.y * 0.5 + 0.5), 0.0, 1.0);

    vec3 col = mix(uBottomColor, uTopColor, grad);
    col *= pillar * fade * 1.5 + 0.05;
    col += n;
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export default function LightPillar({
  topColor = '#a855f7',
  bottomColor = '#1e1b4b',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes = gl.getUniformLocation(prog, 'uResolution');
    const uTop = gl.getUniformLocation(prog, 'uTopColor');
    const uBot = gl.getUniformLocation(prog, 'uBottomColor');

    const tc = hexToRgb(topColor);
    const bc = hexToRgb(bottomColor);
    gl.uniform3fv(uTop, tc);
    gl.uniform3fv(uBot, bc);

    let raf;
    let startTime = performance.now();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    function render() {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }

    resize();
    render();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [topColor, bottomColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
