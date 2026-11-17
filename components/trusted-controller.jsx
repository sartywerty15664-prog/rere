'use client';

import { useEffect } from 'react';

export function TrustedController() {
  useEffect(() => {
    const root = document.querySelector('[data-trusted-strip]');
    if (!root) return undefined;
    const sets = [...root.querySelectorAll('[data-trusted-set]')];
    let index = 0;
    let transitioning = false;
    let frame = null;
    let transitionTimer = null;

    function next() {
      if (transitioning) return;
      transitioning = true;
      const current = sets[index];
      const nextIndex = (index + 1) % sets.length;
      const incoming = sets[nextIndex];
      incoming.hidden = false;
      incoming.classList.add('is-entering');
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          current.classList.add('is-exiting');
          incoming.classList.remove('is-entering');
        });
      });
      transitionTimer = window.setTimeout(() => {
        current.hidden = true;
        current.classList.remove('is-exiting');
        incoming.classList.remove('is-entering');
        index = nextIndex;
        transitioning = false;
      }, 650);
    }

    const timer = sets.length > 1 ? window.setInterval(next, 4000) : null;
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(transitionTimer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
