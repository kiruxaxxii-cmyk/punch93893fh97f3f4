'use client';

import { motion } from 'framer-motion';

export default function AnimeHeroBanner() {
  return (
    <div className="absolute inset-x-0 top-0 h-screen overflow-hidden">
      {/* Anime landscape background image - native img for maximum quality */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <img
          src="/anime-banner.png"
          alt="Anime landscape"
          className="h-full w-full object-cover object-top"
          loading="eager"
        />
      </motion.div>
    </div>
  );
}
