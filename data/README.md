# Catalog data

The research behind the app's Catalog (the list of Owala colorways it ships with).

**Sip Shelf is not affiliated with Owala.** Owala is a trademark of its owner. The colorway names, models and sizes here are facts read from Owala's public pages; the colors are our own measurements, not Owala's color codes (Owala publishes none).

## Files

| File | What it holds |
|---|---|
| `colorways.csv` | One row per colorway: name, models, sizes, status, release, source page links and reading notes. |
| `palettes.csv` | The same names, with `body_hex`, `lid_hex`, `accent_hex`, how they were sampled, and a `confidence`. |
| `../public/catalog.json` | The Catalog the app loads, built from the two files above. Do not edit it by hand. |

## Where it came from

Colorways, models, sizes and source links were read from Owala's public website (owalalife.com) and, for colorways only sold at retailers, from public retailer and news pages, all on 2026-11-27. Nothing was behind a sign-in.

The hex colors were sampled from Owala's own product photos (see `docs/adr/0001-colorway-colors-as-sampled-hex-values.md`). Only the resulting hex numbers are kept here; the photos are not stored in this repo and are not shipped in the app. The catalog keeps each colorway's source *page* links as attribution, and leaves out the working notes. (`palettes.csv` still lists the photo addresses the colors were measured from, as a record of the method; the build ignores that column.)

## How the hex was sampled

For each colorway one or two front-on product photos were used. The background was removed, the bottle's pixels were grouped into shade families in the CIE Lab color space, and then:

- **body** is the dominant color of a strip across the middle of the bottle;
- **lid** is the color of the lid dome, and is the same as the body when the lid is the same color (common);
- **accent** is the largest other color on the lid assembly (band, carry loop, button, spout cap). It is the least reliable of the three, and is left out when no clear accent was found.

## What `confidence` means

- **high**: a clean studio photo, an even body color, and a second photo agrees on the body color.
- **medium**: a single photo, a less direct photo, strong shading, or a second photo that only roughly agrees.
- **low**: a pattern or print (only the dominant base color is given), an uneven body, a lifestyle or multi-bottle photo, or a second photo that disagrees.

## Unsampled colorways

Some colorways have no sampled colors, because they were only found on retailer or news pages (no Owala photo was in scope), or no photo could be tied to the name. They still ship: `"sampled": false`, a neutral palette (`#4a6572`) in place of real colors, and no `confidence`. The app can use that flag to invite the person to set their own colors.

## Models and sizes

The models and sizes in `colorways.csv` are free text, and the build maps them onto the app's Models and sizes (`scripts/build-catalog.ts`). Where the text does not say, a colorway is kept rather than dropped:

- a colorway with no confirmed model has an empty `offerings` list and is offered on every Model and size;
- a model whose sizes were not confirmed has an empty `sizesOz` and is offered in every size of that Model.

## Regenerate

```
npm run build:catalog
```

This rewrites `public/catalog.json` from the two CSVs (the same input always gives the same file) and prints the colorway counts and anything it could not map. A test fails if `public/catalog.json` is out of date with the CSVs, so after changing a CSV, run this and commit both.
