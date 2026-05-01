# blockparty

Block-based US sovereignty history — a static D3 visualization that paints the continental US as a pixel grid colored by the historical sequence of sovereign powers that ruled each location.

Hover any cell for the full sequence (e.g. `France → Spain → France → USA` for the Louisiana Purchase, or `Spain → Mexico → Bear Flag Republic → USA` for California). Scroll/pinch to zoom. Drag to pan.

## Overview

15 sovereignty sequences, including:

- **Original colonies + Northwest Territory** — Britain → USA
- **New Netherland** — Netherlands → Britain → USA
- **New Sweden (Delaware)** — Sweden → Netherlands → Britain → USA
- **Florida** — Spain → Britain → Spain → USA
- **Louisiana Purchase** — France → Spain → France → USA
- **Vermont Republic** — independent 1777–1791
- **Republic of Texas** — Spain → Mexico → Republic of Texas → USA
- **Bear Flag Republic (CA)** — June 14 – July 9, 1846
- **State of Deseret (UT)** — Mormon proto-state, 1849–1851
- **Republic of West Florida** — 74-day republic in 1810 (LA Florida Parishes, AL/MS coast)
- **Oregon Country** — Spain+Russia → Britain+USA → USA, with sub-state overrides for the Continental Divide in MT/WY/CO
- **Nueces Strip** — disputed between the Republic of Texas and Mexico, 1836–1848
- **Oklahoma Panhandle ("No Man's Land")** — unorganized 1850–1890

Continental US only. AK / HI / territories are deliberately excluded.

## Getting started

No build, no install — just serve the directory over HTTP and open it.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

`file://` won't work — `data/us-states.json` is fetched, so the page must be served via HTTP.

## Usage

| Path | What's there |
|---|---|
| `index.html` | Markup, CDN script tags for D3 + topojson-client, viewport chrome (title, legend, tooltip). |
| `js/app.js` | Renderer — projection, grid sampling, point-in-polygon lookup, SVG draw, zoom/pan. |
| `js/territories.js` | Data layer — FIPS map, state-level sequences, sub-state overrides, sequence labels/descriptions/colors. |
| `data/us-states.json` | TopoJSON of continental US state and nation outlines. |
| `css/style.css` | Dark-theme styling for the map, legend, tooltip. |

See [`CLAUDE.md`](CLAUDE.md) for the architecture, key constants, and how to add a new sovereignty sequence.

## License

[MIT](LICENSE) — Copyright (c) 2026 Dan Ziegler
