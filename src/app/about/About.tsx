// Wiring (for the orchestrator):
// 1. Render <About /> as its own screen (e.g. from the menu button or an "About" route); it brings its own heading and band.
// 2. Render <DeviceOnlyNotice /> once, at the end of <App />'s main return, so it overlays whichever screen is open.
// 3. Import from './about' (index.ts); the styles come with the components. Nothing in this folder touches the Shelf or Dexie.
import './about.css';

export const REPO_URL = 'https://github.com/rrhinog/sip-shelf';
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export const NOT_AFFILIATED =
  'Sip Shelf is an independent, open-source project and is not affiliated with, endorsed by or sponsored by Owala.';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** The About screen: what Sip Shelf is, its license, source code and the not-affiliated notice. */
export function About() {
  return (
    <div className="about">
      <header className="about-band">
        <h1>About</h1>
        <p>Sip Shelf</p>
      </header>
      <svg className="about-wave" viewBox="0 0 390 30" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 0 H390 V12 C350 30 310 30 272 16 C232 2 196 4 160 18 C122 32 84 30 48 16 C30 9 14 8 0 12 Z"
          fill="currentColor"
        />
      </svg>

      <div className="about-body">
        <section className="about-card" aria-labelledby="about-what">
          <h2 id="about-what">What it is</h2>
          <p>
            Sip Shelf is a companion app for Owala water bottles. Register the bottles you own on your Shelf, pick your
            Active bottle, and the whole app takes its colors from it.
          </p>
          <p>
            Colors are sampled from public product photos, so they may be off from the real bottle. You can always set
            a color by hand.
          </p>
        </section>

        <section className="about-card about-disclaimer" aria-labelledby="about-independent">
          <h2 id="about-independent">Not affiliated</h2>
          <p>{NOT_AFFILIATED}</p>
        </section>

        <section className="about-card" aria-labelledby="about-license">
          <h2 id="about-license">Open source</h2>
          <p>Sip Shelf is free software under the MIT License. Anyone can read, use, change and share it.</p>
          <ul className="about-links">
            <li>
              <a href={LICENSE_URL} {...ext}>
                MIT License
              </a>
            </li>
            <li>
              <a href={REPO_URL} {...ext}>
                Source code
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
