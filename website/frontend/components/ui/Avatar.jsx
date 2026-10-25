const TONES = [
  'from-brand-400 to-brand-600',
  'from-lavender-400 to-lavender-600',
  'from-mint-300 to-mint-500',
  'from-amber-300 to-orange-400',
  'from-sky-300 to-blue-500',
];

function toneFor(name) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash + name.charCodeAt(index) * (index + 1)) % 997;
  }
  return TONES[hash % TONES.length];
}

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export function Avatar({ name = '', size = 'md', className = '' }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?';

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-soft ${toneFor(name)} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {initials}
    </span>
  );
}
