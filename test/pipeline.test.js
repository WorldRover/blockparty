'use strict';

// Tier 3 — rendering-pipeline integration tests. Exercises the real geo-lookup
// (js/lookup.js) against the bundled TopoJSON, d3-geo's Albers/geoContains, and
// the full territories.js data layer. Confirms projection + geometry + data all
// agree, and that the extraction from app.js preserved behavior. See
// docs/testing-strategy.md (Tier 3).

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const {
  FIPS_TO_STATE,
  STATE_SOVEREIGNTY,
  SEQUENCE_COLORS,
  getSubstateKey,
} = require('../js/territories.js');
const { buildStateLookup, findSequence } = require('../js/lookup.js');

let geoBounds;
let geoContains;
let states;
let lookup;
let resolve; // (lon, lat) -> sequence key or null

before(async () => {
  // d3-geo / topojson-client are ESM-only; load them dynamically.
  const d3 = await import('d3-geo');
  const topo = await import('topojson-client');
  geoBounds = d3.geoBounds;
  geoContains = d3.geoContains;

  const us = JSON.parse(
    readFileSync(path.join(__dirname, '../data/us-states.json'), 'utf8'),
  );
  states = topo.feature(us, us.objects.states);
  lookup = buildStateLookup(states.features, geoBounds, FIPS_TO_STATE, STATE_SOVEREIGNTY);
  resolve = (lon, lat) => findSequence(lookup, [lon, lat], geoContains, getSubstateKey);
});

// Famous places, chosen to sit unambiguously inside a region (away from the
// crude linear override lines), spanning nearly every sequence.
const landmarks = [
  ['Detroit, MI', -83.05, 42.33, 'France→Britain→USA'],
  ['Boston, MA', -71.06, 42.36, 'Britain→USA'],
  ['Montpelier, VT', -72.58, 44.26, 'Britain→Vermont Republic→USA'],
  ['Albany, NY', -73.75, 42.65, 'Netherlands→Britain→USA'],
  ['Wilmington, DE', -75.55, 39.74, 'Sweden→Netherlands→Britain→USA'],
  ['Miami, FL', -80.19, 25.76, 'Spain→Britain→Spain→USA'],
  ['Bismarck, ND', -100.78, 46.81, 'France→Spain→France→USA'],
  ['Santa Fe, NM', -105.94, 35.69, 'Spain→Mexico→USA'],
  ['Salt Lake City, UT', -111.89, 40.76, 'Spain→Mexico→Deseret→USA'],
  ['Sacramento, CA', -121.49, 38.58, 'Spain→Mexico→Bear Flag Republic→USA'],
  ['Austin, TX', -97.74, 30.27, 'Spain→Mexico→Republic of Texas→USA'],
  ['Portland, OR', -122.68, 45.52, 'Spain+Russia→Britain+USA→USA'],
  // Sub-state overrides resolved through the real geometry:
  ['Missoula, MT (W of Divide)', -113.99, 46.87, 'Spain+Russia→Britain+USA→USA'],
  ['Billings, MT (E of Divide)', -108.5, 45.78, 'France→Spain→France→USA'],
  ['Grand Junction, CO (W of Divide)', -108.55, 39.06, 'Spain→Mexico→USA'],
  ['Denver, CO (E of Divide)', -104.99, 39.74, 'France→Spain→France→USA'],
  ['Hammond, LA (Florida Parishes)', -90.1, 30.55, 'Spain→Britain→Spain→Republic of West Florida→USA'],
  ['Shreveport, LA (Louisiana Purchase)', -93.75, 32.52, 'France→Spain→France→USA'],
  ['Biloxi, MS (Gulf coast)', -88.89, 30.4, 'Spain→Britain→Spain→USA'],
  ['Jackson, MS (interior)', -90.18, 32.3, 'Britain→USA'],
  ['Mobile, AL (coast)', -88.04, 30.69, 'Spain→Britain→Spain→USA'],
  ['Laredo, TX (Nueces Strip)', -99.51, 27.51, 'Spain→Mexico→Disputed→USA'],
  ['OK Panhandle (No Man\'s Land)', -101.5, 36.7, 'Spain→Mexico→Republic of Texas→Unorganized→USA'],
  ['Oklahoma City, OK (main body)', -97.5, 35.47, 'France→Spain→France→USA'],
];

for (const [name, lon, lat, expected] of landmarks) {
  test(`landmark resolves: ${name}`, () => {
    assert.equal(resolve(lon, lat), expected);
  });
}

test('lookup covers every state that has a sovereignty sequence', () => {
  const lookupAbbrs = new Set(lookup.map((s) => s.abbr));
  const sequenceStates = Object.keys(STATE_SOVEREIGNTY);
  const missing = sequenceStates.filter((abbr) => !lookupAbbrs.has(abbr));
  assert.deepEqual(missing, [], `states with a sequence but no geometry: ${missing.join(', ')}`);
  assert.equal(lookupAbbrs.size, sequenceStates.length);
});

test('every lookup entry carries a key that has a color', () => {
  for (const s of lookup) {
    assert.ok(SEQUENCE_COLORS[s.key], `${s.abbr} key ${s.key} has no color`);
  }
});

test('lookup is sorted largest-bbox-area first (performance invariant)', () => {
  const area = (s) => (s.lon1 - s.lon0) * (s.lat1 - s.lat0);
  for (let i = 1; i < lookup.length; i += 1) {
    assert.ok(area(lookup[i - 1]) >= area(lookup[i]), `lookup not sorted at index ${i}`);
  }
});

test('grid sweep never resolves to an unstyled (#888) cell', () => {
  // Coarse sweep over the continental US; every resolved key must have a color.
  let hits = 0;
  for (let lon = -125; lon <= -66; lon += 1) {
    for (let lat = 24; lat <= 49; lat += 1) {
      const key = resolve(lon, lat);
      if (key === null) continue;
      hits += 1;
      assert.ok(SEQUENCE_COLORS[key], `(${lon}, ${lat}) -> ${key} has no color`);
    }
  }
  assert.ok(hits > 500, `expected a substantial land sample, got ${hits} hits`);
});

test('extraction preserves the original app.js lookup behavior', () => {
  // Inline copy of the pre-extraction logic from app.js. Building the lookup and
  // resolving both ways must agree everywhere — proves the refactor was a
  // behavior-preserving move, not a rewrite.
  const legacyLookup = states.features
    .map((f) => {
      const fips = String(f.id).padStart(2, '0');
      const abbr = FIPS_TO_STATE[fips];
      const seq = abbr ? STATE_SOVEREIGNTY[abbr] : null;
      if (!seq) return null;
      const [[lon0, lat0], [lon1, lat1]] = geoBounds(f);
      return { feature: f, abbr, seq, key: seq.join('→'), lon0, lat0, lon1, lat1 };
    })
    .filter(Boolean);
  legacyLookup.sort(
    (a, b) =>
      (b.lon1 - b.lon0) * (b.lat1 - b.lat0) - (a.lon1 - a.lon0) * (a.lat1 - a.lat0),
  );
  const legacyResolve = (lon, lat) => {
    for (const s of legacyLookup) {
      if (lon < s.lon0 || lon > s.lon1 || lat < s.lat0 || lat > s.lat1) continue;
      if (geoContains(s.feature, [lon, lat])) {
        const override = getSubstateKey(lon, lat, s.abbr);
        return override !== null ? override : s.key;
      }
    }
    return null;
  };

  for (let lon = -125; lon <= -66; lon += 1) {
    for (let lat = 24; lat <= 49; lat += 1) {
      assert.equal(resolve(lon, lat), legacyResolve(lon, lat), `mismatch at (${lon}, ${lat})`);
    }
  }
});
