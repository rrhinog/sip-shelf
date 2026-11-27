import { expect, test, type Page } from '@playwright/test';

// The whole app takes its colors from the Active bottle's Palette, with its Overrides applied (issue #6).

const addSlot = (page: Page) => page.getByRole('button', { name: 'Add bottle', exact: true });

/** Walk the Register flow from the Shelf and save a FreeSip 24 oz Bottle in the given colorway. */
async function registerBottle(page: Page, colorway: string, nickname?: string) {
  await addSlot(page).click();
  await page.getByRole('button', { name: 'FreeSip', exact: true }).click();
  await page.getByRole('button', { name: '24 oz', exact: true }).click();
  await page.getByRole('button', { name: colorway, exact: true }).click();
  await page.getByRole('button', { name: 'Next: give it a nickname' }).click();
  if (nickname) await page.getByLabel('Nickname (optional)').fill(nickname);
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
}

const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

const bottle = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}`) });

/** Open a Bottle's sheet and let it finish fading in. */
async function openSheet(page: Page, label: string) {
  await bottle(page, label).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400);
  return sheet;
}

test.beforeEach(async ({ page }) => {
  // The one-time device notice is tested in notice.spec.ts; here it is already dismissed so it covers nothing.
  await page.addInitScript(() => localStorage.setItem('sip-shelf:device-notice-seen', '1'));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
});

test('the theme follows the Active bottle, an Override on it, its reset, and survives a reload', async ({ page }) => {
  await registerBottle(page, 'Read My Lips');
  await registerBottle(page, 'Burgundy Bay');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#d70484');
  const firstBg = await cssVar(page, '--color-bg');

  // Switching the Active bottle re-themes the app.
  let sheet = await openSheet(page, 'Burgundy Bay');
  await sheet.getByRole('button', { name: 'Make Active' }).click();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');
  expect(await cssVar(page, '--color-bg')).not.toBe(firstBg);

  // An Override on the Active bottle re-themes it too, and the sheet says the color is now the person's own.
  sheet = await openSheet(page, 'Burgundy Bay');
  await expect(sheet.locator('[data-slot="body"]')).toContainText('Catalog color');
  await sheet.getByLabel('Body color').fill('#2255aa');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#2255aa');
  await expect(sheet.locator('[data-slot="body"]')).toContainText('Your color');
  await expect(sheet.locator('[data-slot="lid"]')).toContainText('Catalog color');

  // It is saved: a reload keeps it.
  await page.reload();
  await expect(bottle(page, 'Burgundy Bay')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#2255aa');

  // Reset goes back to the Catalog's color, and that is saved too.
  sheet = await openSheet(page, 'Burgundy Bay');
  await expect(sheet.getByLabel('Body color')).toHaveValue('#2255aa');
  await sheet.getByRole('button', { name: 'Reset body' }).click();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');
  await expect(sheet.locator('[data-slot="body"]')).toContainText('Catalog color');
  await page.reload();
  await expect(bottle(page, 'Burgundy Bay')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');
});

test('an Override on a bottle that is not Active waits: it shows in the sheet and themes the app once the bottle is Active', async ({ page }) => {
  await registerBottle(page, 'Read My Lips');
  await registerBottle(page, 'Burgundy Bay');
  let sheet = await openSheet(page, 'Burgundy Bay');
  await sheet.getByLabel('Lid color').fill('#00aa55');
  await expect(sheet.locator('[data-slot="lid"]')).toContainText('Your color');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#d70484');
  expect(await cssVar(page, '--color-secondary')).not.toBe('#00aa55');

  await sheet.getByRole('button', { name: 'Make Active' }).click();
  await expect.poll(() => cssVar(page, '--color-secondary')).toBe('#00aa55');
  sheet = await openSheet(page, 'Burgundy Bay');
  await expect(sheet.getByLabel('Lid color')).toHaveValue('#00aa55');
});

/** Scroll to the very end of the page. */
const scrollToEnd = (page: Page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

/** The top edge of the tab bar (its fade included): nothing readable may sit below it. */
async function tabTop(page: Page) {
  const box = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  return box!.y;
}

test('with a full second shelf row, the last labels clear the tab bar when scrolled to the end', async ({ page }) => {
  for (const name of ['Read My Lips', 'Burgundy Bay', 'Out of the Blue', 'Nailed It']) await registerBottle(page, name);
  await expect(page.getByRole('button', { name: 'Add bottle', exact: true })).toBeVisible();
  await scrollToEnd(page);

  const top = await tabTop(page);
  for (const label of [addSlot(page), bottle(page, 'Nailed It'), page.getByText('not affiliated with Owala')]) {
    const box = await label.boundingBox();
    expect(box!.y + box!.height, 'bottom of the content').toBeLessThanOrEqual(top);
  }
});

test('the About screen also clears the tab bar when scrolled to the end', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await scrollToEnd(page);
  const top = await tabTop(page);
  const last = await page.locator('.about-body > *').last().boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(top);
});
