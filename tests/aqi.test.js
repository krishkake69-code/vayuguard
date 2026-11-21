import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  pm25ToAQI, tierFor, buildRoutine, buildHacks, demoReading, demoOutlook, esc,
} from '../js/aqi.js';

describe('pm25ToAQI (EPA breakpoints)', () => {
  it('maps clean air to Good AQI', () => {
    assert.strictEqual(pm25ToAQI(0), 0);
    assert.strictEqual(pm25ToAQI(12), 50);
  });
  it('maps 35.4 µg/m³ to AQI 100 (Moderate boundary)', () => {
    assert.strictEqual(pm25ToAQI(35.4), 100);
  });
  it('maps 150.4 µg/m³ to AQI 200 (Unhealthy boundary)', () => {
    assert.strictEqual(pm25ToAQI(150.4), 200);
  });
  it('clamps very high values to 500', () => {
    assert.strictEqual(pm25ToAQI(1000), 500);
  });
  it('interpolates mid-range correctly', () => {
    // 23.75 is midpoint of 12.1..35.4 -> AQI midpoint of 51..100 = 75.5 -> 76 (rounded)
    assert.strictEqual(pm25ToAQI(23.75), 76);
  });
});

describe('tierFor', () => {
  it('classifies 25 as Good', () => {
    assert.strictEqual(tierFor(25).cls, 'good');
  });
  it('classifies 75 as Moderate', () => {
    assert.strictEqual(tierFor(75).cls, 'moderate');
  });
  it('classifies 120 as Unhealthy for sensitive groups', () => {
    assert.strictEqual(tierFor(120).cls, 'usg');
  });
  it('classifies 180 as Unhealthy', () => {
    assert.strictEqual(tierFor(180).cls, 'unhealthy');
  });
  it('classifies 260 as Very unhealthy', () => {
    assert.strictEqual(tierFor(260).cls, 'very');
  });
  it('classifies 400 as Hazardous', () => {
    assert.strictEqual(tierFor(400).cls, 'hazardous');
  });
});

describe('buildRoutine', () => {
  it('returns morning, daytime and evening blocks', () => {
    const routine = buildRoutine(tierFor(25));
    assert.strictEqual(routine.length, 3);
    assert.ok(routine.some((b) => b.time === 'Morning'));
    assert.ok(routine.some((b) => b.time === 'Daytime'));
    assert.ok(routine.some((b) => b.time === 'Evening'));
  });
  it('gives stricter advice as AQI worsens', () => {
    const good = buildRoutine(tierFor(25));
    const haz = buildRoutine(tierFor(400));
    const goodText = good.map((b) => b.items.join(' ')).join(' ');
    const hazText = haz.map((b) => b.items.join(' ')).join(' ');
    assert.ok(hazText.includes('Stay indoors') || hazText.includes('indoors'));
    assert.ok(!goodText.includes('Stay indoors'));
  });
});

describe('buildHacks', () => {
  it('returns at least four hacks', () => {
    assert.ok(buildHacks(tierFor(25)).length >= 4);
  });
  it('returns six hacks for hazardous tiers', () => {
    assert.strictEqual(buildHacks(tierFor(400)).length, 6);
  });
});

describe('demoReading / demoOutlook (deterministic)', () => {
  it('returns the same reading for the same city', () => {
    const a = demoReading('Delhi');
    const b = demoReading('Delhi');
    assert.deepStrictEqual(a, b);
  });
  it('returns different readings for different cities', () => {
    assert.notDeepStrictEqual(demoReading('Delhi'), demoReading('New York'));
  });
  it('outlook has three days', () => {
    assert.strictEqual(demoOutlook('Delhi').length, 3);
  });
  it('every reading has a tier-reachable AQI', () => {
    const r = demoReading('Delhi');
    assert.ok(r.aqi >= 0 && r.aqi <= 500);
  });
});

describe('esc (XSS defence)', () => {
  it('escapes HTML special characters', () => {
    assert.strictEqual(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('handles null and undefined', () => {
    assert.strictEqual(esc(null), '');
    assert.strictEqual(esc(undefined), '');
  });
});
