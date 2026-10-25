const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { width: 320, height: 568, label: '320' },
  { width: 360, height: 800, label: '360' },
  { width: 390, height: 844, label: '390' },
  { width: 430, height: 932, label: '430' },
  { width: 768, height: 1024, label: '768' },
  { width: 1440, height: 900, label: '1440' },
];

const AUTH_ROUTES = [
  { path: '/login', heading: 'Witaj ponownie' },
  { path: '/register', heading: 'Zacznij pamiętać' },
];

const TARGET_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled]):not([type="checkbox"]):not([type="radio"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'nav a',
  'header a',
].join(',');

const PASSWORD = 'MobilneTesty123!';

function accountEmail() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerThroughApi(page, email) {
  const response = await page.request.post('/api/v1/auth/register', {
    data: {
      email,
      password: PASSWORD,
      first_name: 'Mobilna',
      last_name: 'Testowa',
      timezone: 'Europe/Warsaw',
    },
  });
  expect(response.status()).toBe(201);

  const refresh = await page.request.post('/api/v1/auth/refresh');
  expect(refresh.ok()).toBeTruthy();
  const payload = await refresh.json();
  return payload.data.access;
}

async function deleteThroughApi(page, accessToken) {
  if (!accessToken) return;
  await page.request.delete('/api/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { password: PASSWORD },
  });
}

async function setViewport(page, viewport) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.waitForTimeout(120);
}

async function assertNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    metrics.scrollWidth,
    `horizontal overflow: ${metrics.scrollWidth}px > ${metrics.innerWidth}px`
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function assertTouchTargets(page) {
  const tooSmall = await page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          label:
            element.getAttribute('aria-label') ||
            element.textContent?.trim().slice(0, 40) ||
            element.getAttribute('name') ||
            '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width < 44 || item.height < 44);
  }, TARGET_SELECTOR);

  expect(
    tooSmall,
    `touch targets below 44px: ${JSON.stringify(tooSmall)}`
  ).toEqual([]);
}

async function assertMobileInputs(page) {
  const fontSizes = await page.evaluate(() =>
    [...document.querySelectorAll('input')].map((input) =>
      parseFloat(getComputedStyle(input).fontSize)
    )
  );
  expect(fontSizes.length).toBeGreaterThan(0);
  expect(
    fontSizes.every((size) => size >= 16),
    `inputs must be >=16px on mobile, got ${fontSizes}`
  ).toBeTruthy();
}

async function clickNav(page, label, width) {
  const navigation =
    width < 1024
      ? page.getByRole('navigation', { name: 'Nawigacja mobilna' })
      : page.getByRole('navigation', { name: 'Nawigacja główna' });
  await navigation.getByRole('link', { name: label, exact: true }).click();
}

test.describe('public screens on real mobile viewports', () => {
  for (const route of AUTH_ROUTES) {
    test(`${route.path} reflows from 320px to desktop`, async ({ page }) => {
      await setViewport(page, VIEWPORTS[0]);
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { name: route.heading, exact: true })
      ).toBeVisible();

      for (const viewport of VIEWPORTS) {
        await setViewport(page, viewport);
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);
        if (viewport.width < 640) {
          await assertMobileInputs(page);
        }
      }
    });
  }

  test('login works on a small phone', async ({ page }) => {
    await setViewport(page, VIEWPORTS[1]);
    const email = accountEmail();
    const accessToken = await registerThroughApi(page, email);

    try {
      await page.request.post('/api/v1/auth/logout');
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(PASSWORD);
      await page.getByRole('button', { name: 'Zaloguj się' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole('heading', { name: 'Pulpit', exact: true })
      ).toBeVisible();
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });
});

test.describe('authenticated screens on mobile', () => {
  test('shell, pages and navigation stay usable from 320px', async ({
    page,
  }) => {
    await setViewport(page, VIEWPORTS[2]);
    const email = accountEmail();
    const accessToken = await registerThroughApi(page, email);

    try {
      await page.goto('/dashboard');
      await expect(
        page.getByRole('heading', { name: 'Pulpit', exact: true })
      ).toBeVisible();

      const routes = [
        { label: 'Pulpit', heading: 'Pulpit' },
        { label: 'Urodziny', heading: 'Urodziny' },
        { label: 'Ustawienia', heading: 'Ustawienia' },
      ];

      for (const route of routes) {
        if (route.label !== 'Pulpit') {
          const currentWidth = page.viewportSize().width;
          await clickNav(page, route.label, currentWidth);
          await expect(
            page.getByRole('heading', { name: route.heading, exact: true })
          ).toBeVisible();
        }

        for (const viewport of VIEWPORTS) {
          await setViewport(page, viewport);
          await assertNoHorizontalOverflow(page);
          await assertTouchTargets(page);

          const mobileNav = page.getByRole('navigation', {
            name: 'Nawigacja mobilna',
          });
          if (viewport.width < 1024) {
            await expect(mobileNav).toBeVisible();
          } else {
            await expect(mobileNav).toBeHidden();
          }
        }
      }
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });

  test('survives 200% text and landscape with one session', async ({
    page,
  }) => {
    await setViewport(page, { width: 768, height: 1024 });
    const email = accountEmail();
    const accessToken = await registerThroughApi(page, email);

    try {
      await page.goto('/dashboard');
      await expect(
        page.getByRole('heading', { name: 'Pulpit', exact: true })
      ).toBeVisible();

      for (const label of ['Urodziny', 'Ustawienia', 'Pulpit']) {
        await clickNav(page, label, 768);
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
        await page.waitForTimeout(120);
        await assertNoHorizontalOverflow(page);
      }

      await page.evaluate(() => {
        document.documentElement.style.fontSize = '100%';
      });
      await setViewport(page, { width: 844, height: 390 });
      await assertNoHorizontalOverflow(page);
      await assertTouchTargets(page);
      await expect(
        page.getByRole('navigation', { name: 'Nawigacja mobilna' })
      ).toBeVisible();
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });
});
