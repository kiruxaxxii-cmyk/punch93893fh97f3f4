'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function TiltCard({ children, className = '', strength = 13 }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, hovering: false });

  function onMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (py - 0.5) * -strength,
      ry: (px - 0.5) * strength,
      hovering: true,
    });
  }

  function onMouseLeave() {
    setTilt({ rx: 0, ry: 0, hovering: false });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry, scale: tilt.hovering ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      className={`spotlight-card relative ${className}`}
    >
      <div style={{ transform: 'translateZ(40px)', transformStyle: 'preserve-3d' }}>{children}</div>

      {/* moving glow driven by SpotlightGrid proximity vars */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(168,85,247, calc(var(--glow-intensity, 0) * 0.22)), transparent calc(var(--glow-radius, 320px) * 0.6))',
        }}
      />
      {/* border + outer glow that intensifies near the cursor */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(168,85,247, calc(var(--glow-intensity, 0) * 0.5)), 0 0 calc(var(--glow-intensity, 0) * 32px) rgba(168,85,247, calc(var(--glow-intensity, 0) * 0.28))',
        }}
      />
    </motion.div>
  );
}
