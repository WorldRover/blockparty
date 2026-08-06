'use strict';

// Tier 2 — unit tests for getSubstateKey, the sub-state boundary overrides.
// Each override is a linear approximation of a historical line; these cases pin
// the current behavior on both sides of every boundary so a tuning pass shows up
// as an explicit, reviewed diff rather than a silent shift. See
// docs/testing-strategy.md.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { getSubstateKey } = require('../js/territories.js');

const OREGON = 'Spain+Russia→Britain+USA→USA';
const LOUISIANA = 'France→Spain→France→USA';
const MEX_CESSION = 'Spain→Mexico→USA';
const BRITAIN = 'Britain→USA';
const WEST_FL_REPUBLIC = 'Spain→Britain→Spain→Republic of West Florida→USA';
const WEST_FL_COAST = 'Spain→Britain→Spain→USA';
const NUECES = 'Spain→Mexico→Disputed→USA';
const NO_MANS_LAND = 'Spain→Mexico→Republic of Texas→Unorganized→USA';

// { name, abbr, lon, lat, expected }
const cases = [
  // Minnesota — Mississippi River split (east of the river was Britain→USA).
  ['MN east of Mississippi', 'MN', -92.0, 45.0, BRITAIN],
  ['MN west of Mississippi', 'MN', -95.0, 45.0, LOUISIANA],
  ['MN clamp above the river source (lat > 47.2)', 'MN', -94.0, 48.0, BRITAIN],

  // Montana — Continental Divide (west of the divide was Oregon Country).
  ['MT west of divide', 'MT', -114.0, 46.0, OREGON],
  ['MT east of divide falls through', 'MT', -110.0, 46.0, null],

  // Wyoming — Continental Divide.
  ['WY west of divide', 'WY', -110.5, 43.0, OREGON],
  ['WY east of divide falls through', 'WY', -106.0, 43.0, null],

  // Colorado — Continental Divide at ~106°W (west was the Mexican Cession).
  ['CO west of divide', 'CO', -108.0, 39.0, MEX_CESSION],
  ['CO east of divide falls through', 'CO', -104.0, 39.0, null],

  // Louisiana — Florida Parishes east of the Mississippi, below 31.5°N.
  ['LA Florida Parishes (east of river, south of 31.5)', 'LA', -90.5, 30.8, WEST_FL_REPUBLIC],
  ['LA west of the river falls through', 'LA', -93.0, 30.8, null],
  ['LA north of 31.5 falls through', 'LA', -90.0, 32.0, null],

  // Mississippi — West Florida coast below 30.5°N.
  ['MS Gulf coast', 'MS', -88.9, 30.3, WEST_FL_COAST],
  ['MS interior falls through', 'MS', -89.5, 33.0, null],

  // Alabama — Mobile Bay / West Florida coast below 31.0°N.
  ['AL Mobile Bay coast', 'AL', -88.0, 30.6, WEST_FL_COAST],
  ['AL interior falls through', 'AL', -86.8, 33.0, null],

  // Texas — Nueces Strip between the Nueces River and the Rio Grande.
  ['TX Nueces Strip near Rio Grande', 'TX', -99.0, 27.0, NUECES],
  ['TX north of the Nueces line falls through', 'TX', -99.0, 32.0, null],

  // Oklahoma — the Panhandle ("No Man's Land") west of 100°W.
  ['OK Panhandle', 'OK', -101.0, 36.7, NO_MANS_LAND],
  ['OK main body falls through', 'OK', -97.0, 35.5, null],
];

for (const [name, abbr, lon, lat, expected] of cases) {
  test(name, () => {
    assert.equal(getSubstateKey(lon, lat, abbr), expected);
  });
}

test('states with no override return null', () => {
  for (const abbr of ['CA', 'NY', 'FL', 'VA', 'AZ']) {
    assert.equal(getSubstateKey(-100, 40, abbr), null, `${abbr} should fall through`);
  }
});

test('every returned override key is one of the documented sequences', () => {
  const allowed = new Set([
    OREGON, LOUISIANA, MEX_CESSION, BRITAIN,
    WEST_FL_REPUBLIC, WEST_FL_COAST, NUECES, NO_MANS_LAND,
  ]);
  for (const [name, abbr, lon, lat] of cases) {
    const key = getSubstateKey(lon, lat, abbr);
    if (key !== null) {
      assert.ok(allowed.has(key), `${name} returned unexpected key ${key}`);
    }
  }
});
