'use client';

import { useEffect } from 'react';

// The one client component on the public site. Fades sections in as they
// scroll into view by toggling a class — no animation library, no per-frame
// work, and the observer disconnects once everything has been revealed.
//
// Elements opt in with `data-reveal`; `--i` on the element staggers siblings.
// Two ways out of the animation, both handled in globals.css:
//   - no JS at all → the <noscript> block in landing-page.tsx unhides them
//   - prefers-reduced-motion → the transition is dropped entirely
export function RevealOnScroll() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    // Reduced motion: reveal everything at once and skip the observer.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    let remaining = targets.length;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
          remaining -= 1;
        }
        if (remaining <= 0) observer.disconnect();
      },
      // Fire a little before the element is fully on screen, so the motion
      // reads as "already arriving" rather than starting under the fold.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
