import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function startAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9 });
  const updateScroll = () => ScrollTrigger.update();
  const tick = (time) => lenis.raf(time * 1000);
  lenis.on('scroll', updateScroll);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  const controller = new AbortController();
  const { signal } = controller;

  const context = gsap.context(() => {
    const title = document.querySelector('[data-hero-title]');
    if (title) {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro.from(title, { y: 55, opacity: 0, clipPath: 'inset(0 0 100% 0)', duration: 1.1 })
        .from('[data-hero-copy]', { y: 22, opacity: 0, duration: 0.8 }, '-=0.65')
        .from('.hero-actions, .hero-capabilities', { y: 12, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.45')
        .from('[data-hero-terminal]', { y: 45, opacity: 0, duration: 0.9 }, '-=0.3')
        .from('.terminal-line', { x: -8, opacity: 0, duration: 0.35, stagger: 0.12 }, '-=0.35')
        .from('.hero-orbit', { opacity: 0, scale: 0.8, duration: 1.4 }, 0);
    }
    ScrollTrigger.batch('[data-reveal]:not(.home-product)', {
      start: 'top 88%', once: true,
      onEnter: (elements) => gsap.fromTo(elements, { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true }),
    });
    const orb = document.querySelector('.mock-orb');
    const consoleBars = document.querySelectorAll('.mock-console i');
    if (orb) gsap.to(orb, { rotation: 360, duration: 24, ease: 'none', repeat: -1 });
    if (consoleBars.length) gsap.to(consoleBars, { scaleY: () => gsap.utils.random(0.45, 1), transformOrigin: 'bottom', duration: 1.6, stagger: 0.15, repeat: -1, yoyo: true, repeatRefresh: true, ease: 'sine.inOut' });
    document.querySelectorAll('.button').forEach((button) => {
      button.addEventListener('mousemove', (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * 0.12, y: (event.clientY - rect.top - rect.height / 2) * 0.12, duration: 0.25 });
      }, { signal });
      button.addEventListener('mouseleave', () => gsap.to(button, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }), { signal });
    });
  });

  return () => {
    controller.abort();
    context.revert();
    lenis.off('scroll', updateScroll);
    lenis.destroy();
    gsap.ticker.remove(tick);
  };
}
