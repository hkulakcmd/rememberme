const TONES = {
  neutral: 'bg-canvas text-muted',
  brand: 'bg-brand-50 text-brand-700',
  lavender: 'bg-lavender-50 text-lavender-700',
  mint: 'bg-mint-50 text-mint-600',
  today: 'bg-brand-600 text-white',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
