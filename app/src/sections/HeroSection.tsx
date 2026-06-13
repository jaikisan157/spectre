import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Sun, Moon } from 'lucide-react';
import type { InterestStat, AuthUser } from '@/types/chat';
import { GhostIcon } from '../components/GhostIcon';
import spectreGhost from '../spectre_ghost.png';

interface HeroSectionProps {
  onStartChat: (interests: string[], gender?: string, preferredGender?: string) => void;
  onlineCount: number;
  isDark: boolean;
  toggleTheme: () => void;
  interestStats: InterestStat[];
  user: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenPremium: () => void;
}

export function HeroSection({
  onStartChat,
  onlineCount,
  isDark,
  toggleTheme,
  interestStats,
  user,
  onOpenAuth,
  onLogout,
  onOpenPremium
}: HeroSectionProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'any'>('any');
  const [preferredGender, setPreferredGender] = useState<'male' | 'female' | 'any'>('any');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 5 ? [...prev, interest] : prev
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < 5) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setCustomInput('');
    }
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        onStartChat(selectedInterests, gender, preferredGender);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartChat, selectedInterests, gender, preferredGender]);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col"
      style={{ background: 'var(--dark-bg)' }}
    >
      {/* Fixed-height top nav bar */}
      <header className="flex items-center justify-between px-5 h-14 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2.5 select-none no-select">
          <GhostIcon size={32} className="text-text-primary" />
          <span className="font-heading font-semibold text-base text-text-primary tracking-tight">
            Spectre
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Premium button */}
          {user && (
            user.isPremium ? (
              <span className="font-mono text-[10px] text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2.5 py-1 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(0,255,200,0.1)]">
                💎 Premium
              </span>
            ) : (
              <button
                onClick={onOpenPremium}
                className="font-mono text-[10px] text-neon-cyan hover:bg-neon-cyan/10 border border-neon-cyan/30 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
              >
                💎 Get Premium
              </button>
            )
          )}

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
              <span className={`font-mono text-xs ${user.isPremium ? 'text-neon-cyan font-bold' : 'text-text-primary'}`}>
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
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-6 pb-4 flex flex-col md:flex-row md:items-center md:gap-[4vw] md:min-h-[calc(100vh-56px)]">

          {/* Left column: headline + CTA */}
          <div className="flex-shrink-0 md:max-w-[45%]">
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
                <div className="headline-line text-text-primary">STRANGERS</div>
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
              onClick={() => onStartChat(selectedInterests, gender, preferredGender)}
              className="w-full md:w-auto bg-text-primary text-black font-heading font-semibold text-base px-8 py-3.5 rounded-lg mb-2 hover:bg-text-secondary transition-all"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 font-mono text-xs text-text-primary placeholder:text-text-secondary/40 focus:border-neon-cyan/50 focus:outline-none transition-colors"
                style={{ fontSize: '16px' /* prevent iOS zoom */ }}
              />
              {customInput.trim() && (
                <button
                  onClick={addCustomInterest}
                  className="px-4 py-2 rounded-full font-mono text-xs bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/30 active:bg-neon-cyan/40 transition-colors"
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
                    className="px-3 py-1.5 rounded-full font-mono text-xs transition-all border bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_8px_rgba(0,255,200,0.15)] active:scale-95"
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
                    className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border active:scale-95 ${isSelected
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

            {/* Gender Filters */}
            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-[10px] text-text-secondary/60 uppercase tracking-wider">
                  Gender Matchmaking Filters
                </h3>
                {!user?.isPremium && (
                  <button
                    onClick={onOpenPremium}
                    className="text-neon-cyan hover:underline font-mono text-[9px] flex items-center gap-1 uppercase tracking-tight font-semibold"
                  >
                    🔒 Unlock with Premium
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* My Gender */}
                <div>
                  <label className="block font-mono text-[9px] text-text-secondary/40 mb-1.5 uppercase">I am:</label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 relative">
                    {!user?.isPremium && (
                      <div
                        onClick={onOpenPremium}
                        className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] rounded-lg cursor-pointer flex items-center justify-center font-mono text-[8px] text-neon-cyan font-bold tracking-tight hover:bg-black/35 transition-all"
                      >
                        PREMIUM ONLY
                      </div>
                    )}
                    {(['male', 'female', 'any'] as const).map(g => (
                      <button
                        key={g}
                        disabled={!user?.isPremium}
                        onClick={() => setGender(g)}
                        className={`flex-1 py-1 rounded-md font-mono text-[10px] capitalize transition-all ${
                          gender === g
                            ? 'bg-neon-cyan text-black font-bold shadow-[0_0_8px_rgba(0,255,200,0.25)]'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match with */}
                <div>
                  <label className="block font-mono text-[9px] text-text-secondary/40 mb-1.5 uppercase">Match with:</label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 relative">
                    {!user?.isPremium && (
                      <div
                        onClick={onOpenPremium}
                        className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] rounded-lg cursor-pointer flex items-center justify-center font-mono text-[8px] text-neon-cyan font-bold tracking-tight hover:bg-black/35 transition-all"
                      >
                        PREMIUM ONLY
                      </div>
                    )}
                    {(['male', 'female', 'any'] as const).map(pg => (
                      <button
                        key={pg}
                        disabled={!user?.isPremium}
                        onClick={() => setPreferredGender(pg)}
                        className={`flex-1 py-1 rounded-md font-mono text-[10px] capitalize transition-all ${
                          preferredGender === pg
                            ? 'bg-neon-cyan text-black font-bold shadow-[0_0_8px_rgba(0,255,200,0.25)]'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Online Counter — always visible at bottom */}
      <div className="flex items-center gap-4 px-5 pb-4 pt-2 shrink-0">
        {onlineCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <span className="font-mono text-[10px] text-neon-cyan">
              {onlineCount.toLocaleString()} online
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="font-mono text-[10px] text-text-secondary">
            Live server connected
          </span>
        </div>
      </div>
    </div>
  );
}
