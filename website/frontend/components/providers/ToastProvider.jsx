'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

const ToastContext = createContext(null);

const TONES = {
  success: {
    icon: 'M20 6 9 17l-5-5',
    className: 'border-mint-100 bg-mint-50 text-mint-600',
  },
  error: {
    icon: 'M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
    className: 'border-brand-100 bg-brand-50 text-brand-700',
  },
  info: {
    icon: 'M12 8h.01M11 12h1v4h1',
    className: 'border-lavender-100 bg-lavender-50 text-lavender-700',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      counter.current += 1;
      const id = counter.current;
      const tone = options.tone || 'info';
      setToasts((items) => [...items, { id, message, tone }]);
      window.setTimeout(
        () => dismiss(id),
        typeof options.duration === 'number' ? options.duration : 4500
      );
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, tone: 'success' }),
      error: (message, options) => show(message, { ...options, tone: 'error' }),
      info: (message, options) => show(message, { ...options, tone: 'info' }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="toast-safe-bottom pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((item) => {
          const tone = TONES[item.tone] || TONES.info;
          return (
            <div
              key={item.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-field border border-line bg-white p-4 shadow-lift animate-scale-in"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${tone.className}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={tone.icon} />
                </svg>
              </span>
              <p className="flex-1 pt-1 text-sm font-medium text-ink">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                aria-label="Zamknij powiadomienie"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return context;
}
