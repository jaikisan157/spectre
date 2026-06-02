import { useState } from 'react';
import { X, Sparkles, Check, CreditCard, ShieldAlert } from 'lucide-react';

interface PremiumModalProps {
  onClose: () => void;
  onSubscribe: () => Promise<{ success: boolean; error?: string }>;
}

const PREMIUM_FEATURES = [
  {
    title: 'Gender Filters',
    desc: 'Filter matches by gender (Male, Female, or Any) for targeted connections.',
    icon: '👥',
  },
  {
    title: 'Premium Styling & Badge',
    desc: 'Stand out in chat lists with a neon cyan name and a sleek premium badge.',
    icon: '💎',
  },
  {
    title: 'Skip Bans & Verification',
    desc: 'Higher reputation status reduces auto-ban likelihood and increases priority.',
    icon: '⚡',
  },
  {
    title: 'Priority Matchmaking',
    desc: 'Get matched with online members 2x faster, reducing search times.',
    icon: '🚀',
  },
];

export function PremiumModal({ onClose, onSubscribe }: PremiumModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await onSubscribe();
      if (result.success) {
        setSuccess(true);
        // Auto-close success screen after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Checkout session initiation failed.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
        <div className="bg-dark-card border-2 border-neon-cyan rounded-xl p-8 max-w-[min(24rem,90vw)] shadow-2xl text-center animate-scale-up" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-neon-cyan animate-pulse" />
          </div>
          <h3 className="font-heading font-bold text-2xl text-text-primary mb-2">Welcome to Premium!</h3>
          <p className="font-mono text-xs text-neon-cyan mb-4">Your membership is now active.</p>
          <p className="font-mono text-xs text-text-secondary">Unlocking gender filters, badge status, and 2x faster matching right now...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="bg-dark-card border border-white/10 rounded-t-2xl md:rounded-xl w-full max-w-[min(28rem,100%)] md:max-w-[28rem] shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Graphic */}
        <div className="relative p-6 text-center border-b border-white/5 bg-gradient-to-br from-neon-cyan/10 to-transparent">
          <button onClick={onClose} className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>

          <div className="inline-flex p-3 rounded-full bg-neon-cyan/15 border border-neon-cyan/20 mb-3 animate-pulse">
            <Sparkles className="w-6 h-6 text-neon-cyan" />
          </div>

          <h2 className="font-heading font-extrabold text-2xl text-text-primary uppercase tracking-wider">
            ShadowChat <span className="text-neon-cyan neon-glow">Premium</span>
          </h2>
          <p className="font-mono text-xs text-text-secondary mt-1">Upgrade your anonymous chatting experience</p>
        </div>

        {/* Feature List */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {PREMIUM_FEATURES.map((feat, idx) => (
            <div key={idx} className="flex gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="text-2xl select-none">{feat.icon}</div>
              <div>
                <h4 className="font-heading font-semibold text-text-primary text-sm flex items-center gap-1.5">
                  {feat.title}
                </h4>
                <p className="font-mono text-xs text-text-secondary/80 mt-0.5 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Price Card & Action */}
        <div className="p-6 bg-white/[0.01] border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-heading font-bold text-text-primary text-lg flex items-baseline gap-1">
                $4.99 <span className="font-mono text-xs font-normal text-text-secondary">/ month</span>
              </p>
              <p className="font-mono text-[10px] text-text-secondary/50">Cancel anytime. Instant activation.</p>
            </div>
            <div className="flex items-center gap-1 bg-neon-cyan/10 border border-neon-cyan/20 px-2.5 py-1 rounded font-mono text-[10px] text-neon-cyan">
              <Check className="w-3 h-3" /> BEST VALUE
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4 font-mono text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-neon-cyan text-black font-heading font-bold text-sm py-3.5 rounded-lg btn-neon neon-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full loading-spinner" />
                <span>Redirecting to Checkout...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Unlock Premium Tier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
