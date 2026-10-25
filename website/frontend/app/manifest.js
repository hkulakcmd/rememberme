export default function manifest() {
  return {
    id: '/',
    name: 'RememberMe — urodziny bliskich',
    short_name: 'RememberMe',
    description:
      'Zapisuj urodziny bliskich i otrzymuj spokojne przypomnienia dokładnie wtedy, kiedy trzeba.',
    lang: 'pl',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#FFF9FB',
    theme_color: '#FFF9FB',
    categories: ['lifestyle', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dodaj urodziny',
        short_name: 'Dodaj',
        description: 'Dodaj nową osobę do listy urodzin.',
        url: '/birthdays?new=1',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Urodziny',
        short_name: 'Urodziny',
        description: 'Przejdź do listy urodzin.',
        url: '/birthdays',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
