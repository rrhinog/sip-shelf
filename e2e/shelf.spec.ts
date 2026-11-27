import { expect, test, type Page } from '@playwright/test';

async function registerBottle(page: Page, model: string, size: string, colorway: string, nickname?: string) {
  await page.getByLabel('Model').selectOption({ label: model });
  await page.getByLabel('Size').selectOption({ label: size });
  await page.getByLabel('Colorway').selectOption({ label: colorway });
  if (nickname) await page.getByLabel('Nickname (optional)').fill(nickname);
  await page.getByRole('button', { name: 'Add to shelf' }).click();
}

const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sip Shelf' })).toBeVisible();
});

test('starts with an empty shelf and says it is not affiliated with Owala', async ({ page }) => {
  await expect(page.getByText('No bottles yet')).toBeVisible();
  await expect(page.getByText('not affiliated with Owala')).toBeVisible();
});

test('only offers the colorways sold on the chosen model and size', async ({ page }) => {
  await page.getByLabel('Model').selectOption({ label: 'Twist (fixture)' });
  await page.getByLabel('Size').selectOption({ label: '24 oz' });
  const options = await page.getByLabel('Colorway').locator('option').allTextContents();
  expect(options).toEqual(['Choose a colorway', 'Fixture Lagoon', 'Fixture Dusk']);
});

test('registers a bottle: it shows on the shelf as Active and themes the app', async ({ page }) => {
  await registerBottle(page, 'FreeSip (fixture)', '24 oz', 'Fixture Lagoon', 'Desk bottle');
  const item = page.getByRole('listitem').filter({ hasText: 'Desk bottle' });
  await expect(item).toContainText('Fixture Lagoon, FreeSip (fixture) 24 oz');
  await expect(item).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#2f7fa8');
});

test('the second bottle is not Active until chosen, and choosing it re-themes the app', async ({ page }) => {
  await registerBottle(page, 'FreeSip (fixture)', '24 oz', 'Fixture Lagoon');
  await registerBottle(page, 'FreeSip (fixture)', '32 oz', 'Fixture Meadow');
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#2f7fa8');

  await page.getByRole('listitem').filter({ hasText: 'Fixture Meadow' }).getByRole('button', { name: 'Make active' }).click();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#4f9d69');
  await expect(page.getByRole('listitem').filter({ hasText: 'Fixture Meadow' })).toContainText('Active');
});

test('keeps the shelf and the Active bottle after a reload', async ({ page }) => {
  await registerBottle(page, 'FreeSip (fixture)', '24 oz', 'Fixture Lagoon');
  await registerBottle(page, 'FreeSip (fixture)', '32 oz', 'Fixture Meadow');
  await page.getByRole('listitem').filter({ hasText: 'Fixture Meadow' }).getByRole('button', { name: 'Make active' }).click();
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('listitem').filter({ hasText: 'Fixture Meadow' })).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#4f9d69');
});

test('removing the Active bottle hands the theme to the next one', async ({ page }) => {
  await registerBottle(page, 'FreeSip (fixture)', '24 oz', 'Fixture Lagoon');
  await registerBottle(page, 'FreeSip (fixture)', '32 oz', 'Fixture Meadow');
  await page.getByRole('listitem').filter({ hasText: 'Fixture Lagoon' }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#4f9d69');
});

test.describe('follows the phone light and dark setting', () => {
  test('light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await registerBottle(page, 'FreeSip (fixture)', '24 oz', 'Fixture Lagoon');
    await expect.poll(() => cssVar(page, 'color-scheme')).toBe('light');
    const bg = await cssVar(page, '--color-bg');
    // Switching the phone to dark re-themes live, without a reload.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => cssVar(page, 'color-scheme')).toBe('dark');
    expect(await cssVar(page, '--color-bg')).not.toBe(bg);
  });
});

test('is an installable web app with a manifest scoped to /sip-shelf/', async ({ page, request, baseURL }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(new URL(href as string, baseURL).toString())).json();
  expect(manifest).toMatchObject({ name: 'Sip Shelf', display: 'standalone', scope: '/sip-shelf/', start_url: '/sip-shelf/' });
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('works offline after the first visit', async ({ page, context }) => {
  // Wait for the service worker to take control, so the app shell and catalog are cached.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sip Shelf' })).toBeVisible();
  await registerBottle(page, 'Twist (fixture)', '24 oz', 'Fixture Dusk');
  await expect(page.getByRole('listitem')).toContainText('Fixture Dusk');
});
