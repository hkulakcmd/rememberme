const { test, expect } = require('@playwright/test');

const PWA_ENABLED = process.env.E2E_PWA === '1';

test.describe('PWA shell', () => {
  test('manifest, icons and install metadata are valid', async ({ page }) => {
    await page.goto('/login');

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    expect(manifestHref).toBe('/manifest.webmanifest');

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const response = await fetch(link.href);
      return {
        status: response.status,
        contentType: response.headers.get('content-type'),
        body: await response.json(),
      };
    });

    expect(manifest.status).toBe(200);
    expect(manifest.contentType).toContain('application/manifest+json');
    expect(manifest.body.name).toContain('RememberMe');
    expect(manifest.body.short_name).toBe('RememberMe');
    expect(manifest.body.display).toBe('standalone');
    expect(manifest.body.start_url).toBe('/dashboard');
    expect(manifest.body.lang).toBe('pl');
    expect(manifest.body.icons.length).toBeGreaterThanOrEqual(3);
    expect(
      manifest.body.icons.some((icon) => icon.purpose === 'maskable')
    ).toBeTruthy();

    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute('content');
    expect(themeColor).toBe('#FFF9FB');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/apple-touch-icon.png'
    );

    const iconStatuses = await page.evaluate(async () =>
      Promise.all(
        [
          '/icons/icon-192.png',
          '/icons/icon-512.png',
          '/icons/maskable-512.png',
          '/icons/apple-touch-icon.png',
        ].map(async (url) => {
          const response = await fetch(url);
          return { url, status: response.status };
        })
      )
    );
    for (const icon of iconStatuses) {
      expect(icon.status, icon.url).toBe(200);
    }
  });

  test('service worker is active and the app is installable', async ({
    page,
    context,
  }) => {
    test.skip(
      !PWA_ENABLED,
      'Run against a production build with E2E_PWA=1 (Serwist is disabled in dev).'
    );

    await page.goto('/login');
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.scope;
    });
    expect(scope).toBe('http://localhost:3000/');

    await expect
      .poll(() =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;
          return registration.active?.state;
        })
      )
      .toBe('activated');

    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller))
      )
      .toBe(true);

    const cdp = await context.newCDPSession(page);
    const { installabilityErrors } = await cdp.send(
      'Page.getInstallabilityErrors'
    );
    expect(installabilityErrors).toEqual([]);
  });
});
