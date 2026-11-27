# v1 keeps the Shelf on the device; sync comes after dogfooding

The first version stores each person's Shelf in their own phone's browser storage, with no backend and no accounts (decided 2026-11-27, Ryan: "Local first, sync/public after I use it and dogfood it"). Sync between devices is wanted, but it comes after Ryan has used the app himself, so the weekend finish line stays small and the sync design is shaped by real use. Storage sits behind one layer and every Bottle has a stable ID, so adding sync later means adding a backend, not rewriting the app.

## Consequences

- In v1 a Shelf lives on one device. Clearing browser data or switching phones loses it. Whether v1 warns about this or offers a file backup is decided in the v1 cut list.
- The sync method (account, sync code or file) and where a backend lives are deliberately undecided.
