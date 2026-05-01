# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `README.md` — quick-start, sovereignty sequence summary, file map.
- `scripts/init-labels.sh` and `scripts/protect-main.sh` from WorldRover canon.
- `.github/release.yml` — PR-label-based release note categories.

### Changed

- `scripts/protect-main.sh` — sync to canon v0.2.6: accepts optional `OWNER/REPO` arg, improved check-context detection (space-aware `/` heuristic), post-apply warning when a required context name isn't found in recent CI runs.
- `.claude/settings.json` — retire old pre-commit changelog hook; update pre-push hook to canon v0.2.5 (issue number optional in slug, allow `chore/release-v*` branches).
- `.github/PULL_REQUEST_TEMPLATE.md` — add `## Follow-ups` section; update test plan comment to canon v0.2.5 wording.
- `.markdownlint.json` and `.editorconfig` from the WorldRover canon. Initial scaffold missed these; CI was red on default markdownlint MD013 (line-length) until the configs landed. Plus a local `MD024: {siblings_only: true}` override so the standard Keep a Changelog repeated `### Added` headings under different version sections don't trigger duplicate-heading errors. Closes #1.

## [0.1.0] - 2026-04-26

Initial public release. Renders pixel-grid choropleth of continental US colored by historical sovereignty sequence per location, with hover tooltip, zoom/pan, and legend.

### Added

- D3 + TopoJSON pixel-grid renderer (`js/app.js`).
- Sovereignty data layer — state-level + sub-state geographic overrides for divide/river boundaries (`js/territories.js`).
- 15 sovereignty sequences with descriptions and palette: Britain, France, Spain, Netherlands, Sweden, Mexico, Russia chains plus Vermont Republic, Bear Flag Republic, Republic of Texas, Republic of West Florida, State of Deseret, Nueces Strip disputed zone, Oklahoma "No Man's Land" unorganized period.
- WorldRover scaffolding: `CLAUDE.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, `.claude/settings.json` hooks, `.github/workflows/ci.yml`, `.github/PULL_REQUEST_TEMPLATE.md`.
