function initAuthScene(canvas) {
  const scene = canvas.dataset.scene;
  if (scene === 'sakura') runSakura(canvas);
  if (scene === 'oak') runOak(canvas);
}

function resizeCanvas(canvas) {
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function runSakura(canvas) {
  const petals = [];
  let ctx, w, h;

  function spawn() {
    petals.push({
      x: Math.random() * w,
      y: -20,
      r: 4 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      vy: 0.6 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.8,
      hue: 330 + Math.random() * 25,
    });
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = 0.75;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2);
    g.addColorStop(0, `hsla(${p.hue}, 90%, 78%, 0.95)`);
    g.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0.1)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    if (petals.length < 55 && Math.random() > 0.4) spawn();
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.y * 0.02) * 0.3;
      p.rot += p.spin;
      drawPetal(p);
      if (p.y > h + 20) petals.splice(i, 1);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    ({ ctx, w, h } = resizeCanvas(canvas));
    for (let i = 0; i < 30; i++) {
      spawn();
      petals[petals.length - 1].y = Math.random() * h;
    }
    frame();
  }

  start();
  window.addEventListener('resize', start);
}

function runOak(canvas) {
  const leaves = [];
  let ctx, w, h;

  function spawn() {
    leaves.push({
      x: Math.random() * w,
      y: -16,
      w: 8 + Math.random() * 10,
      h: 10 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      vy: 0.5 + Math.random() * 1,
      vx: (Math.random() - 0.5) * 0.6,
    });
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.globalAlpha = 0.7;
    const g = ctx.createLinearGradient(-l.w, 0, l.w, 0);
    g.addColorStop(0, '#5a7a32');
    g.addColorStop(0.5, '#8fb356');
    g.addColorStop(1, '#3d5522');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -l.h / 2);
    ctx.quadraticCurveTo(l.w, -l.h / 4, 0, l.h / 2);
    ctx.quadraticCurveTo(-l.w, l.h / 4, 0, -l.h / 2);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    if (leaves.length < 40 && Math.random() > 0.5) spawn();
    for (let i = leaves.length - 1; i >= 0; i--) {
      const l = leaves[i];
      l.y += l.vy;
      l.x += l.vx + Math.sin(l.y * 0.015) * 0.25;
      l.rot += l.spin;
      drawLeaf(l);
      if (l.y > h + 20) leaves.splice(i, 1);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    ({ ctx, w, h } = resizeCanvas(canvas));
    for (let i = 0; i < 22; i++) {
      spawn();
      leaves[leaves.length - 1].y = Math.random() * h;
    }
    frame();
  }

  start();
  window.addEventListener('resize', start);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.auth-scene-canvas').forEach(initAuthScene);
});
