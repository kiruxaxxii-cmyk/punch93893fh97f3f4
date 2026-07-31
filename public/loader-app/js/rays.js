(() => {
  const canvas = document.getElementById("rays");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return;

  const COLOR = [0xaf / 255, 0xaf / 255, 0xaf / 255];

  const vs = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fs = `
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec3 raysColor;

    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
      vec2 sourceToCoord = coord - raySource;
      vec2 dirNorm = normalize(sourceToCoord);
      float cosAngle = dot(dirNorm, rayRefDirection);
      float distortedAngle = cosAngle + 0.08 * sin(iTime * 2.0 + length(sourceToCoord) * 0.01);
      float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / 5.0);
      float distance = length(sourceToCoord);
      float maxDistance = iResolution.x * 7.0;
      float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
      float fadeFalloff = clamp((iResolution.x * 2.3 - distance) / (iResolution.x * 2.3), 0.5, 1.0);
      float baseStrength = clamp(
        (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
        (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
        0.0, 1.0
      );
      return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
    }

    void main() {
      vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
      vec2 rayPos = vec2(iResolution.x * 0.5, -290.0);
      vec2 rayDir = vec2(0.0, 1.0);

      float r1 = rayStrength(rayPos, rayDir, coord, 36.2, 21.1, 1.2);
      float r2 = rayStrength(rayPos, rayDir, coord, 22.4, 18.7, 1.05);
      float strength = r1 * 0.5 + r2 * 0.4;
      strength *= 0.65 + 0.35 * noise(coord * 0.01 + iTime * 0.05);

      vec3 col = raysColor * strength;
      float alpha = clamp(strength * 1.15, 0.0, 0.85);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "iTime");
  const uRes = gl.getUniformLocation(prog, "iResolution");
  const uColor = gl.getUniformLocation(prog, "raysColor");
  gl.uniform3fv(uColor, COLOR);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  }

  let start = performance.now();
  function frame(now) {
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
