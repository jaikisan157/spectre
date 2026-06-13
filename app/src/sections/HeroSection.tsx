import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Sun, Moon } from 'lucide-react';
import type { InterestStat, AuthUser } from '@/types/chat';
import { GhostIcon } from '../components/GhostIcon';
import spectreGhost from '../spectre_ghost.png';

interface HeroSectionProps {
  onStartChat: (interests: string[]) => void;
  onlineCount: number;
  isDark: boolean;
  toggleTheme: () => void;
  interestStats: InterestStat[];
  user: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function HeroSection({
  onStartChat,
  onlineCount,
  isDark,
  toggleTheme,
  interestStats,
  user,
  onOpenAuth,
  onLogout
}: HeroSectionProps) {
  interface FloatingGhost {
    id: number;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    rotation: number;
  }

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [ghosts, setGhosts] = useState<FloatingGhost[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);

  const toggleInterest = (interest: string) => {
    if (isTransitioning) return;
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 5 ? [...prev, interest] : prev
    );
  };

  const addCustomInterest = () => {
    if (isTransitioning) return;
    const trimmed = customInput.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < 5) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setCustomInput('');
    }
  };

  // Generate background ghosts on mount
  useEffect(() => {
    const generatedGhosts = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: 5 + Math.random() * 90, // 5% to 95%
      y: 10 + Math.random() * 80, // 10% to 90%
      scale: 0.35 + Math.random() * 0.45, // scale between 0.35 and 0.8
      opacity: 0.05 + Math.random() * 0.12, // subtle opacity between 0.05 and 0.17
      rotation: -30 + Math.random() * 60,
    }));
    setGhosts(generatedGhosts);
  }, []);

  // Float background ghosts
  useEffect(() => {
    if (ghosts.length === 0) return;

    ghosts.forEach(g => {
      gsap.set(`#bg-ghost-${g.id}`, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        scale: g.scale,
        rotation: g.rotation,
      });

      gsap.to(`#bg-ghost-${g.id}`, {
        x: () => -25 + Math.random() * 50,
        y: () => -25 + Math.random() * 50,
        rotation: () => g.rotation - 15 + Math.random() * 30,
        duration: 4 + Math.random() * 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });
  }, [ghosts]);

  // Entrance animations for UI
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.headline-line', { opacity: 0, y: 18 });
      gsap.set(subheadRef.current, { opacity: 0, y: 14 });
      gsap.set(ctaRef.current, { opacity: 0, y: 14 });
      gsap.set(microRef.current, { opacity: 0 });
      gsap.set('.interest-section', { opacity: 0, y: 10 });

      const tl = gsap.timeline({ delay: 0.3 });
      tl.to('.headline-line', {
        opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
      })
        .to(subheadRef.current, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
        }, '-=0.3')
        .to('.interest-section', {
          opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
        }, '-=0.2')
        .to(ctaRef.current, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
        }, '-=0.2')
        .to(microRef.current, {
          opacity: 1, duration: 0.5,
        }, '-=0.2');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleStartClick = useCallback(() => {
    if (isTransitioning) return;
    if (ghosts.length === 0) {
      onStartChat(selectedInterests);
      return;
    }

    setIsTransitioning(true);
    const selectedIdx = Math.floor(Math.random() * ghosts.length);
    const selectedGhost = ghosts[selectedIdx];

    // Kill all ongoing float animations
    gsap.killTweensOf('.bg-ghost-element');

    const tl = gsap.timeline({
      onComplete: () => {
        onStartChat(selectedInterests);
      }
    });

    // Fade out UI columns, header, and other ghosts
    tl.to([
      'header',
      '.hero-content-left',
      '.interest-section',
      `.bg-ghost-element:not(#bg-ghost-${selectedGhost.id})`
    ], {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.out',
    });

    const elem = document.getElementById(`bg-ghost-${selectedGhost.id}`);
    const rect = elem?.getBoundingClientRect();
    if (rect) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const elemX = rect.left + rect.width / 2;
      const elemY = rect.top + rect.height / 2;
      const moveX = centerX - elemX;
      const moveY = centerY - elemY;

      // Make the selected ghost zoom forward into center
      tl.to(elem, {
        x: `+=${moveX}`,
        y: `+=${moveY}`,
        scale: 14,
        opacity: 1,
        rotation: 0,
        duration: 0.9,
        ease: 'power3.inOut',
      }, '-=0.5');
    } else {
      onStartChat(selectedInterests);
    }
  }, [isTransitioning, ghosts, selectedInterests, onStartChat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        handleStartClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartClick]);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--dark-bg)' }}
    >
      {/* Background Floating Ghosts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {ghosts.map((g) => (
          <div
            key={g.id}
            id={`bg-ghost-${g.id}`}
            className="bg-ghost-element absolute pointer-events-none select-none"
            style={{
              left: `${g.x}%`,
              top: `${g.y}%`,
              opacity: g.opacity,
              width: '64px',
              height: '64px',
            }}
          >
            <img
              src={spectreGhost}
              alt=""
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,255,200,0.15)]"
              draggable="false"
            />
          </div>
        ))}
      </div>

      {/* Fixed-height top nav bar */}
      <header className="relative z-10 flex items-center justify-between px-5 h-14 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2.5 select-none no-select">
          <GhostIcon size={32} className="text-text-primary animate-pulse" />
          <span className="font-heading font-semibold text-base text-text-primary tracking-tight">
            Spectre
          </span>
          <span className="font-mono text-[9px] text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,200,0.1)]">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            {onlineCount.toLocaleString()} online
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/15 transition-all border border-white/10"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark
              ? <Sun className="w-4 h-4 text-text-secondary" />
              : <Moon className="w-4 h-4 text-text-secondary" />}
          </button>

          {/* Auth state */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-primary">
                {user.displayName}
              </span>
              <button
                onClick={onLogout}
                className="font-mono text-[10px] text-text-secondary hover:text-text-primary bg-white/5 px-2.5 py-1 rounded border border-white/10 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="font-mono text-[10px] bg-neon-cyan text-black px-3 py-1 rounded border border-neon-cyan font-bold transition-all hover:bg-neon-cyan/80 hover:shadow-[0_0_8px_rgba(0,255,200,0.3)]"
            >
              Sign In Anonymously
            </button>
          )}
        </div>
      </header>

      {/* Scrollable main content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="px-5 pt-6 pb-4 flex flex-col md:flex-row md:items-center md:gap-[4vw] md:min-h-[calc(100vh-56px)]">

          {/* Left column: headline + CTA */}
          <div className="hero-content-left flex-shrink-0 md:max-w-[45%]">
            <div className="headline-line flex items-center gap-3.5 mb-5 select-none no-select">
              <img
                src={spectreGhost}
                alt="Spectre Ghost Mascot"
                className="w-14 h-14 object-contain float-ghost"
              />
              <span className="font-mono text-[10px] text-text-secondary uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                Ghost Mode Active
              </span>
            </div>

            <div ref={headlineRef} className="mb-4">
              <h1
                className="font-heading font-bold uppercase tracking-tight leading-[0.92]"
                style={{ fontSize: 'clamp(42px, 10vw, 72px)' }}
              >
                <div className="headline-line text-text-primary">TALK</div>
                <div className="headline-line text-text-primary">TO</div>
                <div className="headline-line text-neon-cyan neon-text">STRANGERS</div>
              </h1>
            </div>

            <p
              ref={subheadRef}
              className="text-text-secondary text-sm max-w-sm mb-5 leading-relaxed"
            >
              Anonymous, one-on-one, no accounts. Pick your interests to find like-minded people.
            </p>

            {/* CTA Button — full width on mobile */}
            <button
              ref={ctaRef}
              onClick={handleStartClick}
              disabled={isTransitioning}
              className={`btn-neon w-full md:w-auto bg-neon-cyan text-black font-heading font-semibold text-base px-8 py-3.5 rounded-lg mb-2 neon-glow hover:shadow-neon-strong transition-all ${isTransitioning ? 'opacity-55 cursor-not-allowed' : ''}`}
            >
              {selectedInterests.length > 0 ? `Start Chat (${selectedInterests.length})` : 'Start Chat'}
            </button>

            {/* "Or press Space" — desktop only */}
            <div className="hidden md:block">
              <span ref={microRef} className="font-mono text-[10px] text-text-secondary/55">
                Or press Space
              </span>
            </div>

            {/* Explore More */}
            <button
              onClick={() => setShowMore(prev => !prev)}
              className="mt-4 font-mono text-[10px] text-text-secondary/50 hover:text-neon-cyan active:text-neon-cyan transition-colors flex items-center gap-1"
            >
              <span className={`transition-transform inline-block ${showMore ? 'rotate-90' : ''}`}>▶</span>
              {showMore ? 'Hide' : 'Explore more features'}
            </button>

            {showMore && (
              <div className="mt-2 grid grid-cols-2 gap-2 w-full max-w-[min(340px,94vw)] animate-fade-in-up">
                {[
                  { icon: '📹', name: 'Video Chat', desc: 'Face-to-face' },
                  { icon: '🎙️', name: 'Voice Rooms', desc: 'Audio only' },
                  { icon: '👥', name: 'Group Chat', desc: 'Up to 5 people' },
                  { icon: '🪪', name: 'Profile Cards', desc: 'Share your vibe' },
                  { icon: '🏆', name: 'Leaderboard', desc: 'Top chatters' },
                  { icon: '💎', name: 'Premium Filters', desc: 'Gender, location' },
                ].map(f => (
                  <div
                    key={f.name}
                    className="relative px-2.5 py-2 rounded-lg border border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed select-none"
                  >
                    <div className="font-mono text-[10px] text-text-secondary flex items-center gap-1.5">
                      <span>{f.icon}</span>
                      <span>{f.name}</span>
                    </div>
                    <div className="font-mono text-[9px] text-text-secondary/30 mt-0.5 ml-5">{f.desc}</div>
                    <div className="absolute top-1 right-1.5 font-mono text-[9px] text-text-secondary/30 bg-white/5 px-1 py-0.5 rounded">
                      🔒 Soon
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Interest picker */}
          <div className="interest-section mt-7 md:mt-0 md:max-w-[420px]">
            <p className="font-mono text-[10px] text-text-secondary/60 mb-2 uppercase tracking-wider">
              Pick or type interests · optional · max 5
            </p>
            {/* Custom interest input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addCustomInterest(); } }}
                placeholder="Type your own..."
                maxLength={20}
                disabled={isTransitioning}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 font-mono text-xs text-text-primary placeholder:text-text-secondary/40 focus:border-neon-cyan/50 focus:outline-none transition-colors disabled:opacity-50"
                style={{ fontSize: '16px' /* prevent iOS zoom */ }}
              />
              {customInput.trim() && (
                <button
                  onClick={addCustomInterest}
                  disabled={isTransitioning}
                  className="px-4 py-2 rounded-full font-mono text-xs bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/30 active:bg-neon-cyan/40 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Custom interests */}
              {selectedInterests
                .filter(i => !interestStats.some(s => s.name === i))
                .map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    disabled={isTransitioning}
                    className="px-3 py-1.5 rounded-full font-mono text-xs transition-all border bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_8px_rgba(0,255,200,0.15)] active:scale-95 disabled:opacity-50"
                  >
                    {interest} ✕
                  </button>
                ))}
              {/* Default interests */}
              {interestStats.map(interest => {
                const isSelected = selectedInterests.includes(interest.name);
                return (
                  <button
                    key={interest.name}
                    onClick={() => toggleInterest(interest.name)}
                    disabled={isTransitioning}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border active:scale-95 disabled:opacity-50 ${isSelected
                      ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_8px_rgba(0,255,200,0.15)]'
                      : 'bg-white/5 text-text-secondary border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                  >
                    {interest.name}
                    {interest.count > 0 && (
                      <span className={`ml-1 ${isSelected ? 'text-neon-cyan/70' : 'text-text-secondary/40'}`}>
                        {interest.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
