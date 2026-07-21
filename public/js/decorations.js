function createEl(cls, style = {}) {
  const el = document.createElement('span');
  el.className = cls;
  Object.assign(el.style, style);
  return el;
}

function initCrystals(root) {
  const shapes = ['◆', '⬡', '✦', '◇'];
  for (let i = 0; i < 18; i++) {
    const c = createEl('fx-crystal', {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${6 + Math.random() * 8}s`,
      fontSize: `${14 + Math.random() * 22}px`,
      opacity: `${0.15 + Math.random() * 0.35}`,
    });
    c.textContent = shapes[i % shapes.length];
    root.appendChild(c);
  }
}

function initSakura(root) {
  for (let i = 0; i < 28; i++) {
    const p = createEl('fx-sakura', {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 10}s`,
      animationDuration: `${8 + Math.random() * 10}s`,
      width: `${8 + Math.random() * 10}px`,
      height: `${6 + Math.random() * 8}px`,
    });
    root.appendChild(p);
  }
}

function initOak(root) {
  for (let i = 0; i < 22; i++) {
    const l = createEl('fx-oak', {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 12}s`,
      animationDuration: `${10 + Math.random() * 12}s`,
      width: `${10 + Math.random() * 14}px`,
      height: `${12 + Math.random() * 16}px`,
    });
    root.appendChild(l);
  }
}

function initFloatIcons(root) {
  const icons = ['⛏', '💎', '⚔', '🛡', '✨', '🔮'];
  for (let i = 0; i < 12; i++) {
    const f = createEl('fx-icon', {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 6}s`,
      animationDuration: `${5 + Math.random() * 6}s`,
      fontSize: `${18 + Math.random() * 14}px`,
    });
    f.textContent = icons[i % icons.length];
    root.appendChild(f);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-fx]').forEach((root) => {
    const type = root.dataset.fx;
    if (type === 'crystals') initCrystals(root);
    if (type === 'sakura') initSakura(root);
    if (type === 'oak') initOak(root);
    if (type === 'icons') initFloatIcons(root);
  });
});
