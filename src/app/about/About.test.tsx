import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { About } from './About';

const html = renderToStaticMarkup(<About />);
const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe('About', () => {
  it('says what Sip Shelf is', () => {
    expect(text).toMatch(/companion app for Owala water bottles/i);
  });

  it('says clearly it is independent and not affiliated with Owala', () => {
    expect(text).toContain(
      'Sip Shelf is an independent, open-source project and is not affiliated with, endorsed by or sponsored by Owala.',
    );
  });

  it('says colors are sampled from public product photos and may be off', () => {
    expect(text).toMatch(/sampled from public product photos/i);
    expect(text).toMatch(/may be off/i);
  });

  it('names the MIT license and links to the repo LICENSE and source code', () => {
    expect(text).toContain('MIT License');
    expect(hrefs).toContain('https://github.com/rrhinog/sip-shelf/blob/main/LICENSE');
    expect(hrefs).toContain('https://github.com/rrhinog/sip-shelf');
  });

  it('opens external links safely', () => {
    const links = [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toContain('rel="noopener noreferrer"');
  });
});
