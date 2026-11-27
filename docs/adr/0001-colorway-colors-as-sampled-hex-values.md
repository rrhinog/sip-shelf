# Colorway colors ship as sampled hex values, not Owala's images

Owala publishes no color codes, so the app's colorway data gets its hex values by sampling Owala's own product and swatch images (decided 2026-11-27, Ryan: "A. Approved to download"). Only the resulting hex numbers are kept in the repo. The downloaded images are research input, kept out of version control, so a public open-source repo does not redistribute Owala's artwork. Users can still adjust any colorway's colors by hand.

## Considered Options

- Users pick colors from a photo of their own bottle: no data to ship, but "choose its Owala colorway" would mean nothing.
- A blend of sampled hex for core colorways and user picking for the rest: smaller job, but leaves most of the 295 researched colorways without colors.

## Consequences

- Sampling covers as many colorways as it can (Ryan, 2026-11-27: "As far as it can go"), run by agents in parallel. It does not gate v1: a colorway with no sampled palette yet can still be registered, and its owner sets the colors by hand.
- The catalog is built by a script from the colorway research, keeping each row's source URLs as attribution and leaving out the working notes.
