'use strict';

// Tier 1 — data-integrity invariants over the sovereignty data layer.
// These guard the failure modes documented in CLAUDE.md: a key with no color
// renders gray (#888); a FIPS state with no sequence is dropped from the grid.
// See docs/testing-strategy.md.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  FIPS_TO_STATE,
  STATE_SOVEREIGNTY,
  SEQUENCE_INFO,
  SEQUENCE_COLORS,
  getSubstateKey,
} = require('../js/territories.js');

// Joined lookup keys produced by the state-level table.
const stateKeys = new Set(
  Object.values(STATE_SOVEREIGNTY).map((seq) => seq.join('→')),
);

// Keys returnable by getSubstateKey: every quoted string literal containing the
// '→' joiner inside the function body. Scoped to the function source so we never
// pick up the spaced labels ("Britain → USA") from SEQUENCE_INFO.
// Sequence keys contain only letters, spaces, '+' and the '→' joiner — never
// punctuation, digits, or newlines. Constraining the class this way keeps the
// match from spanning comment text (which also contains '→').
const overrideKeys = new Set(
  [...getSubstateKey.toString().matchAll(/(['"])([A-Za-z][A-Za-z +→]*→[A-Za-z +→]*)\1/g)]
    .map((m) => m[2]),
);

// Every key the renderer can ever look up.
const reachableKeys = new Set([...stateKeys, ...overrideKeys]);

const colorKeys = new Set(Object.keys(SEQUENCE_COLORS));
const infoKeys = new Set(Object.keys(SEQUENCE_INFO));

test('getSubstateKey source exposes the expected override keys', () => {
  // Guards the extraction above — if the regex silently matched nothing, the
  // "every reachable key has a color" test would pass vacuously for overrides.
  assert.ok(overrideKeys.size >= 5, `expected >=5 override keys, got ${overrideKeys.size}`);
});

test('every reachable key has a SEQUENCE_COLORS entry (no gray #888 cells)', () => {
  const missing = [...reachableKeys].filter((k) => !colorKeys.has(k));
  assert.deepEqual(missing, [], `keys missing a color: ${missing.join(', ')}`);
});

test('every reachable key has a SEQUENCE_INFO entry (tooltip/legend)', () => {
  const missing = [...reachableKeys].filter((k) => !infoKeys.has(k));
  assert.deepEqual(missing, [], `keys missing info: ${missing.join(', ')}`);
});

test('SEQUENCE_COLORS and SEQUENCE_INFO cover the same key set (no orphans)', () => {
  const colorNotInfo = [...colorKeys].filter((k) => !infoKeys.has(k));
  const infoNotColor = [...infoKeys].filter((k) => !colorKeys.has(k));
  assert.deepEqual(colorNotInfo, [], `in COLOR but not INFO: ${colorNotInfo.join(', ')}`);
  assert.deepEqual(infoNotColor, [], `in INFO but not COLOR: ${infoNotColor.join(', ')}`);
});

test('no dead SEQUENCE_COLORS entries (every color is reachable)', () => {
  const dead = [...colorKeys].filter((k) => !reachableKeys.has(k));
  assert.deepEqual(dead, [], `unreachable color entries: ${dead.join(', ')}`);
});

test('every color is a valid #rrggbb hex', () => {
  for (const [key, hex] of Object.entries(SEQUENCE_COLORS)) {
    assert.match(hex, /^#[0-9a-fA-F]{6}$/, `${key} has invalid hex ${hex}`);
  }
});

test('no two sequences share a color', () => {
  const byHex = {};
  for (const [key, hex] of Object.entries(SEQUENCE_COLORS)) {
    (byHex[hex.toLowerCase()] ||= []).push(key);
  }
  const dupes = Object.entries(byHex).filter(([, keys]) => keys.length > 1);
  assert.deepEqual(dupes, [], `duplicate colors: ${JSON.stringify(dupes)}`);
});

test('every SEQUENCE_INFO entry has a non-empty label', () => {
  for (const [key, info] of Object.entries(SEQUENCE_INFO)) {
    assert.ok(info.label && info.label.length > 0, `${key} has no label`);
  }
});

test('every continental FIPS maps to a state with a sequence (not dropped from grid)', () => {
  const orphans = Object.entries(FIPS_TO_STATE)
    .filter(([, abbr]) => !STATE_SOVEREIGNTY[abbr])
    .map(([fips, abbr]) => `${fips}->${abbr}`);
  assert.deepEqual(orphans, [], `FIPS states with no sequence: ${orphans.join(', ')}`);
});

test('every sequence state is reachable from a FIPS code', () => {
  const fipsStates = new Set(Object.values(FIPS_TO_STATE));
  const unreachable = Object.keys(STATE_SOVEREIGNTY).filter((abbr) => !fipsStates.has(abbr));
  assert.deepEqual(unreachable, [], `sequence states with no FIPS: ${unreachable.join(', ')}`);
});

test('FIPS keys are 2-digit zero-padded strings', () => {
  for (const fips of Object.keys(FIPS_TO_STATE)) {
    assert.match(fips, /^\d{2}$/, `bad FIPS key: ${fips}`);
  }
});

test('FIPS values are unique 2-letter uppercase abbreviations', () => {
  const abbrs = Object.values(FIPS_TO_STATE);
  for (const abbr of abbrs) {
    assert.match(abbr, /^[A-Z]{2}$/, `bad abbreviation: ${abbr}`);
  }
  assert.equal(new Set(abbrs).size, abbrs.length, 'duplicate abbreviation in FIPS_TO_STATE');
});

test('deliberate exclusions stay excluded (AK, HI, and territories)', () => {
  // CLAUDE.md: continental US only — non-continental FIPS must not appear.
  for (const fips of ['02' /* AK */, '15' /* HI */, '72' /* PR */, '11' /* DC */]) {
    assert.ok(!(fips in FIPS_TO_STATE), `FIPS ${fips} should be excluded`);
  }
});

test('every sequence is non-empty, clean, and terminates at USA', () => {
  for (const [abbr, seq] of Object.entries(STATE_SOVEREIGNTY)) {
    assert.ok(Array.isArray(seq) && seq.length > 0, `${abbr} has an empty sequence`);
    assert.equal(seq[seq.length - 1], 'USA', `${abbr} does not end at USA`);
    for (const power of seq) {
      assert.ok(typeof power === 'string' && power.trim().length > 0, `${abbr} has a blank entry`);
    }
  }
});
