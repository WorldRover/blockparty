# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Tier 4 browser smoke test (`e2e/smoke.mjs`, Playwright) — loads the real page in Chromium and asserts the render path end to end: the grid draws (>1000 cells), the legend has one item per distinct rendered sequence, the tooltip shows a sequence on hover and hides on leave, and the data-load failure branch shows its message. Hermetic — the D3/topojson CDN scripts are intercepted and served from local UMD bundles, so it needs no external network. Adds a `test:e2e` script, a `browser-test` CI job (installs Chromium), and `playwright`/`d3` test-only devDependencies. Completes the tiers proposed in `docs/testing-strategy.md`.
- Tier 3 pipeline integration tests (`test/pipeline.test.js`) — resolve ~24 famous US landmarks through the real bundled TopoJSON + `d3-geo` projection to assert the geometry, projection, and data layer agree; sweep a coarse grid to prove no cell resolves to the unstyled `#888` fallback; and verify the geo-lookup extraction preserved `app.js`'s original behavior. Adds `d3-geo`/`topojson-client` as **test-only** devDependencies (the shipped site is unchanged) and a `npm ci` step to the CI `test` job.
- Test suite (`test/`) — the first automated tests. Tier 1 data-integrity invariants (`test/data-integrity.test.js`) guard against the documented gray-`#888` failure mode and dropped-state bug; Tier 2 unit tests (`test/getsubstate.test.js`) pin `getSubstateKey`'s boundary overrides on both sides of every line. Runs on `node --test` with zero dependencies. Adds a `test` job to CI and a minimal test-only `package.json` (site stays dependency-free). Implements the first steps of `docs/testing-strategy.md`.
- `docs/testing-strategy.md` — test coverage analysis and a tiered testing proposal (data-integrity invariants, `getSubstateKey` unit tests, rendering-pipeline integration, browser smoke test) for the currently untested codebase.
- `README.md` — quick-start, sovereignty sequence summary, file map.
- `scripts/init-labels.sh` and `scripts/protect-main.sh` from WorldRover canon.
- `.github/release.yml` — PR-label-based release note categories.

### Changed

- Extract the pure geometry→sequence lookup (`buildStateLookup`, `findSequence`) out of the `js/app.js` render IIFE into a new `js/lookup.js` module so it can be unit-tested in Node. Behavior-preserving — the render path is unchanged and an equivalence test pins that.
- `scripts/protect-main.sh` — sync to canon v0.2.6: accepts optional `OWNER/REPO` arg, improved check-context detection (space-aware `/` heuristic), post-apply warning when a required context name isn't found in recent CI runs.
- `.claude/settings.json` — retire old pre-commit changelog hook; update pre-push hook to canon v0.2.5 (issue number optional in slug, allow `chore/release-v*` branches).
- `.github/PULL_REQUEST_TEMPLATE.md` — add `## Follow-ups` section; update test plan comment to canon v0.2.5 wording.
- `.markdownlint.json` and `.editorconfig` from the WorldRover canon. Initial scaffold missed these; CI was red on default markdownlint MD013 (line-length) until the configs landed. Plus a local `MD024: {siblings_only: true}` override so the standard Keep a Changelog repeated `### Added` headings under different version sections don't trigger duplicate-heading errors. Closes #1.
- Align with wr-canon v0.4.1: rename `.claude/.worldrover-check` → `.claude/.wr-canon`, add `.claude/worktrees/` to `.gitignore`, fix `release.yml` Maintenance label (`chore` → `type: refactor`), move `Closes #` to top of PR template, add standard labels block to `init-labels.sh`, rename `README.md` headings to canon schema (`## Overview`, `## Getting started`, `## Usage`). Closes #34.

## [0.1.0] - 2026-04-26

Initial public release. Renders pixel-grid choropleth of continental US colored by historical sovereignty sequence per location, with hover tooltip, zoom/pan, and legend.

### Added

- D3 + TopoJSON pixel-grid renderer (`js/app.js`).
- Sovereignty data layer — state-level + sub-state geographic overrides for divide/river boundaries (`js/territories.js`).
- 15 sovereignty sequences with descriptions and palette: Britain, France, Spain, Netherlands, Sweden, Mexico, Russia chains plus Vermont Republic, Bear Flag Republic, Republic of Texas, Republic of West Florida, State of Deseret, Nueces Strip disputed zone, Oklahoma "No Man's Land" unorganized period.
- WorldRover scaffolding: `CLAUDE.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, `.claude/settings.json` hooks, `.github/workflows/ci.yml`, `.github/PULL_REQUEST_TEMPLATE.md`.
