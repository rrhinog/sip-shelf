// Domain types. Names follow GLOSSARY.md exactly.

/** A color as lowercase "#rrggbb". */
export type HexColor = string;

/** The slots of a Palette: a colorway's body color, lid color and accent color. */
export type PaletteSlot = 'body' | 'lid' | 'accent';

/**
 * The up-to-three colors a Colorway is known by. Only the body color is required;
 * a missing lid falls back to the body, a missing accent falls back to the lid.
 */
export interface Palette {
  body: HexColor;
  lid?: HexColor;
  accent?: HexColor;
}

/** Colors a person set by hand to replace some of a bottle's Palette colors. */
export type Overrides = Partial<Record<PaletteSlot, HexColor>>;

/** Owala's bottle line, such as FreeSip or Twist. */
export interface Model {
  id: string;
  name: string;
  /** The sizes this Model is sold in, in fluid ounces. */
  sizesOz: number[];
}

/** One Model (and the sizes of it) that a Colorway is sold on. */
export interface Offering {
  modelId: string;
  sizesOz: number[];
}

/** Owala's named color design for a bottle, as listed in the Catalog. */
export interface Colorway {
  id: string;
  name: string;
  palette: Palette;
  offerings: Offering[];
}

/** The list of known colorways, with their models, sizes and palettes. */
export interface Catalog {
  /** Plain-language note on where the data came from (fixtures say so here). */
  source: string;
  models: Model[];
  colorways: Colorway[];
}

/** Which colorway a Bottle has: one from the Catalog, or a Custom colorway. */
export type ColorwayRef =
  | { kind: 'catalog'; colorwayId: string }
  | { kind: 'custom'; name: string; palette: Palette };

/** One physical Owala bottle a person owns. Its id is stable for its whole life. */
export interface Bottle {
  id: string;
  modelId: string;
  sizeOz: number;
  colorway: ColorwayRef;
  nickname?: string;
  overrides: Overrides;
  /** Epoch milliseconds when it was added to the Shelf. */
  addedAt: number;
}

/** What the person supplies to add a Bottle; the id and date are assigned on add. */
export type NewBottle = Omit<Bottle, 'id' | 'addedAt' | 'overrides'> & {
  overrides?: Overrides;
};
