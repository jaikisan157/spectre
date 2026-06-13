import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/* ═══════════════════════════════════════════════════════════════════
   8 unique ghost SVG variants — all at 200×200 viewBox.
   Uses CSS vars for theme-aware colors.
   ═══════════════════════════════════════════════════════════════════ */

// Theme-aware ghost colors — dark mode gets neon, light mode gets deeper tones
const DARK_COLORS = [
  'rgba(0,255,200,0.75)', 'rgba(120,255,200,0.65)', 'rgba(0,200,255,0.65)',
  'rgba(180,255,220,0.6)', 'rgba(100,255,255,0.65)', 'rgba(0,255,180,0.7)',
  'rgba(150,255,200,0.55)', 'rgba(80,220,255,0.65)',
];
const LIGHT_COLORS = [
  'rgba(8,145,178,0.55)', 'rgba(5,150,105,0.5)', 'rgba(14,116,144,0.5)',
  'rgba(6,182,212,0.45)', 'rgba(20,184,166,0.5)', 'rgba(4,120,87,0.5)',
  'rgba(8,145,178,0.4)', 'rgba(2,132,199,0.5)',
];

function Ghost0({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M40 96 C40 36,160 36,160 96 V156 C160 168,146 168,138 158 C130 148,114 148,106 158 C98 168,82 168,74 158 C66 148,50 148,42 158 C34 168,40 156,40 156 Z" fill={color} />
      <circle cx="76" cy="84" r="10" fill="#000" /><circle cx="124" cy="84" r="10" fill="#000" />
      <circle cx="80" cy="80" r="3" fill="#fff" /><circle cx="128" cy="80" r="3" fill="#fff" />
      <path d="M84 116 Q100 128,116 116" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Ghost1({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M40 100 C40 40,160 40,160 100 V156 C160 168,146 168,138 158 C130 148,114 148,106 158 C98 168,82 168,74 158 C66 148,50 148,42 158 C34 168,40 156,40 156 Z" fill={color} />
      <polygon points="56,80 96,80 92,104 60,100" fill="#000" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <polygon points="104,80 144,80 140,100 108,104" fill="#000" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <rect x="94" y="84" width="12" height="5" fill="#000" rx="1" />
      <path d="M90 124 Q100 128,110 124" stroke="#000" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Ghost2({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M44 100 C44 44,156 44,156 100 V152 C156 164,144 164,136 156 C128 148,116 148,108 156 C100 164,88 164,80 156 C72 148,56 148,48 156 C40 164,44 152,44 152 Z" fill={color} />
      <path d="M66 88 Q76 80,86 88" stroke="#000" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M114 88 Q124 80,134 88" stroke="#000" strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="100" cy="116" rx="8" ry="6" fill="#000" />
      <text x="140" y="56" fontSize="18" fontWeight="bold" fill={color} opacity="0.7">z</text>
      <text x="152" y="40" fontSize="14" fontWeight="bold" fill={color} opacity="0.5">z</text>
    </svg>
  );
}

function Ghost3({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M36 96 C36 32,164 32,164 96 V160 C164 172,148 172,140 160 C132 148,116 148,108 160 C100 172,84 172,76 160 C68 148,52 148,44 160 C36 172,36 160,36 160 Z" fill={color} />
      <circle cx="76" cy="84" r="10" fill="#000" /><circle cx="80" cy="80" r="3" fill="#fff" />
      <path d="M116 84 Q126 76,136 84" stroke="#000" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M80 120 Q100 136,120 120" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Ghost4({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M40 92 C40 28,160 28,160 92 V156 C160 168,146 168,138 158 C130 148,114 148,106 158 C98 168,82 168,74 158 C66 148,50 148,42 158 C34 168,40 156,40 156 Z" fill={color} />
      <circle cx="74" cy="80" r="12" fill="#000" /><circle cx="126" cy="80" r="12" fill="#000" />
      <circle cx="78" cy="76" r="4" fill="#fff" /><circle cx="130" cy="76" r="4" fill="#fff" />
      <ellipse cx="100" cy="120" rx="10" ry="12" fill="#000" />
    </svg>
  );
}

function Ghost5({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M60 36 L68 60" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M140 36 L132 60" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M44 100 C44 48,156 48,156 100 V152 C156 164,144 164,136 156 C128 148,116 148,108 156 C100 164,88 164,80 156 C72 148,56 148,48 156 C40 164,44 152,44 152 Z" fill={color} />
      <circle cx="76" cy="88" r="8" fill="#000" /><circle cx="124" cy="88" r="8" fill="#000" />
      <circle cx="79" cy="85" r="2.5" fill="#fff" /><circle cx="127" cy="85" r="2.5" fill="#fff" />
      <path d="M80 120 L100 112 L120 120" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ghost6({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M48 100 C48 44,152 44,152 100 V152 C152 164,140 164,132 156 C124 148,112 148,104 156 C96 164,84 164,76 156 C68 148,56 148,52 156 C44 164,48 152,48 152 Z" fill={color} />
      <circle cx="80" cy="88" r="8" fill="#000" /><circle cx="120" cy="88" r="8" fill="#000" />
      <circle cx="83" cy="85" r="2.5" fill="#fff" /><circle cx="123" cy="85" r="2.5" fill="#fff" />
      <ellipse cx="64" cy="104" rx="10" ry="6" fill="rgba(255,100,100,0.4)" />
      <ellipse cx="136" cy="104" rx="10" ry="6" fill="rgba(255,100,100,0.4)" />
      <path d="M88 120 Q100 126,112 120" stroke="#000" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Ghost7({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible' }}>
      <path d="M40 96 C40 36,160 36,160 96 V156 C160 168,146 168,138 158 C130 148,114 148,106 158 C98 168,82 168,74 158 C66 148,50 148,42 158 C34 168,40 156,40 156 Z" fill={color} />
      <circle cx="74" cy="84" r="10" fill="#000" /><circle cx="126" cy="84" r="10" fill="#000" />
      <circle cx="78" cy="80" r="3" fill="#fff" /><circle cx="130" cy="80" r="3" fill="#fff" />
      <path d="M84 116 Q100 126,116 116" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="128" rx="8" ry="10" fill="#ff6b8a" />
    </svg>
  );
}

const GHOST_COMPONENTS = [Ghost0, Ghost1, Ghost2, Ghost3, Ghost4, Ghost5, Ghost6, Ghost7];

interface GhostData {
  id: number;
  variant: number;
  colorDark: string;
  colorLight: string;
  size: number;
  // Movement properties
  x: number;
  y: number;
  baseSpeedX: number;
  baseSpeedY: number;
  // Sine-wave modulation for organic motion
  sineAmpX: number;
  sineAmpY: number;
  sineFreqX: number;
  sineFreqY: number;
  sinePhaseX: number;
  sinePhaseY: number;
  opacity: number;
  bobDuration: number;
}

export interface FloatingGhostsHandle {
  triggerPick: (onComplete: () => void) => void;
}

interface FloatingGhostsProps {
  handleRef: React.MutableRefObject<FloatingGhostsHandle | null>;
  isDark: boolean;
}

export function FloatingGhosts({ handleRef, isDark }: FloatingGhostsProps) {
  const [ghostData, setGhostData] = useState<GhostData[]>([]);
  const animFrameRef = useRef<number>(0);
  const positionsRef = useRef<{ x: number; y: number }[]>([]);
  const ghostDataRef = useRef<GhostData[]>([]);
  const isPickedRef = useRef(false);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // Track mouse for cursor avoidance
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 };
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Generate ghosts
  useEffect(() => {
    const count = 16;
    const data: GhostData[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.3; // much faster across the screen

      data.push({
        id: i,
        variant: Math.floor(Math.random() * GHOST_COMPONENTS.length),
        colorDark: DARK_COLORS[Math.floor(Math.random() * DARK_COLORS.length)],
        colorLight: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)],
        size: 48 + Math.floor(Math.random() * 48), // 48–96px
        x, y,
        baseSpeedX: Math.cos(angle) * speed,
        baseSpeedY: Math.sin(angle) * speed,
        // Sine wave params for curvy organic motion
        sineAmpX: 0.15 + Math.random() * 0.35,
        sineAmpY: 0.15 + Math.random() * 0.35,
        sineFreqX: 0.005 + Math.random() * 0.015,
        sineFreqY: 0.005 + Math.random() * 0.015,
        sinePhaseX: Math.random() * Math.PI * 2,
        sinePhaseY: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.2,
        bobDuration: 3 + Math.random() * 2.5,
      });
    }
    ghostDataRef.current = data;
    positionsRef.current = data.map(d => ({ x: d.x, y: d.y }));
    isPickedRef.current = false;
    timeRef.current = 0;
    setGhostData(data);
  }, []);

  // Movement loop — sine-wave paths + cursor avoidance
  useEffect(() => {
    if (ghostData.length === 0) return;
    let running = true;
    let prevTime = performance.now();

    const tick = (now: number) => {
      if (!running || isPickedRef.current) return;
      const dt = Math.min(now - prevTime, 50); // cap delta
      prevTime = now;
      timeRef.current += dt;
      const t = timeRef.current;

      const positions = positionsRef.current;
      const ghosts = ghostDataRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        // Base movement + sine-wave modulation for curvy paths
        const sineX = g.sineAmpX * Math.sin(t * g.sineFreqX + g.sinePhaseX);
        const sineY = g.sineAmpY * Math.cos(t * g.sineFreqY + g.sinePhaseY);

        positions[i].x += (g.baseSpeedX + sineX) * (dt / 16);
        positions[i].y += (g.baseSpeedY + sineY) * (dt / 16);

        // Cursor avoidance — gentle push away
        const dx = positions[i].x - mx;
        const dy = positions[i].y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12 && dist > 0.1) {
          const push = (12 - dist) * 0.03;
          positions[i].x += (dx / dist) * push;
          positions[i].y += (dy / dist) * push;
        }

        // Wrap edges
        if (positions[i].x > 108) positions[i].x = -8;
        if (positions[i].x < -10) positions[i].x = 108;
        if (positions[i].y > 108) positions[i].y = -8;
        if (positions[i].y < -10) positions[i].y = 108;

        const el = document.getElementById(`fg-${i}`);
        if (el) {
          el.style.left = `${positions[i].x}%`;
          el.style.top = `${positions[i].y}%`;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [ghostData]);

  // Pick handler
  useEffect(() => {
    handleRef.current = {
      triggerPick: (onComplete: () => void) => {
        isPickedRef.current = true;
        cancelAnimationFrame(animFrameRef.current);

        const ghosts = ghostDataRef.current;
        if (ghosts.length === 0) { onComplete(); return; }

        const pickedIdx = Math.floor(Math.random() * ghosts.length);
        const pickedEl = document.getElementById(`fg-${pickedIdx}`);

        const tl = gsap.timeline({ onComplete });

        // Phase 1: Fade out UI text + other ghosts (0–0.5s)
        tl.to(['.hero-content-left', '.interest-section', 'header'], {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
        }, 0);

        const otherIds = ghosts
          .filter((_, i) => i !== pickedIdx)
          .map(g => `#fg-${g.id}`);

        if (otherIds.length > 0) {
          tl.to(otherIds, {
            opacity: 0,
            scale: 0.3,
            duration: 0.6,
            stagger: 0.015,
            ease: 'power2.in',
          }, 0);
        }

        // Phase 2: Picked ghost glides smoothly to center (0.1–0.9s)
        if (pickedEl) {
          const rect = pickedEl.getBoundingClientRect();
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          const ex = rect.left + rect.width / 2;
          const ey = rect.top + rect.height / 2;

          // Boost opacity and glide to center
          tl.to(pickedEl, {
            x: cx - ex,
            y: cy - ey,
            scale: 2.5,
            opacity: 0.85,
            duration: 0.8,
            ease: 'power2.inOut',
          }, 0.1);

          // Phase 3: Hold at center — brief glow flare (0.9–1.3s)
          tl.to(pickedEl, {
            scale: 2.8,
            opacity: 1,
            duration: 0.4,
            ease: 'sine.inOut',
          });

          // Phase 4: Gentle dissolve outward (1.3–1.8s)
          tl.to(pickedEl, {
            scale: 4,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          });
        }
      },
    };
  }, [handleRef]);



  return (
    <>
      <style>{`
        @keyframes ghost-bob-a {
          0%, 100% { transform: translate(-50%,-50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%,-52%) rotate(-1.5deg) scale(1.02); }
        }
        @keyframes ghost-bob-b {
          0%, 100% { transform: translate(-50%,-50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%,-48%) rotate(2deg) scale(0.98); }
        }
        @keyframes ghost-bob-c {
          0%, 100% { transform: translate(-50%,-50%) rotate(0deg) scale(1); }
          33% { transform: translate(-50%,-53%) rotate(-1deg) scale(1.01); }
          66% { transform: translate(-50%,-48%) rotate(1.5deg) scale(0.99); }
        }
        @keyframes ghost-bob-d {
          0%, 100% { transform: translate(-50%,-50%) rotate(0deg) scale(1); }
          40% { transform: translate(-50%,-52%) rotate(1deg) scale(1.015); }
          80% { transform: translate(-50%,-49%) rotate(-1deg) scale(0.99); }
        }
        @keyframes ghost-glow {
          0%, 100% { filter: drop-shadow(0 0 6px var(--gc)) drop-shadow(0 0 2px var(--gc)); }
          50% { filter: drop-shadow(0 0 16px var(--gc)) drop-shadow(0 0 5px var(--gc)); }
        }
        .floating-ghost-el {
          transition: opacity 0.3s ease;
        }
        .floating-ghost-el:hover {
          opacity: 0.6 !important;
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {ghostData.map((g) => {
          const GhostSvg = GHOST_COMPONENTS[g.variant];
          const color = isDark ? g.colorDark : g.colorLight;
          const bobAnim = ['ghost-bob-a', 'ghost-bob-b', 'ghost-bob-c', 'ghost-bob-d'][g.variant % 4];
          return (
            <div
              key={g.id}
              id={`fg-${g.id}`}
              className="absolute pointer-events-auto select-none floating-ghost-el"
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                opacity: g.opacity,
                animation: `${bobAnim} ${g.bobDuration}s ease-in-out infinite, ghost-glow ${g.bobDuration * 1.4}s ease-in-out infinite`,
                willChange: 'left, top, transform, filter',
                ['--gc' as string]: color,
                cursor: 'default',
              }}
            >
              <GhostSvg color={color} size={g.size} />
            </div>
          );
        })}
      </div>
    </>
  );
}
