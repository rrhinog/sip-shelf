import { ScreenHeader } from './ui/ScreenHeader';

/** A stand-in for the About tab; another builder replaces it with the real screen. */
export function AboutPlaceholder() {
  return (
    <section className="screen" aria-labelledby="about-heading">
      <ScreenHeader title="About" titleId="about-heading" />
      <p className="plain-text">About Sip Shelf is coming soon.</p>
    </section>
  );
}
