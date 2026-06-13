import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { GhostIcon } from '../components/GhostIcon';

interface AuthPageProps {
  onRegister: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export function AuthPage({ onRegister, onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(cardRef.current, { opacity: 0, y: 30 });
      gsap.set(titleRef.current, { opacity: 0, y: -20 });

      const tl = gsap.timeline({ delay: 0.2 });
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
        .to(cardRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    const result = mode === 'register'
      ? await onRegister(username.trim(), password)
      : await onLogin(username.trim(), password);

    if (!result.success) {
      setError(result.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--dark-bg)' }}
    >
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      <div className="vignette" />

      {/* Title */}
      <div ref={titleRef} className="flex flex-col items-center justify-center gap-3.5 mb-8 select-none no-select">
        <GhostIcon size={56} className="text-text-primary float-ghost" />
        <h1 className="font-heading font-bold text-4xl md:text-5xl text-center text-text-primary tracking-tight">
          Spectre
        </h1>
      </div>

      {/* Auth Card */}
      <div
        ref={cardRef}
        className="auth-card w-full max-w-[400px]"
      >
        {/* Mode Tabs */}
        <div className="flex mb-6 border-b border-white/10">
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 pb-3 font-mono text-sm transition-colors relative ${
              mode === 'register'
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </div>
            {mode === 'register' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-text-primary auth-tab-indicator" />
            )}
          </button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 pb-3 font-mono text-sm transition-colors relative ${
              mode === 'login'
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </div>
            {mode === 'login' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-text-primary auth-tab-indicator" />
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block font-mono text-[11px] text-text-secondary/60 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Pick a username"
              maxLength={20}
              autoComplete="username"
              className="auth-input w-full"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-mono text-[11px] text-text-secondary/60 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter your password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="auth-input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/40 hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block font-mono text-[11px] text-text-secondary/60 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Type password again"
                autoComplete="new-password"
                className="auth-input w-full"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-mono text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-text-primary text-black font-heading font-semibold text-base py-3 rounded-lg hover:bg-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full loading-spinner" />
                {mode === 'register' ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (
              mode === 'register' ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        {/* Switch mode */}
        <p className="text-center mt-5 font-mono text-xs text-text-secondary/50">
          {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={switchMode} className="text-text-primary underline hover:text-text-primary/80 transition-colors">
            {mode === 'register' ? 'Login' : 'Register'}
          </button>
        </p>

        {/* Anonymous notice */}
        <p className="text-center mt-4 font-mono text-[10px] text-text-secondary/30">
          🔒 Fully anonymous — no email, no personal info stored
        </p>
      </div>
    </div>
  );
}
