// Geo-lookup — the pure geometry→sequence resolution, extracted from the render
// pipeline so it can be unit-tested in Node. No DOM, no D3 globals: the D3
// functions and data tables are passed in. See docs/testing-strategy.md (Tier 3).

// Build the state lookup: one entry per continental state that has a sequence,
// carrying a precomputed bounding box, sorted largest-area-first so most points
// hit an early entry. `geoBounds` is d3.geoBounds.
function buildStateLookup(features, geoBounds, fipsToState, stateSovereignty) {
  return features
    .map((f) => {
      const fips = String(f.id).padStart(2, '0');
      const abbr = fipsToState[fips];
      const seq = abbr ? stateSovereignty[abbr] : null;
      if (!seq) return null;
      const [[lon0, lat0], [lon1, lat1]] = geoBounds(f);
      return { feature: f, abbr, seq, key: seq.join('→'), lon0, lat0, lon1, lat1 };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b.lon1 - b.lon0) * (b.lat1 - b.lat0) - (a.lon1 - a.lon0) * (a.lat1 - a.lat0),
    );
}

// Resolve a [lon, lat] to a sequence key, or null if it lands outside every
// state. Bounding-box reject runs before the expensive geoContains (a documented
// performance invariant). `geoContains` is d3.geoContains; `getSubstate` is
// getSubstateKey.
function findSequence(stateLookup, lonlat, geoContains, getSubstate) {
  const [lon, lat] = lonlat;
  for (const s of stateLookup) {
    if (lon < s.lon0 || lon > s.lon1 || lat < s.lat0 || lat > s.lat1) continue;
    if (geoContains(s.feature, lonlat)) {
      const override = getSubstate(lon, lat, s.abbr);
      return override !== null ? override : s.key;
    }
  }
  return null;
}

// Node interop for tests — inert in the browser (no `module` global there).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildStateLookup, findSequence };
}
