const TONES = {
  error: 'border-brand-100 bg-brand-50 text-brand-800',
  success: 'border-mint-100 bg-mint-50 text-mint-600',
  info: 'border-lavender-100 bg-lavender-50 text-lavender-700',
};

const ICONS = {
  error: 'M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  success: 'M20 6 9 17l-5-5',
  info: 'M12 8h.01M11 12h1v4h1',
};

export function Alert({ tone = 'info', children, className = '' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-field border px-4 py-3 text-sm font-medium ${TONES[tone] || TONES.info} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICONS[tone] || ICONS.info} />
      </svg>
      <div>{children}</div>
    </div>
  );
}
