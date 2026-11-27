import { expect, test } from '@playwright/test';

type ManifestIcon = { src: string; sizes: string; type?: string; purpose?: string };

test('the built manifest lists 192 and 512 PNG icons, a maskable one, and every icon loads at its size', async ({ page }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifestUrl = new URL(manifestHref as string, page.url()).toString();
  const manifest = (await (await page.request.get(manifestUrl)).json()) as { icons: ManifestIcon[] };

  const png = (size: string, purpose: string) =>
    manifest.icons.find((i) => i.type === 'image/png' && i.sizes === size && (i.purpose ?? 'any').split(' ').includes(purpose));
  expect(png('192x192', 'any')).toBeDefined();
  expect(png('512x512', 'any')).toBeDefined();
  expect(png('512x512', 'maskable')).toBeDefined();

  for (const icon of manifest.icons.filter((i) => i.type === 'image/png')) {
    const url = new URL(icon.src, manifestUrl).toString();
    const size = await page.evaluate(
      (src) =>
        new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error(`icon failed to load: ${src}`));
          img.src = src;
        }),
      url,
    );
    const [w, h] = icon.sizes.split('x').map(Number);
    expect(size, icon.src).toEqual({ w, h });
  }
});

test('the page offers a 180px apple-touch-icon and a theme color, and the icon loads', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(new URL(href as string, page.url()).toString());
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('image/png');
  const dims = await page.evaluate(
    (src) =>
      new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('apple-touch-icon failed to load'));
        img.src = src;
      }),
    new URL(href as string, page.url()).toString(),
  );
  expect(dims).toEqual({ w: 180, h: 180 });
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', /^#[0-9a-f]{6}$/i);
});
