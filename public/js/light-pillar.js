(function () {
  const pillarHost = document.getElementById('lightPillar');
  if (!pillarHost || typeof THREE === 'undefined') return;

  const CONFIG = {
    topColor: '#5227FF',
    bottomColor: '#C084FC',
    intensity: 1,
    rotationSpeed: 0.3,
    glowAmount: 0.008,
    pillarWidth: 3,
    pillarHeight: 0.4,
    noiseIntensity: 0.5,
    pillarRotation: 0,
    interactive: false,
    mixBlendMode: 'screen',
  };

  const PRESET = {
    iterations: 28,
    waveIterations: 2,
    pixelRatio: 0.55,
    precision: 'mediump',
    stepMultiplier: 1.25,
    fps: 30,
  };

  function hexToVec3(hex) {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  }

  function buildFragmentShader() {
    const p = PRESET;
    return `
      precision ${p.precision} float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uRotCos;
      uniform float uRotSin;
      uniform float uPillarRotCos;
      uniform float uPillarRotSin;
      uniform float uWaveSin;
      uniform float uWaveCos;
      varying vec2 vUv;

      const float STEP_MULT = ${p.stepMultiplier.toFixed(2)};
      const int MAX_ITER = ${p.iterations};
      const int WAVE_ITER = ${p.waveIterations};

      void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
        uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);

        vec3 ro = vec3(0.0, 0.0, -10.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        vec3 col = vec3(0.0);
        float t = 0.1;

        for (int i = 0; i < MAX_ITER; i++) {
          vec3 p = ro + rd * t;
          p.xz = vec2(uRotCos * p.x - uRotSin * p.z, uRotSin * p.x + uRotCos * p.z);

          vec3 q = p;
          q.y = p.y * uPillarHeight + uTime;

          float freq = 1.0;
          float amp = 1.0;
          for (int j = 0; j < WAVE_ITER; j++) {
            q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
            q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
            freq *= 2.0;
            amp *= 0.5;
          }

          float d = length(cos(q.xz)) - 0.2;
          float bound = length(p.xz) - uPillarWidth;
          float k = 4.0;
          float h = max(k - abs(d - bound), 0.0);
          d = max(d, bound) + h * h * 0.0625 / k;
          d = abs(d) * 0.15 + 0.01;

          float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
          col += mix(uBottomColor, uTopColor, grad) / d;
          t += d * STEP_MULT;
          if (t > 50.0) break;
        }

        float widthNorm = uPillarWidth / 3.0;
        col = tanh(col * uGlowAmount / widthNorm);
        col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `;
  }

  function init() {
    const test = document.createElement('canvas');
    if (!test.getContext('webgl') && !test.getContext('experimental-webgl')) return;

    pillarHost.style.mixBlendMode = CONFIG.mixBlendMode;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pillarRad = (CONFIG.pillarRotation * Math.PI) / 180;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
      precision: PRESET.precision,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(PRESET.pixelRatio);
    pillarHost.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: buildFragmentShader(),
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTopColor: { value: hexToVec3(CONFIG.topColor) },
        uBottomColor: { value: hexToVec3(CONFIG.bottomColor) },
        uIntensity: { value: CONFIG.intensity },
        uGlowAmount: { value: CONFIG.glowAmount },
        uPillarWidth: { value: CONFIG.pillarWidth },
        uPillarHeight: { value: CONFIG.pillarHeight },
        uNoiseIntensity: { value: CONFIG.noiseIntensity },
        uRotCos: { value: 1 },
        uRotSin: { value: 0 },
        uPillarRotCos: { value: Math.cos(pillarRad) },
        uPillarRotSin: { value: Math.sin(pillarRad) },
        uWaveSin: { value: 0.3894183423086505 },
        uWaveCos: { value: 0.9210609940028851 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let time = 0;
    let raf = 0;
    let last = 0;
    const frameMs = 1000 / PRESET.fps;
    let visible = true;

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
    });

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < frameMs) return;
      last = now;
      time += 0.016 * CONFIG.rotationSpeed;
      material.uniforms.uTime.value = time;
      material.uniforms.uRotCos.value = Math.cos(0.3 * time);
      material.uniforms.uRotSin.value = Math.sin(0.3 * time);
      renderer.render(scene, camera);
    };

    const onResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      renderer.setSize(nw, nh);
      material.uniforms.uResolution.value.set(nw, nh);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', onResize);

    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(raf);
      material.dispose();
      renderer.dispose();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
