(function () {
  const SELECTOR = '.glass-block, .price-card, .dash-card';

  function resetCard(card) {
    card.classList.remove('is-hover');
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.style.setProperty('--light-x', '50%');
    card.style.setProperty('--light-y', '50%');
  }

  function initTiltCards() {
    document.querySelectorAll(SELECTOR).forEach((card) => {
      if (card.dataset.tiltReady || card.closest('.carousel')) return;
      card.dataset.tiltReady = '1';
      card.classList.add('tilt-card');

      let curX = 0;
      let curY = 0;
      let tgtX = 0;
      let tgtY = 0;
      let mx = 50;
      let my = 50;
      let hovering = false;
      let raf = null;

      function tick() {
        curX += (tgtX - curX) * (hovering ? 0.18 : 0.22);
        curY += (tgtY - curY) * (hovering ? 0.18 : 0.22);

        card.style.setProperty('--tilt-x', curY.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', curX.toFixed(2) + 'deg');
        card.style.setProperty('--light-x', mx.toFixed(1) + '%');
        card.style.setProperty('--light-y', my.toFixed(1) + '%');

        const moving = Math.abs(tgtX - curX) > 0.01 || Math.abs(tgtY - curY) > 0.01;
        if (hovering || moving) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
          resetCard(card);
        }
      }

      function startLoop() {
        if (!raf) raf = requestAnimationFrame(tick);
      }

      card.addEventListener('mouseenter', () => {
        hovering = true;
        card.classList.add('is-hover');
        startLoop();
      });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mx = (x / rect.width) * 100;
        my = (y / rect.height) * 100;
        tgtX = ((x / rect.width) - 0.5) * 12;
        tgtY = ((y / rect.height) - 0.5) * -12;
        startLoop();
      });

      card.addEventListener('mouseleave', () => {
        hovering = false;
        tgtX = 0;
        tgtY = 0;
        curX = 0;
        curY = 0;
        mx = 50;
        my = 50;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
        resetCard(card);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initTiltCards);
})();
