(function () {
  const canvas = document.getElementById('raysBg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const BEAMS = [
    { x: 0.5, w: 0.42, a: 0.28, hue: [140, 90, 255], drift: 0.012, speed: 0.22 },
    { x: 0.38, w: 0.22, a: 0.16, hue: [180, 120, 255], drift: 0.018, speed: 0.17 },
    { x: 0.62, w: 0.22, a: 0.16, hue: [120, 70, 240], drift: 0.015, speed: 0.19 },
    { x: 0.28, w: 0.14, a: 0.09, hue: [200, 150, 255], drift: 0.01, speed: 0.14 },
    { x: 0.72, w: 0.14, a: 0.09, hue: [100, 60, 220], drift: 0.011, speed: 0.13 },
  ];

  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  let hidden = false;
  const FPS = 24;
  const frameMs = 1000 / FPS;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    w = Math.max(1, Math.floor(window.innerWidth * dpr));
    h = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  function drawBeam(beam, t) {
    const cx = (beam.x + Math.sin(t * beam.speed) * beam.drift) * w;
    const cy = 0;
    const radius = beam.w * w;
    const [r, g, b] = beam.hue;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, h * 0.72, radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${beam.a})`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},${beam.a * 0.45})`);
    grad.addColorStop(0.7, `rgba(${r},${g},${b},${beam.a * 0.12})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (hidden || now - last < frameMs) return;
    last = now;

    const t = now * 0.001;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    BEAMS.forEach((beam) => drawBeam(beam, t));
    ctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    resize();
    canvas.classList.add('is-running');
    document.documentElement.classList.add('app-ready');
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  }, { once: true });
})();
