export default function AuthLayout({ children }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-200/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lavender-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex w-full flex-1 items-center justify-center">
        {children}
      </div>
      <p className="relative mt-6 text-center text-xs text-muted">
        © 2026 RememberMe · Twoje wspomnienia zostają prywatne.
      </p>
    </main>
  );
}
