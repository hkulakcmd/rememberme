import { Logo } from '@/components/ui/Logo';

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-card border border-line bg-white shadow-card lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-pastel p-10 lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-lavender-200/50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-16 top-1/3 h-20 w-20 rounded-full bg-brand-200/40 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative my-auto pt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700">
            Drobne rzeczy, które mają znaczenie
          </p>
          <h2 className="mt-3 max-w-sm text-balance font-display text-3xl font-semibold leading-tight text-ink">
            Nie zapomnij o tych, których kochasz.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Zapisuj urodziny bliskich i dostawaj spokojne przypomnienia
            dokładnie wtedy, kiedy trzeba.
          </p>

          <div className="mt-8 rounded-card border border-white/70 bg-white/70 p-5 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Najbliższe urodziny
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-ink">
                  Anna Kowalska
                </p>
                <p className="text-sm font-medium text-brand-700">
                  za 3 dni · 12 kwietnia
                </p>
              </div>
              <div className="grid h-16 w-16 shrink-0 place-content-center rounded-2xl bg-brand-600 text-center text-white shadow-soft">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  Kwi
                </span>
                <span className="font-display text-2xl font-semibold leading-none">
                  12
                </span>
              </div>
            </div>
          </div>

          <ul className="relative mt-8 space-y-2.5">
            {[
              'Przypomnienia push o dobranej godzinie',
              'Twoje dane zostają tylko Twoje',
              'Działa też na telefonie jak aplikacja',
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-ink/80"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/80 text-mint-600 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex flex-col justify-center p-5 sm:p-10">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : null}
        <div className="mt-7">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </section>
    </div>
  );
}
