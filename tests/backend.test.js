import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import app from '../backend/app.js';

async function startTestServer() {
  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, () => resolve(server));
  });
}

async function request(server, path, opts = {}) {
  const addr = server.address();
  const url = `http://127.0.0.1:${addr.port}${path}`;
  const res = await fetch(url, opts);
  const body = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : await res.text();
  return { status: res.status, body, headers: res.headers };
}

describe('GET /api/aqi', () => {
  it('returns a valid reading for a known smog city (demo fallback)', async () => {
    const server = await startTestServer();
    try {
      const { status, body } = await request(server, '/api/aqi?city=Delhi');
      assert.strictEqual(status, 200);
      assert.strictEqual(typeof body.city, 'string');
      assert.ok(Number.isFinite(body.aqi));
      assert.ok(body.aqi >= 0 && body.aqi <= 500);
      assert.ok(Number.isFinite(body.pm25));
      assert.ok(['live', 'demo'].includes(body.source));
      assert.ok(['good', 'moderate', 'usg', 'unhealthy', 'very', 'hazardous'].includes(body.tier.cls));
      assert.ok(typeof body.tier.label === 'string');
      assert.ok(typeof body.tier.advice === 'string');
      assert.strictEqual(typeof body.demo, 'boolean');
    } finally {
      server.close();
    }
  });

  it('returns deterministic demo readings for the same city', async () => {
    const server = await startTestServer();
    try {
      const { body: a } = await request(server, '/api/aqi?city=Delhi');
      const { body: b } = await request(server, '/api/aqi?city=Delhi');
      assert.deepStrictEqual(a, b);
    } finally {
      server.close();
    }
  });

  it('returns different readings for different cities', async () => {
    const server = await startTestServer();
    try {
      const { body: a } = await request(server, '/api/aqi?city=Delhi');
      const { body: b } = await request(server, '/api/aqi?city=New York');
      assert.notDeepStrictEqual(a, b);
    } finally {
      server.close();
    }
  });

  it('400 when city is missing', async () => {
    const server = await startTestServer();
    try {
      const { status, body } = await request(server, '/api/aqi');
      assert.strictEqual(status, 400);
      assert.ok(typeof body.error === 'string');
    } finally {
      server.close();
    }
  });

  it('400 when city is blank', async () => {
    const server = await startTestServer();
    try {
      const { status, body } = await request(server, '/api/aqi?city=   ');
      assert.strictEqual(status, 400);
    } finally {
      server.close();
    }
  });

  it('sanitises odd characters in the city name', async () => {
    const server = await startTestServer();
    try {
      const { status, body } = await request(server, '/api/aqi?city=Delhi<script>');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.city, 'Delhiscript'); // tags stripped
    } finally {
      server.close();
    }
  });
});

describe('POST /api/aqi', () => {
  it('returns a valid reading from a JSON body', async () => {
    const server = await startTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/aqi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Lahore' }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.city, 'Lahore');
      assert.ok(Number.isFinite(body.aqi));
    } finally {
      server.close();
    }
  });

  it('400 when body city is missing', async () => {
    const server = await startTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/aqi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
    } finally {
      server.close();
    }
  });

  it('400 when body city is blank', async () => {
    const server = await startTestServer();
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/aqi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: '' }),
      });
      assert.strictEqual(res.status, 400);
    } finally {
      server.close();
    }
  });
});

describe('404 and errors', () => {
  it('returns 404 for unknown routes', async () => {
    const server = await startTestServer();
    try {
      const { status } = await request(server, '/api/does-not-exist');
      assert.strictEqual(status, 404);
    } finally {
      server.close();
    }
  });
});
