'use client';

import { useRef, useEffect } from 'react';

export default function SpotlightGrid({ children, className = '', radius = 340, glow = '168, 85, 247' }) {
  const ref = useRef(null);
  const spotRef = useRef(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const spot = spotRef.current;
    let raf = 0;
    let cx = 0;
    let cy = 0;
    let inside = false;

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const update = () => {
      raf = 0;
      const r = grid.getBoundingClientRect();
      if (spot) {
        if (inside) {
          spot.style.opacity = '1';
          spot.style.transform = `translate(calc(${cx - r.left}px - 50%), calc(${cy - r.top}px - 50%))`;
        } else {
          spot.style.opacity = '0';
        }
      }
      const cards = grid.querySelectorAll('.spotlight-card');
      cards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const gx = ((cx - cr.left) / cr.width) * 100;
        const gy = ((cy - cr.top) / cr.height) * 100;
        const ccx = cr.left + cr.width / 2;
        const ccy = cr.top + cr.height / 2;
        const dist = Math.max(0, Math.hypot(cx - ccx, cy - ccy) - Math.max(cr.width, cr.height) / 2);
        const intensity = inside && dist <= radius ? 1 - dist / radius : 0;
        card.style.setProperty('--glow-x', `${gx}%`);
        card.style.setProperty('--glow-y', `${gy}%`);
        card.style.setProperty('--glow-intensity', intensity.toFixed(3));
        card.style.setProperty('--glow-radius', `${radius}px`);
      });
    };

    const onMove = (e) => {
      cx = e.clientX;
      cy = e.clientY;
      const r = grid.getBoundingClientRect();
      inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      schedule();
    };
    const onLeave = () => {
      inside = false;
      schedule();
    };

    grid.addEventListener('mousemove', onMove);
    grid.addEventListener('mouseleave', onLeave);
    return () => {
      grid.removeEventListener('mousemove', onMove);
      grid.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [radius]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        ref={spotRef}
        className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] rounded-full opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, rgba(${glow}, 0.10) 0%, rgba(${glow}, 0.05) 18%, rgba(${glow}, 0.02) 35%, transparent 60%)`,
          mixBlendMode: 'screen',
        }}
      />
      {children}
    </div>
  );
}
