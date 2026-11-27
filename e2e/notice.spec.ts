import { expect, test } from '@playwright/test';

// The one-time "your Shelf lives only on this device" notice (ADR 0002), on a first visit.

test('a first visit shows the device-only notice once; after "Got it" it never comes back', async ({ page }) => {
  await page.goto('./');
  const notice = page.getByRole('dialog', { name: 'Your Shelf lives only on this device' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('switching phones');

  await notice.getByRole('button', { name: 'Got it' }).click();
  await expect(notice).toBeHidden();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
