# Sip Shelf

An open-source companion app for Owala water bottles. People register the bottles they own on a shelf, and the app takes its look from the bottle they choose.

## Language

**Colorway**:
Owala's named color design for a bottle, such as "Plaid and Simple". One colorway can be sold on several models.
_Avoid_: Color, variant, skin

**Model**:
Owala's bottle line, such as FreeSip or Twist.
_Avoid_: Line, product, type

**Bottle**:
One physical Owala bottle a person owns, defined by its model, size and colorway.
_Avoid_: Item, product

**Catalog**:
The list of known colorways, with their models, sizes and palettes, that ships inside the app.
_Avoid_: Database, library

**Custom colorway**:
A colorway a person defines by hand, with their own palette, when theirs is not in the catalog.
_Avoid_: Unlisted color, other

**Palette**:
The up-to-three colors a colorway is known by: its body color, lid color and accent color.
_Avoid_: Color scheme, swatch set

**Override**:
A color a person sets by hand to replace one of a bottle's palette colors.
_Avoid_: Custom color, tweak

**Shelf**:
A person's collection of registered bottles.
_Avoid_: Collection, library, list

**Active bottle**:
The one bottle on the shelf, chosen by the person, whose colorway themes the app.
_Avoid_: Current bottle, selected bottle, favorite
