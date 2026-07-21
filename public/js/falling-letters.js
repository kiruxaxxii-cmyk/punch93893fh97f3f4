(function () {
  const SKIP_SEL =
    'input, textarea, select, form, .auth-switch, .carousel, .buy-modal, .checkout-card, .cabinet-btn, .admin-tab, .admin-toolbar, .support-btn, .profile-logout, svg, code, pre, table';

  const AUTO_TAGS =
    'h1, h2, h3, p, .landing-pill, .landing-badge, .price, .page-note, .auth-lead, .auth-feature span, .cabinet-kicker span, .cabinet-lead, .cabinet-card h3, .admin-head h1, .admin-head p, .stat-card > span, .info-label, .ebd-lead';

  const ROOT_SEL =
    'main, .cabinet-main, .admin-main, .site-footer, .register-intro, .payment-card, header .header-brand';

  function shouldSkip(el) {
    if (!el || el.closest(SKIP_SEL)) return true;
    if (el.closest('.fall-text-skip')) return true;
    if (el.closest('table, pre, code, form')) return true;
    // skip elements that contain interactive/icon/non-text children (avoid breaking them)
    if (el.querySelector('a, button, input, form, select, svg, img')) return true;
    const text = (el.dataset.text || el.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length < 2;
  }

  function collectTargets() {
    const seen = new Set();
    const list = [];

    document.querySelectorAll('.fall-text').forEach((el) => {
      if (!seen.has(el) && !shouldSkip(el)) {
        seen.add(el);
        list.push(el);
      }
    });

    // Any leaf element that carries only text (no child elements) gets the effect,
    // so every piece of text on the page falls in with a blur.
    const LEAF_SEL =
      'h1, h2, h3, h4, h5, h6, p, li, label, span, a, button, strong, b, em, i, ' +
      '.price, .page-note, .landing-pill, .landing-badge, .brand-p, .brand-text, [data-text]';

    document.querySelectorAll(LEAF_SEL).forEach((el) => {
      if (seen.has(el) || shouldSkip(el)) return;
      if (el.children.length > 0) return; // only pure text leaves
      const text = (el.dataset.text || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 2) return;
      seen.add(el);
      list.push(el);
    });

    return list;
  }

  function getText(el) {
    if (el.dataset.text) return el.dataset.text;
    return el.textContent.replace(/\s+/g, ' ').trim();
  }

  function prepareFallText(el) {
    if (el.dataset.fallPrepared) return;
    const text = getText(el);
    if (!text || text.length < 2) return;

    el.dataset.fallPrepared = '1';
    el.dataset.fallOriginal = text;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    el.classList.add('fall-text-ready');

    const words = text.split(/\s+/).filter(Boolean);
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'fall-word fall-word-wait';
      span.textContent = word;
      span.style.setProperty('--fall-i', i);
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode('\u00a0'));
    });
  }

  function playFallText(el, baseDelay = 0) {
    if (!el || el.dataset.fallPlayed) return;
    el.dataset.fallPlayed = '1';

    el.querySelectorAll('.fall-word-wait, .fall-word').forEach((span) => {
      const i = Number(span.style.getPropertyValue('--fall-i')) || 0;
      span.classList.remove('fall-word-wait');
      span.classList.add('fall-word');
      span.style.animationDelay = `${baseDelay + i * 0.14}s`;
    });
  }

  function initFallTexts() {
    const elements = collectTargets();
    elements.forEach(prepareFallText);

    const hero = document.getElementById('landingTitle');
    const heroSub = document.getElementById('landingSub');
    const regTitle = document.getElementById('registerTitle');
    const loginTitle = document.getElementById('loginTitle');
    const cabinetWelcome = document.getElementById('cabinetWelcomeFall');
    const adminTitle = document.querySelector('.admin-head h1');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (hero) playFallText(hero, 0.05);
        if (heroSub) playFallText(heroSub, 0.5);
        if (regTitle) playFallText(regTitle, 0.1);
        if (loginTitle) playFallText(loginTitle, 0.1);
        if (cabinetWelcome) playFallText(cabinetWelcome, 0.12);
        if (adminTitle && adminTitle.classList.contains('fall-text-ready')) playFallText(adminTitle, 0.08);
      });
    });

    const instant = new Set([hero, heroSub, regTitle, loginTitle, cabinetWelcome, adminTitle].filter(Boolean));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          playFallText(e.target, 0.06);
          observer.unobserve(e.target);
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px 0px 0px' }
    );

    elements.forEach((el) => {
      if (!instant.has(el)) observer.observe(el);
    });
  }

  function initBadges() {
    document.querySelectorAll('[data-fall-badge]').forEach((el, i) => {
      el.style.animationDelay = `${0.2 + i * 0.1}s`;
      el.classList.add('is-visible');
    });

    const cta = document.querySelector('.landing-cta');
    if (cta) setTimeout(() => cta.classList.add('is-visible'), 350);
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    document.querySelectorAll('.landing-reveal, .panel-reveal').forEach((el) => observer.observe(el));
  }

  function initNavSpy() {
    const links = [...document.querySelectorAll('.landing-header .header-nav a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;

    const onScroll = () => {
      const y = window.scrollY + 120;
      let current = sections[0];
      for (const sec of sections) {
        if (sec.offsetTop <= y) current = sec;
      }
      links.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === `#${current.id}`);
      });
      document.getElementById('siteHeader')?.classList.toggle('is-solid', window.scrollY > 24);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function boot() {
    initFallTexts();
    initBadges();
    initReveal();
    initNavSpy();
  }

  window.PunchFallText = { refresh: boot };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
