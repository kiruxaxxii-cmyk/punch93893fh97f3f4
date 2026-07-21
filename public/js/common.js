function initAuthNav() {
  const token = localStorage.getItem('punch-token');
  document.querySelectorAll('[data-auth-guest]').forEach((el) => {
    el.hidden = !!token;
  });
  document.querySelectorAll('[data-auth-user]').forEach((el) => {
    el.hidden = !token;
  });

  const path = window.location.pathname;
  if (token && (path.includes('login.html') || path.includes('register.html'))) {
    window.location.href = '/cabinet.html';
  }
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('panel-reveal')) {
          e.target.classList.add('is-visible');
        } else {
          e.target.classList.add('visible');
        }
        observer.unobserve(e.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  document.querySelectorAll('.reveal, .panel-reveal').forEach((el) => observer.observe(el));
}

function markActiveNav() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  document.querySelectorAll('.header-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    let active = false;
    if (href?.startsWith('#')) {
      active = hash === href || (!hash && href === '#hero');
    } else {
      active =
        (href === '/' && (path === '/' || path.endsWith('index.html'))) ||
        (href !== '/' && path.includes(href.replace('/', '')));
    }
    a.classList.toggle('active', active);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  initReveal();
  markActiveNav();
  initSmoothScroll();
  window.addEventListener('hashchange', markActiveNav);
});

function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.body.classList.contains('page-landing')) return;

  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let raf = null;

  function tick() {
    currentY += (targetY - currentY) * 0.12;
    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      raf = null;
      return;
    }
    window.scrollTo(0, currentY);
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    e.preventDefault();
    targetY = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, targetY + e.deltaY));
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: false });
}
