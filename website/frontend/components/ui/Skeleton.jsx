export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-field bg-brand-50/80 ${className}`}
    />
  );
}
