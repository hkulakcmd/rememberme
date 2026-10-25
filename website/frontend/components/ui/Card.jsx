export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-card border border-line bg-white p-6 shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
