# Test coverage analysis & testing strategy

_A proposal for where blockparty should invest in automated tests._

## TL;DR

blockparty currently has **no automated tests** — CI verifies only that files
_parse_ (markdown lint, `node --check`, `JSON.parse`), never that they are
_correct_. A live audit of the data layer found it internally consistent
**today**, but nothing prevents a future edit from silently shipping the
documented failure mode (gray `#888` cells) or dropping a state from the map.
The highest-value, lowest-cost work is a small suite of **data-integrity
assertions** plus **pure-function unit tests for `getSubstateKey`**, both of
which run in plain Node with no browser.

## Current state

### What runs in CI (`.github/workflows/ci.yml`)

| Check | What it actually verifies |
|---|---|
| `markdownlint-cli2` | Markdown style only |
| `node --check js/*.js` | JS is **syntactically** valid — not that it behaves |
| `JSON.parse(data/us-states.json)` | The TopoJSON is well-formed JSON — not that it maps to our FIPS table |

None of these exercise application logic. There is no test runner, no
`package.json`, and no assertions about behavior or data correctness.

### What the code is made of

The codebase is unusually test-friendly for a "no tests" project, because most
of the domain logic is **pure and deterministic**:

- `js/territories.js` — pure data (`FIPS_TO_STATE`, `STATE_SOVEREIGNTY`,
  `SEQUENCE_INFO`, `SEQUENCE_COLORS`) plus one pure function,
  `getSubstateKey(lon, lat, abbr)`. No DOM, no I/O, no randomness.
- `js/app.js` — an IIFE that does DOM/SVG rendering, D3 projection, grid
  sampling (`findSequence`), zoom/pan, and tooltip/legend building. Mixed pure
  logic and browser side effects.

## Testability blocker (address first)

Neither file can be `require()`d in Node as written: `territories.js` declares
browser globals (`const FIPS_TO_STATE = …`) with no `module.exports`, and
`app.js` is a self-invoking IIFE. Any Node-based test must currently `eval`
the source in a VM sandbox (as this audit did) — workable but fragile.

**Recommendation:** append a guarded export to `territories.js` so it stays a
plain browser global _and_ becomes importable:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FIPS_TO_STATE, STATE_SOVEREIGNTY, SEQUENCE_INFO, SEQUENCE_COLORS, getSubstateKey,
  };
}
```

This is inert in the browser (no `module` global) and unlocks the entire Tier 1
and Tier 2 suite below. For `app.js`, extract the pure helpers (`findSequence`,
the projection/grid setup) behind a similar guard if/when Tier 3 is pursued.

## Audit findings (baseline is green)

Running the proposed invariants against the current data layer, **all pass**:

- Every joined `STATE_SOVEREIGNTY` key and every `getSubstateKey` return literal
  has a matching `SEQUENCE_COLORS` **and** `SEQUENCE_INFO` entry.
- `SEQUENCE_COLORS` and `SEQUENCE_INFO` key sets are identical (no orphans on
  either side; no dead/unreachable entries).
- No two sequences share a color hex.
- Every `FIPS_TO_STATE` value has a `STATE_SOVEREIGNTY` sequence, and vice
  versa.
- Every sequence array terminates at `'USA'`.

So this is **regression prevention, not bug-fixing** — the data is correct now,
and the tests lock that in. Given the data layer is edited by hand (adding a
sequence means touching four separate structures, per `CLAUDE.md`), these are
exactly the edits most likely to drift.

## Proposed test areas, by return on investment

### Tier 1 — Data-integrity invariants (highest ROI, ~zero deps)

Pure assertions over `territories.js`. Catch the failure modes `CLAUDE.md`
explicitly warns about. Each maps to a real, silent user-facing bug:

1. **Every reachable key has a color** — a joined `STATE_SOVEREIGNTY` key or a
   `getSubstateKey` literal with no `SEQUENCE_COLORS` entry renders **gray
   `#888`**. This is the single most likely regression: the override keys are
   hand-typed string literals inside a `switch`, so a one-character typo (e.g.
   `Spain→Mexico→Diputed→USA`) ships silently.
2. **Every reachable key has `SEQUENCE_INFO`** — otherwise the tooltip/legend
   fall back to the raw key with an empty description.
3. **`SEQUENCE_COLORS` ⇔ `SEQUENCE_INFO` symmetry** — no entry in one without
   the other; flags dead entries when a sequence is removed.
4. **No duplicate colors** — two sequences sharing a hex is a legend/UX bug.
5. **Colors are valid `#rrggbb`** — guard against truncated/typo'd hex.
6. **FIPS ⇔ sequence completeness** — every continental FIPS maps to a state
   with a sequence (a state with `seq = null` is **dropped from the grid**,
   `app.js:35-40`), and every sequence state is reachable from a FIPS code.
7. **FIPS table shape** — keys are 2-digit zero-padded strings; values are
   unique 2-letter abbreviations; the deliberate exclusions (AK/HI/territories)
   stay excluded.
8. **Sequence array sanity** — non-empty, no empty-string entries, terminates
   at `'USA'`.

### Tier 2 — `getSubstateKey` unit tests (high ROI, ~zero deps)

`getSubstateKey` encodes five linear boundary approximations (Mississippi
River, Continental Divide, Nueces line, 31°N West Florida, 100°W OK panhandle),
each a `case` in a `switch`. These are the project's most error-prone lines —
tuning one constant can flip cells across a boundary — yet they are entirely
untested. Table-driven cases:

- **Both sides of each boundary.** Pick a lon/lat clearly east vs. west (or
  north vs. south) of each line and assert the returned key, e.g.:
  - MN: a point east of the Mississippi → `Britain→USA`; west → `France→Spain→France→USA`.
  - MT/WY: west of the Divide → `Spain+Russia→Britain+USA→USA`; east → `null` (fall through).
  - CO: `lon <= -106` → `Spain→Mexico→USA`; east → `null`.
  - LA: east of the river **and** `lat < 31.5` → West Florida Republic key.
  - TX: south of the Nueces line → `Spain→Mexico→Disputed→USA`.
  - OK: `lon <= -100` → the "No Man's Land" unorganized key.
- **Fall-through:** any `stateAbbr` not in the `switch` (e.g. `'CA'`, `'NY'`)
  returns `null`.
- **Clamp behavior:** the `Math.min(lat, 47.2)` (MN) and `Math.min(30.0, …)`
  (TX) clamps — assert a point beyond the clamp still resolves correctly.
- **Characterization tests** near each line document the _current_ boundary so
  an intentional tuning pass shows up as an explicit, reviewed diff rather than
  a silent behavior change.

### Tier 3 — Rendering-pipeline integration (medium ROI, needs `d3-geo`)

`findSequence` (`app.js:47`) does bounding-box rejection → `d3.geoContains` →
override. Testable in Node with `d3-geo` + `topojson-client` as devDependencies
and the bundled `data/us-states.json`:

- **Known-landmark sampling:** invert a handful of famous coordinates and
  assert the sequence — New Orleans → West Florida/Louisiana split, Detroit →
  `France→Britain→USA`, Salt Lake City → `Spain→Mexico→Deseret→USA`, Austin →
  Texas, San Francisco → Bear Flag. Doubles as an end-to-end check that the
  projection, geometry, and data agree.
- **Bounding-box-before-geoContains ordering** (a documented performance
  invariant) — assert the cheap reject runs first.
- **No unstyled cells:** sample a coarse grid over the viewport and assert
  every resolved key has a color (i.e. the map never renders `#888` in
  practice).

### Tier 4 — Browser smoke test (lower ROI, needs Playwright)

DOM/visual concerns can't be unit-tested: tooltip show/move/hide, legend
construction, zoom/pan, and the resize→`location.reload()` path. Chromium +
Playwright are already available in this environment. A single smoke test adds
disproportionate confidence:

- Serve the site, load the page, assert `#loading` hides, `rect.cell` count is
  in the expected range, and `#legend .legend-item` count equals the number of
  distinct present sequences.
- Hover a cell → assert `#tooltip` becomes visible with non-empty label text.
- (Optional) The data-load failure branch (`app.js:11-17`) — block the JSON
  request and assert the "Could not load map data" message appears.

## Recommended tooling & CI wiring

Keep it minimal, matching the repo's no-build ethos:

- Add a `package.json` with **only devDependencies** (`node:test` + `node:assert`
  need none for Tier 1–2; add `d3-geo`/`topojson-client` for Tier 3,
  `@playwright/test` for Tier 4). The shipped site stays dependency-free and
  CDN-loaded — devDeps never reach users.
- Use the built-in **`node --test`** runner for Tier 1–3 (zero framework
  install, already available on the CI Node 20).
- Add a `test` job to `ci.yml` alongside `syntax-check`. Tier 1–2 run in
  well under a second.
- Consider adding **ESLint** (`no-undef`, `no-unused-vars`) — a strictly bigger
  net than `node --check`, catching the class of typo that `getSubstateKey`
  literals are prone to at the identifier level.

## Suggested sequencing

1. Add the guarded `module.exports` to `territories.js` (unblocks everything).
2. Land Tier 1 + Tier 2 with `node --test` and a `test` CI job. Small, fast,
   and covers the documented gray-cell / dropped-state failure modes.
3. Add Tier 3 landmark sampling when a `data`-labeled change next touches
   sequences or boundaries.
4. Add a single Tier 4 Playwright smoke test to guard the render path.

Tiers 1–2 alone move the project from "syntax-checked" to "behavior-verified"
for the entire data layer at essentially no runtime cost.
