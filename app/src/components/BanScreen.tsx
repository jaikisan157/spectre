import { useState } from 'react';
import { ShieldOff, LogOut, CreditCard } from 'lucide-react';

interface BanScreenProps {
  banReason?: string | null;
  onUnban: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
}

export function BanScreen({ banReason, onUnban, onLogout }: BanScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnban = async () => {
    setLoading(true);
    setError('');
    const result = await onUnban();
    if (!result.success) {
      setError(result.error || 'Payment failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-4" style={{ background: '#0a0000' }}>
      {/* Red vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(180, 0, 0, 0.15) 100%)',
      }} />

      <div className="relative z-10 text-center max-w-md">
        {/* Ban Icon */}
        <div className="ban-icon-pulse mx-auto w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-red-400 mb-3">
          Account Banned
        </h1>

        {/* Reason */}
        <p className="font-mono text-sm text-text-secondary mb-2">
          Your account has been permanently banned.
        </p>
        {banReason && (
          <p className="font-mono text-xs text-red-400/60 mb-6 px-4 py-2 rounded-lg bg-red-500/5 border border-red-500/10 inline-block">
            Reason: {banReason}
          </p>
        )}

        {/* Unban Card */}
        <div className="bg-dark-card border border-white/10 rounded-xl p-6 mb-4 text-left">
          <h3 className="font-heading font-semibold text-text-primary text-base mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-neon-cyan" />
            Appeal Your Ban
          </h3>
          <p className="font-mono text-xs text-text-secondary mb-4">
            Pay a one-time fee of <span className="text-neon-cyan font-semibold">$9.99</span> to restore your account.
            Further violations will result in another ban.
          </p>

          {error && (
            <p className="font-mono text-xs text-red-400 mb-3">{error}</p>
          )}

          <button
            onClick={handleUnban}
            disabled={loading}
            className="w-full bg-neon-cyan text-black font-heading font-semibold text-sm py-3 rounded-lg btn-neon neon-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full loading-spinner" />
                Processing...
              </span>
            ) : (
              'Pay $9.99 to Unban'
            )}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 mx-auto text-text-secondary/50 hover:text-text-secondary transition-colors font-mono text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
