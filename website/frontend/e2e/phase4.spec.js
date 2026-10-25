const { test, expect } = require('@playwright/test');

const PASSWORD = 'Faza4E2E123!';

function accountEmail(prefix = 'phase4') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerThroughApi(page, email, profile = {}) {
  const response = await page.request.post('/api/v1/auth/register', {
    data: {
      email,
      password: PASSWORD,
      first_name: 'Anna',
      last_name: 'Kowalska',
      timezone: 'Europe/Warsaw',
      ...profile,
    },
  });
  expect(response.status()).toBe(201);

  const refresh = await page.request.post('/api/v1/auth/refresh');
  expect(refresh.ok()).toBeTruthy();
  const payload = await refresh.json();
  return payload.data.access;
}

async function loginThroughApi(page, email) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: { email, password: PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.access;
}

async function deleteThroughApi(page, accessToken) {
  if (!accessToken) return;
  await page.request.delete('/api/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { password: PASSWORD },
  });
}

async function seedBirthday(page, accessToken, data) {
  const response = await page.request.post('/api/v1/birthdays', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data,
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

async function navigateMobile(page, label) {
  await page
    .getByRole('navigation', { name: 'Nawigacja mobilna' })
    .getByRole('link', { name: label, exact: true })
    .click();
}

async function openCreateDialog(page) {
  const add = page.getByRole('button', { name: 'Dodaj osobę' });
  if (await add.isVisible().catch(() => false)) {
    await add.click();
  } else {
    await page.getByRole('button', { name: 'Dodaj pierwszą osobę' }).click();
  }
  await expect(page.locator('dialog[open]')).toBeVisible();
}

async function fillQuickBirthday(page, { firstName, lastName, day, month, year }) {
  await page.locator('input[name="first_name"]').fill(firstName);
  if (lastName) {
    await page.getByRole('button', { name: 'Więcej szczegółów' }).click();
    await page.locator('input[name="last_name"]').fill(lastName);
  }
  await page.locator('input[name="birth_day"]').fill(String(day));
  await page.locator('select[name="birth_month"]').selectOption(String(month));
  if (year) {
    await page.locator('input[name="birth_year"]').fill(String(year));
  }
}

test.describe('birthday CRUD and dashboard', () => {
  test('adds, edits, searches, sorts and deletes a birthday', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = accountEmail('crud');
    const accessToken = await registerThroughApi(page, email);

    try {
      await page.goto('/birthdays');
      await expect(
        page.getByRole('heading', { name: 'Urodziny', exact: true })
      ).toBeVisible();
      await expect(page.getByText('Zacznij od pierwszej osoby')).toBeVisible();

      await page.getByRole('button', { name: 'Dodaj pierwszą osobę' }).click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await fillQuickBirthday(page, {
        firstName: 'Anna',
        lastName: 'Kowalska',
        day: 12,
        month: 4,
        year: 1990,
      });
      await expect(
        page.getByRole('status').filter({ hasText: 'Najbliższe:' })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Zapisz urodziny' }).click();

      await expect(page.getByText('Dodano urodziny do listy.')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Anna Kowalska', exact: true })
      ).toBeVisible();
      await expect(page.getByText('1 osoba')).toBeVisible();

      await navigateMobile(page, 'Pulpit');
      await expect(
        page.getByRole('heading', { name: 'Pulpit', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Anna Kowalska', exact: true })
      ).toBeVisible();
      await expect(page.getByText('Najbliższe 30 dni').first()).toBeVisible();

      await navigateMobile(page, 'Urodziny');
      await page
        .getByRole('button', { name: /Edytuj urodziny: Anna Kowalska/ })
        .click();
      await page.locator('input[name="first_name"]').fill('Ania');
      await page.getByRole('button', { name: 'Zapisz zmiany' }).click();
      await expect(
        page.getByRole('heading', { name: 'Ania Kowalska', exact: true })
      ).toBeVisible();

      const search = page.locator('input[aria-label="Szukaj urodzin"]');
      await search.fill('Ani');
      await expect(
        page.getByRole('heading', { name: 'Ania Kowalska', exact: true })
      ).toBeVisible();
      await search.fill('xyz');
      await expect(page.getByText('Brak wyników')).toBeVisible();
      await page.getByLabel('Wyczyść wyszukiwanie').click();
      await expect(
        page.getByRole('heading', { name: 'Ania Kowalska', exact: true })
      ).toBeVisible();

      await page
        .locator('select[aria-label="Sortuj urodziny"]')
        .selectOption('-first_name');
      await expect(
        page.getByRole('heading', { name: 'Ania Kowalska', exact: true })
      ).toBeVisible();

      await page.getByRole('button', { name: 'Dodaj osobę' }).click();
      await fillQuickBirthday(page, {
        firstName: 'Ania',
        lastName: 'Kowalska',
        day: 12,
        month: 4,
      });
      await expect(page.getByText(/Masz już zapisaną osobę/)).toBeVisible({
        timeout: 5_000,
      });
      await page.getByRole('button', { name: 'Zamknij okno' }).click();

      await page
        .getByRole('button', { name: /Usuń urodziny: Ania Kowalska/ })
        .click();
      const dialog = page.locator('dialog[open]');
      await dialog.getByRole('button', { name: 'Usuń', exact: true }).click();
      await expect(page.getByText('Usunięto urodziny.')).toBeVisible();
      await expect(page.getByText('Zacznij od pierwszej osoby')).toBeVisible();
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });

  test('paginates a longer list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = accountEmail('pages');
    const accessToken = await registerThroughApi(page, email);

    try {
      for (let index = 1; index <= 21; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        await seedBirthday(page, accessToken, {
          first_name: `Osoba${String(index).padStart(2, '0')}`,
          birth_month: 1,
          birth_day: (index % 28) + 1,
          birth_year: 1990,
        });
      }

      await page.goto('/birthdays');
      await expect(page.getByText('21 osób')).toBeVisible();
      await expect(page.getByText('Strona 1 z 2')).toBeVisible();
      await page.getByRole('button', { name: 'Następna' }).click();
      await expect(page.getByText('Strona 2 z 2')).toBeVisible();
      await expect(page.locator('ul li')).toHaveCount(1);
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });
});

test.describe('settings', () => {
  test('updates profile, timezone and notification preferences', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = accountEmail('settings');
    const accessToken = await registerThroughApi(page, email);

    try {
      await page.goto('/settings');
      await expect(
        page.getByRole('heading', { name: 'Ustawienia', exact: true })
      ).toBeVisible();

      await page.locator('input[name="first_name"]').fill('Maria');
      await page.locator('input[name="last_name"]').fill('Nowak');
      await page.locator('input[name="timezone"]').fill('Europe/London');
      await page.getByRole('button', { name: 'Zapisz profil' }).click();
      await expect(page.getByText('Zapisano profil.')).toBeVisible();

      await page.reload();
      await expect(page.locator('input[name="last_name"]')).toHaveValue(
        'Nowak'
      );
      await expect(page.locator('input[name="timezone"]')).toHaveValue(
        'Europe/London'
      );

      await expect(page.getByText('Włącz przypomnienia')).toBeVisible();
      const threeDays = page.getByRole('checkbox', {
        name: /3 dni wcześniej/,
      });
      if (!(await threeDays.isChecked())) await threeDays.check();
      await page.locator('input[name="send_at_time"]').fill('08:30');
      await page.getByRole('button', { name: 'Zapisz powiadomienia' }).click();
      await expect(
        page.getByText('Zapisano preferencje powiadomień.')
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole('checkbox', { name: /3 dni wcześniej/ })
      ).toBeChecked();
      await expect(page.locator('input[name="send_at_time"]')).toHaveValue(
        '08:30'
      );
    } finally {
      await deleteThroughApi(page, accessToken);
    }
  });

  test('logs out all devices and deletes the account', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = accountEmail('security');
    await registerThroughApi(page, email);

    const cookies = await context.cookies();
    const refresh = cookies.find((cookie) => cookie.name === 'refresh');
    expect(refresh?.value).toBeTruthy();

    let deleted = false;
    try {
      await page.goto('/settings');
      await page.getByRole('button', { name: 'Wyloguj wszędzie' }).click();
      const logoutDialog = page.locator('dialog[open]');
      await expect(logoutDialog).toBeVisible();
      await logoutDialog
        .getByRole('button', { name: 'Wyloguj wszędzie' })
        .click();

      await expect(page).toHaveURL(/\/login/);

      const response = await page.request.post('/api/v1/auth/refresh', {
        headers: { Cookie: `refresh=${refresh.value}` },
      });
      expect(response.status()).toBe(401);

      await loginThroughApi(page, email);
      await page.goto('/settings');
      await page.getByRole('button', { name: 'Usuń konto' }).click();
      const deleteDialog = page.locator('dialog[open]');
      await expect(deleteDialog).toBeVisible();
      await deleteDialog
        .locator('input[name="delete-password"]')
        .fill(PASSWORD);
      await deleteDialog.getByRole('button', { name: 'Usuń konto' }).click();

      await expect(page).toHaveURL(/\/login/);
      deleted = true;

      const loginAgain = await page.request.post('/api/v1/auth/login', {
        data: { email, password: PASSWORD },
      });
      expect(loginAgain.status()).toBe(401);
    } finally {
      if (!deleted) {
        try {
          const accessToken = await loginThroughApi(page, email);
          await deleteThroughApi(page, accessToken);
        } catch {
          // The account may already be gone or the credentials invalid.
        }
      }
    }
  });
});
