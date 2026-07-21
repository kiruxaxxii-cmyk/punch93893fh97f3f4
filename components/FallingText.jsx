'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';

export default function FallingText({
  text = '',
  as = 'span',
  className = '',
  delay = 0,
}) {
  const words = String(text).split(' ');

  const MotionTag = motion[as] || motion.span;

  return (
    <MotionTag className={className} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: delay + i * 0.12,
            }}
            aria-hidden="true"
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </MotionTag>
  );
}
