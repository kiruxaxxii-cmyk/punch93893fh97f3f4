const heroBrand = document.getElementById('heroBrand');
const headerBrand = document.getElementById('headerBrand');
const siteHeader = document.getElementById('siteHeader');
const heroLine = document.getElementById('heroLine');

const LINE = 'Minecraft-клиент с 50+ модулями';

let typeTimer = null;
let wasScrolled = false;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function typeText(text, el) {
  if (!el) return;
  if (typeTimer) clearInterval(typeTimer);
  let i = 0;
  el.textContent = '';
  el.classList.remove('done');
  typeTimer = setInterval(() => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i++);
    } else {
      clearInterval(typeTimer);
      typeTimer = null;
      el.classList.add('done');
    }
  }, 32);
}

function onScroll() {
  if (!heroBrand || !headerBrand) return;

  const y = window.scrollY;
  const vh = window.innerHeight;
  const p = Math.min(Math.max(y / (vh * 0.48), 0), 1);
  const e = ease(p);

  heroBrand.style.transform = `translateY(${lerp(0, -vh * 0.38, e)}px) scale(${lerp(1, 0.22, e)})`;
  heroBrand.style.filter = `blur(${lerp(0, 22, e)}px)`;
  heroBrand.style.opacity = String(lerp(1, 0, Math.min(e * 1.35, 1)));

  if (heroLine) {
    heroLine.style.transform = `translateY(${lerp(0, -20, e)}px)`;
    heroLine.style.filter = `blur(${lerp(0, 14, e)}px)`;
    heroLine.style.opacity = String(lerp(1, 0, e));
  }

  headerBrand.classList.toggle('visible', p > 0.52);
  siteHeader?.classList.toggle('is-solid', p > 0.08);

  if (p > 0.22) wasScrolled = true;

  if (p < 0.05 && wasScrolled) {
    wasScrolled = false;
    typeText(LINE, heroLine);
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
document.addEventListener('DOMContentLoaded', () => {
  typeText(LINE, heroLine);
  onScroll();
});
