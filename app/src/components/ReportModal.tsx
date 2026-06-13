import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  onSubmit: (reason: string, description: string) => void;
  onClose: () => void;
}

const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate Content', icon: '🔞' },
  { id: 'harassment', label: 'Harassment', icon: '😤' },
  { id: 'spam', label: 'Spam', icon: '📢' },
  { id: 'underage', label: 'Underage User', icon: '🚸' },
  { id: 'other', label: 'Other', icon: '⚠️' },
];

export function ReportModal({ onSubmit, onClose }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, description);
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-dark-card border border-white/10 rounded-xl p-6 max-w-[min(22rem,90vw)] shadow-2xl animate-fade-in-up text-center" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-3">✅</div>
          <p className="font-heading font-semibold text-text-primary text-base">Report Submitted</p>
          <p className="font-mono text-xs text-text-secondary mt-1">Thank you for keeping Spectre safe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-dark-card border border-white/10 rounded-t-2xl md:rounded-xl w-full max-w-[min(24rem,100%)] md:max-w-[24rem] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-heading font-semibold text-text-primary text-base">Report User</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Reasons */}
        <div className="px-5 space-y-2 mb-4">
          {REPORT_REASONS.map(reason => (
            <button
              key={reason.id}
              onClick={() => setSelectedReason(reason.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                selectedReason === reason.id
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                  : 'bg-white/[0.03] border border-white/5 text-text-secondary hover:bg-white/[0.06] hover:border-white/10'
              }`}
            >
              <span className="text-lg">{reason.icon}</span>
              <span className="font-mono text-sm">{reason.label}</span>
            </button>
          ))}
        </div>

        {/* Description */}
        <div className="px-5 mb-4">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add details (optional, max 200 chars)"
            maxLength={200}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-secondary/30 resize-none focus:border-red-500/30 focus:outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-white/10 text-text-secondary font-mono text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-mono text-sm font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
