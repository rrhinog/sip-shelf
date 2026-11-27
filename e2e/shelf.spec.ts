import { expect, test, type Page } from '@playwright/test';

interface Registration {
  model: string;
  size: string;
  /** Typed in the colorway search box, if given, before picking. */
  search?: string;
  colorway: string;
  nickname?: string;
}

const addSlot = (page: Page) => page.getByRole('button', { name: 'Add bottle', exact: true });
const nextToNickname = (page: Page) => page.getByRole('button', { name: 'Next: give it a nickname' });

/** Walk the whole Register flow from the Shelf and save the Bottle. */
async function registerBottle(page: Page, r: Registration) {
  await addSlot(page).click();
  await page.getByRole('button', { name: r.model, exact: true }).click();
  await page.getByRole('button', { name: r.size, exact: true }).click();
  if (r.search) await page.getByRole('searchbox', { name: 'Search colorways' }).fill(r.search);
  await page.getByRole('button', { name: r.colorway, exact: true }).click();
  await nextToNickname(page).click();
  if (r.nickname) await page.getByLabel('Nickname (optional)').fill(r.nickname);
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
}

/** Open the Register flow and get to the Colorway step for a FreeSip 24 oz. */
async function toColorwayStep(page: Page) {
  await addSlot(page).click();
  await page.getByRole('button', { name: 'FreeSip', exact: true }).click();
  await page.getByRole('button', { name: '24 oz', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which colorway is yours?' })).toBeVisible();
}

const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

/** A bottle standing on the Shelf, found by the start of its label. */
const bottle = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}`) });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
});

test('starts with an empty shelf, an Add bottle slot, and says it is not affiliated with Owala', async ({ page }) => {
  await expect(page.getByText('Your shelf is empty')).toBeVisible();
  await expect(addSlot(page)).toBeVisible();
  await expect(page.getByText('not affiliated with Owala')).toBeVisible();
});

test('registers a bottle: Model, Size, searchable Colorway, nickname, then it stands on the shelf as Active and themes the app', async ({ page }) => {
  await addSlot(page).click();

  await expect(page.getByRole('heading', { name: 'Which model?' })).toBeVisible();
  await page.getByRole('button', { name: 'FreeSip', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'How big?' })).toBeVisible();
  await page.getByRole('button', { name: '24 oz', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Which colorway is yours?' })).toBeVisible();
  const all = await page.getByTestId('colorway-list').getByRole('button').count();
  expect(all).toBeGreaterThan(20);
  await page.getByRole('searchbox', { name: 'Search colorways' }).fill('read my');
  await expect(page.getByTestId('colorway-list').getByRole('button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Read My Lips', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Read My Lips', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await nextToNickname(page).click();

  await expect(page.getByRole('heading', { name: 'Give it a nickname?' })).toBeVisible();
  await page.getByLabel('Nickname (optional)').fill('Desk bottle');
  await page.getByRole('button', { name: 'Add to shelf' }).click();

  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
  await expect(bottle(page, 'Desk bottle, Read My Lips, FreeSip 24 oz')).toContainText('Active');
  await expect(page.getByText('1 bottle · Desk bottle is Active')).toBeVisible();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#d70484');
});

test('the colorway list only offers colorways sold on the chosen model and size', async ({ page }) => {
  await addSlot(page).click();
  await page.getByRole('button', { name: 'SmoothSip Slider', exact: true }).click();
  await page.getByRole('button', { name: '12 oz', exact: true }).click();
  const list = page.getByTestId('colorway-list');
  await expect(list.getByRole('button', { name: 'Plaid and Simple', exact: true })).toBeVisible(); // sold on the Slider in 12 oz
  await expect(list.getByRole('button', { name: 'Rapunzel', exact: true })).toHaveCount(0); // sold on the FreeSip 24 oz only
});

test('Back steps through the flow and keeps what was chosen; Back on step 1 leaves to the shelf', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('button', { name: 'Read My Lips', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How big?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '24 oz', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which model?' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
  await expect(page.getByText('Your shelf is empty')).toBeVisible();
});

test('"My colorway isn\'t listed" makes a Custom colorway with its own Palette', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('searchbox', { name: 'Search colorways' }).fill('Grandma blue');
  await expect(page.getByText('Nothing by that name yet')).toBeVisible();
  await page.getByRole('button', { name: "My colorway isn't listed" }).click();

  await expect(page.getByRole('heading', { name: 'Make your own colorway' })).toBeVisible();
  // What was typed in the search carries over as the name.
  await expect(page.getByLabel('Colorway name')).toHaveValue('Grandma blue');
  await page.getByLabel('Body color').fill('#112233');
  await page.getByLabel('Lid color').fill('#ddeeff');
  await page.getByLabel('Accent color').fill('#ff8800');
  await nextToNickname(page).click();
  await page.getByRole('button', { name: 'Add to shelf' }).click();

  await expect(bottle(page, 'Grandma blue, FreeSip 24 oz')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#112233');
});

test('a Custom colorway needs a name', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('button', { name: "My colorway isn't listed" }).click();
  await expect(nextToNickname(page)).toBeDisabled();
  await page.getByLabel('Colorway name').fill('Mine');
  await expect(nextToNickname(page)).toBeEnabled();
});

test('an unsampled colorway can still be registered: neutral color and a note', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('button', { name: 'Antique Charm', exact: true }).click();
  await expect(page.getByText('colors not sampled yet', { exact: false })).toBeVisible();
  await nextToNickname(page).click();
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect(bottle(page, 'Antique Charm, FreeSip 24 oz')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#4a6572');
});

test('colors set by hand on an unsampled colorway are kept and theme the app', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('button', { name: 'Antique Charm', exact: true }).click();
  await nextToNickname(page).click();
  await page.getByLabel('Body color').fill('#aa5500');
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#aa5500');
});

test('a sampled colorway has no note and no color inputs', async ({ page }) => {
  await toColorwayStep(page);
  await page.getByRole('button', { name: 'Read My Lips', exact: true }).click();
  await expect(page.getByText('colors not sampled yet', { exact: false })).toHaveCount(0);
  await nextToNickname(page).click();
  await expect(page.getByLabel('Body color')).toHaveCount(0);
});

test('the second bottle is not Active until chosen, and choosing it re-themes the app', async ({ page }) => {
  await registerBottle(page, { model: 'FreeSip', size: '24 oz', colorway: 'Read My Lips' });
  await registerBottle(page, { model: 'FreeSip', size: '32 oz', colorway: 'Burgundy Bay' });
  await expect(bottle(page, 'Read My Lips')).toContainText('Active');
  await expect(bottle(page, 'Burgundy Bay')).not.toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#d70484');

  await bottle(page, 'Burgundy Bay').click();
  await page.getByRole('button', { name: 'Make Active' }).click();
  await expect(bottle(page, 'Burgundy Bay')).toContainText('Active');
  await expect(bottle(page, 'Read My Lips')).not.toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');
});

test('keeps the shelf and the Active bottle after a reload', async ({ page }) => {
  await registerBottle(page, { model: 'FreeSip', size: '24 oz', colorway: 'Read My Lips' });
  await registerBottle(page, { model: 'FreeSip', size: '32 oz', colorway: 'Burgundy Bay', nickname: 'Night' });
  await bottle(page, 'Night').click();
  await page.getByRole('button', { name: 'Make Active' }).click();
  await page.reload();
  await expect(bottle(page, 'Read My Lips')).toBeVisible();
  await expect(bottle(page, 'Night, Burgundy Bay, FreeSip 32 oz')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');
});

test('removing a bottle asks first; the Active one hands the role on', async ({ page }) => {
  await registerBottle(page, { model: 'FreeSip', size: '24 oz', colorway: 'Read My Lips' });
  await registerBottle(page, { model: 'FreeSip', size: '32 oz', colorway: 'Burgundy Bay' });

  await bottle(page, 'Read My Lips').click();
  await page.getByRole('button', { name: 'Remove from shelf' }).click();
  await expect(page.getByText('Take Read My Lips off your shelf?')).toBeVisible();
  // Changing your mind leaves everything as it was.
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(bottle(page, 'Read My Lips')).toBeVisible();

  await bottle(page, 'Read My Lips').click();
  await page.getByRole('button', { name: 'Remove from shelf' }).click();
  await page.getByRole('button', { name: 'Yes, remove it' }).click();
  await expect(bottle(page, 'Read My Lips')).toHaveCount(0);
  await expect(bottle(page, 'Burgundy Bay')).toContainText('Active');
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#5f191f');

  await page.reload();
  await expect(bottle(page, 'Burgundy Bay')).toContainText('Active');
  await expect(bottle(page, 'Read My Lips')).toHaveCount(0);
});

test('removing the last bottle empties the shelf and the theme goes back to neutral', async ({ page }) => {
  await registerBottle(page, { model: 'FreeSip', size: '24 oz', colorway: 'Read My Lips' });
  await bottle(page, 'Read My Lips').click();
  await page.getByRole('button', { name: 'Remove from shelf' }).click();
  await page.getByRole('button', { name: 'Yes, remove it' }).click();
  await expect(page.getByText('Your shelf is empty')).toBeVisible();
  await expect.poll(() => cssVar(page, '--color-primary')).toBe('#4a6572');
});

test('the tab bar switches between Shelf and About', async ({ page }) => {
  const tabs = page.getByRole('navigation', { name: 'Main' });
  await expect(tabs.getByRole('button', { name: 'Shelf' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await expect(tabs.getByRole('button', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('button', { name: 'Shelf' }).click();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
});

test('the Register flow is a focused task: the tab bar is hidden while it is open', async ({ page }) => {
  await addSlot(page).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
});

test('follows the phone light and dark setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await registerBottle(page, { model: 'FreeSip', size: '24 oz', colorway: 'Read My Lips' });
  await expect.poll(() => cssVar(page, 'color-scheme')).toBe('light');
  const bg = await cssVar(page, '--color-bg');
  // Switching the phone to dark re-themes live, without a reload.
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => cssVar(page, 'color-scheme')).toBe('dark');
  expect(await cssVar(page, '--color-bg')).not.toBe(bg);
});

test('is an installable web app with a manifest scoped to /sip-shelf/', async ({ page, request, baseURL }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(new URL(href as string, baseURL).toString())).json();
  expect(manifest).toMatchObject({ name: 'Sip Shelf', display: 'standalone', scope: '/sip-shelf/', start_url: '/sip-shelf/' });
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('works offline after the first visit: the whole register flow still saves a bottle', async ({ page, context }) => {
  // Wait for the service worker to take control, so the app shell and catalog are cached.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Shelf' })).toBeVisible();
  await registerBottle(page, { model: 'FreeSip Twist', size: '24 oz', search: 'candy', colorway: 'Candy Cane' });
  await expect(bottle(page, 'Candy Cane')).toContainText('Active');
  await page.reload();
  await expect(bottle(page, 'Candy Cane')).toBeVisible();
});
