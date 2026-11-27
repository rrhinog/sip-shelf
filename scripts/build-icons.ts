// Renders public/icons/icon.svg to the PNG icons the install needs, using the Chromium that Playwright already ships.
// Run with: npm run build:icons   (re-run it only when icon.svg changes; the PNGs are committed).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));

// The artwork is one full-bleed square with the mark inside the maskable safe zone, so every size uses the same SVG.
const outputs = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
] as const;

const svg = await readFile(`${dir}icon.svg`, 'utf8');
const browser = await chromium.launch();
try {
  for (const { file, size } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await writeFile(`${dir}${file}`, await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } }));
    await page.close();
    console.log(`wrote public/icons/${file} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
