import { useEffect, useRef } from 'react';

export default function HeroAuroraBackground() {
  const blob1Ref = useRef(null);
  const blob2Ref = useRef(null);
  const blob3Ref = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const blobs = [
      { ref: blob1Ref, state: { x: 0, y: 0, vx: 0.8, vy: 0.5, scale: 1, vs: 0.002 } },
      { ref: blob2Ref, state: { x: 0, y: 0, vx: -0.6, vy: 0.7, scale: 1, vs: -0.0015 } },
      { ref: blob3Ref, state: { x: 0, y: 0, vx: 0.5, vy: -0.6, scale: 1, vs: 0.0018 } },
    ];

    const bounds = { x: 120, y: 80 };

    function animate() {
      blobs.forEach(({ ref, state }) => {
        if (!ref.current) return;
        state.x += state.vx;
        state.y += state.vy;
        state.scale += state.vs;
        if (Math.abs(state.x) > bounds.x) state.vx *= -1;
        if (Math.abs(state.y) > bounds.y) state.vy *= -1;
        if (state.scale > 1.15 || state.scale < 0.88) state.vs *= -1;
        ref.current.style.transform =
          `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
      });
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const baseStyle = {
    position: 'absolute', borderRadius: '50%', filter: 'blur(52px)',
    willChange: 'transform', pointerEvents: 'none',
  };

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0 }}>
      <div ref={blob1Ref} style={{ ...baseStyle, width: '560px', height: '560px',
        background: 'radial-gradient(circle, rgba(27,94,58,0.65) 0%, transparent 70%)',
        top: '-140px', left: '-100px' }} />
      <div ref={blob2Ref} style={{ ...baseStyle, width: '420px', height: '420px',
        background: 'radial-gradient(circle, rgba(154,123,18,0.55) 0%, transparent 70%)',
        top: '30px', right: '-80px' }} />
      <div ref={blob3Ref} style={{ ...baseStyle, width: '480px', height: '480px',
        background: 'radial-gradient(circle, rgba(46,130,80,0.45) 0%, transparent 70%)',
        bottom: '-100px', left: '30%' }} />
    </div>
  );
}
