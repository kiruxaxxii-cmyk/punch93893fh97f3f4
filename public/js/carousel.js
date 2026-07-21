function initCarousel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const dots = [...carousel.querySelectorAll('.carousel-dot')];
  const prev = carousel.querySelector('.carousel-prev');
  const next = carousel.querySelector('.carousel-next');
  let current = 0;
  let busy = false;

  function goTo(index) {
    if (busy || index === current) return;
    busy = true;
    carousel.classList.add('is-transitioning');

    const out = slides[current];
    const inn = slides[index];

    out.classList.remove('active');
    out.classList.add('leaving');

    inn.classList.add('entering');

    requestAnimationFrame(() => {
      inn.classList.add('active');
    });

    dots[current]?.classList.remove('active');
    dots[index]?.classList.add('active');
    current = index;

    setTimeout(() => {
      out.classList.remove('leaving');
      inn.classList.remove('entering');
      carousel.classList.remove('is-transitioning');
      busy = false;
    }, 650);
  }

  function step(dir) {
    goTo((current + dir + slides.length) % slides.length);
  }

  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
  });

  let touchX = 0;
  carousel.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!carousel.matches(':hover') && document.activeElement?.closest('#gallery') == null) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}

initCarousel();
