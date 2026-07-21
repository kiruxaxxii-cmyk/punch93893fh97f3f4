'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  { src: '/images/hero-bg.png', caption: 'Атмосфера' },
  { src: '/images/gui-menu.png', caption: 'Меню модулей' },
  { src: '/images/hud-overlay.png', caption: 'HUD в игре' },
];

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const prev = () => {
    setDir(-1);
    setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  };
  const next = () => {
    setDir(1);
    setIndex((i) => (i + 1) % SLIDES.length);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl glass">
        <div className="relative aspect-[16/9] w-full">
          <AnimatePresence custom={dir} initial={false} mode="popLayout">
            <motion.img
              key={index}
              src={SLIDES[index].src}
              alt={SLIDES[index].caption}
              draggable={false}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
          </AnimatePresence>
          <button
            type="button"
            onClick={prev}
            aria-label="Назад"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Вперёд"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-black/50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 6l6 6-6 6" />
            </svg>
          </button>
          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1 text-sm text-white backdrop-blur-md">
            {SLIDES[index].caption}
          </span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.caption}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            aria-label={`Слайд ${i + 1}`}
            className={`h-2 w-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-punch-accent' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
