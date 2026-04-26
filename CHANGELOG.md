# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `README.md` — quick-start, sovereignty sequence summary, file map.

## [0.1.0] - 2026-04-26

Initial public release. Renders pixel-grid choropleth of continental US colored by historical sovereignty sequence per location, with hover tooltip, zoom/pan, and legend.

### Added

- D3 + TopoJSON pixel-grid renderer (`js/app.js`).
- Sovereignty data layer — state-level + sub-state geographic overrides for divide/river boundaries (`js/territories.js`).
- 15 sovereignty sequences with descriptions and palette: Britain, France, Spain, Netherlands, Sweden, Mexico, Russia chains plus Vermont Republic, Bear Flag Republic, Republic of Texas, Republic of West Florida, State of Deseret, Nueces Strip disputed zone, Oklahoma "No Man's Land" unorganized period.
- WorldRover scaffolding: `CLAUDE.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, `.claude/settings.json` hooks, `.github/workflows/ci.yml`, `.github/PULL_REQUEST_TEMPLATE.md`.
