# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**GitHub:** [WorldRover/blockparty](https://github.com/WorldRover/blockparty)

## Project Overview

**blockparty** — static single-page D3 visualization of US territorial sovereignty history. Renders a pixel-grid choropleth of the continental US where each cell is colored by the historical sequence of sovereign powers that ruled that location (e.g. `France → Spain → France → USA` for the Louisiana Purchase). Hover for tooltip, scroll/pinch to zoom, drag to pan.

## Tech Stack

- Vanilla HTML / CSS / JS — no build step, no package manager, no tests.
- D3 v7 + topojson-client v3, loaded from public CDNs at runtime.
- TopoJSON of US state boundaries bundled at `data/us-states.json`.

## Commands

```bash
# Serve locally — must be HTTP, not file://, because data/us-states.json is fetched.
python3 -m http.server 8080
# open http://localhost:8080
```

## Versioning

The `version` field in `package.json` is the authoritative version, together with the matching git tag and the `## [version]` entry in `CHANGELOG.md`. The three are kept in sync: the release workflow (`.github/workflows/release.yml`) reads the version from `package.json` and pulls release notes from the matching `CHANGELOG.md` section.

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — `## [version] - YYYY-MM-DD` headings with `### Added / Changed / Fixed / Removed` sections. A pre-commit hook (`.claude/settings.json`) blocks `git commit` unless `CHANGELOG.md` is staged, so every commit either updates the existing `[Unreleased]` section or cuts a new version.

**Cadence — buffer model.** Changes land under `[Unreleased]` and accumulate; cut a release when the buffer is a meaningful chunk: a new sequence sweep, a tuning pass on the override boundaries, a substantive doc update, a dep/audit cleanup. Single one-off tweaks do not each get their own version. There is no schedule; cuts are content-driven, not time-driven.

**Cutting a release (automated).** Open a release PR from a `chore/release-v<version>` branch that:

1. bumps `version` in `package.json` to `<version>`, and
2. moves `[Unreleased]` entries into a new `## [<version>] - <date>` section in `CHANGELOG.md` (preserve the empty `## [Unreleased]` heading above it).

When that PR merges to `main`, the **Release** workflow auto-tags `v<version>` on `main` and creates the GitHub release with notes from the `CHANGELOG.md` section — no manual `git tag` or `gh release create`. The workflow refuses to re-tag a version that already exists. (`alpha`/`beta`/`rc` suffixes publish as pre-releases.) Because a `pull_request`-triggered workflow runs the copy on `main`, the PR that introduces or edits `release.yml` cannot itself trigger a release — land workflow changes first, then cut the release in a separate `chore/release-v*` PR.

## Branches and pull requests

Non-trivial work lands on a feature branch and merges to `main` via PR rather than committing directly to `main`. Trivial edits (typos, single-line doc tweaks) can still go straight to `main`.

**Branch naming:** `<type>/<issue>-<slug>`, lowercase and kebab-case. Use conventional-commits type prefixes:

- `feat/` — new user-visible capability
- `fix/` — bug fix
- `refactor/` — behavior-preserving code movement or restructuring
- `chore/` — tooling, deps, repo hygiene with no behavior change
- `docs/` — documentation only
- `test/` — test changes only

Include the primary issue number in the branch name; reference additional issues in the PR body with `Closes #N, #M`. A pre-push hook in `.claude/settings.json` blocks pushes from branches that don't match the convention (`main` is allowed for trivial edits).

**Starting a branch:** always sync `main` first.

```bash
git checkout main
git pull origin main
git checkout -b <type>/<issue>-<slug>
```

**Merging:** CI green is necessary but not sufficient. PRs wait for the owner's explicit merge — no auto-merge on green.

**Branch deletion:** Merged branches are auto-deleted on the remote (GitHub `deleteBranchOnMerge` setting).

## Labels

Canonical WorldRover scheme (run `worldrover-starter/scripts/init-labels.sh` to install):

- **Domain:** `ui`, `data`, `infra`
- **Priority:** `P1`, `P2`, `P3`
- **Type:** `type: bug`, `type: feature`, `type: docs`, `type: enhancement`
- Plus standard: `duplicate`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`

For this repo specifically: `ui` covers tooltip/legend/zoom/styling; `data` covers `js/territories.js` (sovereignty sequences, sub-state overrides, FIPS map) and `data/us-states.json`; `infra` covers CI, hooks, scaffolding.

## Key constants

| Constant | Location | Effect |
|---|---|---|
| `CELL` | `js/app.js:2` | Pixel size of each grid cell. Cell count is (W*H)/CELL² — lowering this quadratically increases point-in-polygon work at load. Default 7. |
| `scale` | `js/app.js:23` | Albers USA projection scale = `min(W,H) * 1.45`. Tune the multiplier to fit the map tighter or looser inside the viewport. |
| `scaleExtent` | `js/app.js:109` | Zoom range `[0.5, 32]`. |
| Override boundaries | `js/territories.js:151` `getSubstateKey` | Linear approximations of the Mississippi River, Continental Divide, Nueces River, 31°N West Florida line, and Oklahoma Panhandle 100°W edge. Adjust the constants when refining a boundary; each `case` documents which sequence it routes to. |

## Architecture

Three-layer rendering pipeline in `js/app.js`:

1. **Geo lookup**: load TopoJSON (`data/us-states.json`, `objects.states` + `objects.nation`), build a `stateLookup` array of features with bounding boxes, sorted largest-first for fast point-in-polygon rejection.
2. **Grid sampling**: walk a `CELL`px grid over the viewport, invert each pixel center to lon/lat via `d3.geoAlbersUsa`, resolve to a sequence key with `findSequence()` → `getSubstateKey()` override, fallback to state-level `STATE_SOVEREIGNTY[abbr]`.
3. **SVG draw**: one `<rect>` per cell colored by `SEQUENCE_COLORS[key]`, with state borders + nation outline overlay, plus `d3.zoom` on the parent `<g>`.

`js/territories.js` is the data layer — the only file with domain knowledge:

- `FIPS_TO_STATE` — continental US FIPS → 2-letter abbreviation (Alaska/Hawaii/territories deliberately excluded).
- `STATE_SOVEREIGNTY` — state abbr → ordered sequence array. Sequence is joined with `→` to form the lookup key everywhere else.
- `SEQUENCE_INFO` — key → `{label, desc}` shown in tooltip + legend.
- `SEQUENCE_COLORS` — key → hex. Every key returned by `getSubstateKey` or present in `STATE_SOVEREIGNTY` must have an entry here, otherwise cells render gray (`#888`).
- `getSubstateKey(lon, lat, abbr)` — sub-state geographic overrides for states that straddle historical boundaries (MN Mississippi River, MT/WY/CO Continental Divide, LA/MS/AL West Florida coast, TX Nueces Strip, OK Panhandle). Returns a sequence key string or `null` to fall back.

### Adding a new sovereignty sequence

1. Add the state(s) to `STATE_SOVEREIGNTY`, or add a sub-state override in `getSubstateKey`.
2. Add the joined-key entry to `SEQUENCE_INFO` (label + desc) and `SEQUENCE_COLORS` (hex).
3. Reload — legend rebuilds from sequences actually present in rendered cells, in order of appearance.

### Performance notes

- Bounding-box reject in `findSequence` happens before `d3.geoContains` (the expensive call). Keep that order.
- `stateLookup` sorted largest-first because most points hit big states; lookup is ~O(states_until_hit) per cell.
- ~ (W*H)/(CELL²) cells; at 1920×1080 with CELL=7 that's ~42k point-in-polygon checks on load.
- Resize triggers `location.reload()` rather than re-projecting — grid is laid out in pixel space at load.

## Session marker convention

Mark every commit, PR body, and issue/PR comment you produce with a session identifier so multi-agent work stays traceable.

**Format:** `[<mode>-<machine>:<dragon-name>]`

- `<mode>` — agent mode tag: `Disp` (Dispatch), `Code` (Claude Code), `Cowork` (Cowork).
- `<machine>` — short ID of the device the session runs on (`MBP2`, `MBP-Air`, `Workstation`, etc.).
- `<dragon-name>` — a mythical dragon name unique to this session. Any source: Norse, Greek, Slavic, fictional, D&D, anime — pick what you like.

**Wrapped phrasing** (what actually goes in commits/PRs/comments):

```text
Generated by Claude Code. Session: [Code-MBP2:Smaug]
```

Substitute the agent-name to match your mode (`Claude Code`, `Cowork`, `Cowork (Dispatch)`).

**Where to apply:**

- Commit message footer — own line at the very end.
- PR body — own line at the **bottom** (not top).
- Issue / PR comments — own line at the bottom.

**Don't retroactively amend** already-pushed commits or PRs. New ones only.

**Pick your dragon at the start of every new session** and announce it.

Tracked in canon: [WorldRover/wr-canon#92](https://github.com/WorldRover/wr-canon/issues/92).
