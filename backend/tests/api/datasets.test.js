const { app, request, pool, login, auth, idOf } = require('../helpers');

let sara;
let youssef;
let energyId; // "Energy transition by country", owned by Sara, shared
let mixId; // "Electricity generation mix by country", owned by Youssef, shared

beforeAll(async () => {
  sara = await login('sara');
  youssef = await login('youssef');
  energyId = await idOf('datasets', 'title', 'Energy transition by country (1990–2025)');
  mixId = await idOf('datasets', 'title', 'Electricity generation mix by country (2000–2025)');
});
afterAll(() => pool.end());

describe('CSV import', () => {
  test('stores the file with its detected column types', async () => {
    const res = await request(app)
      .post('/api/datasets')
      .set(auth(sara))
      .field('title', 'Regional consumption')
      .field('category', 'Energy')
      .attach('file', Buffer.from('region;month;kwh\nNorth;2024-01;10\nSouth;2024-02;12,5\n'), 'regional.csv');

    expect(res.status).toBe(201);
    expect(res.body.dataset.rowCount).toBe(2);
    expect(res.body.dataset.columns).toEqual([
      { name: 'region', type: 'text' },
      { name: 'month', type: 'date' },
      { name: 'kwh', type: 'number' },
    ]);
  });

  test('refuses a file that is not a CSV', async () => {
    const res = await request(app)
      .post('/api/datasets')
      .set(auth(sara))
      .field('title', 'Not a CSV')
      .field('category', 'Energy')
      .attach('file', Buffer.from('hello'), 'notes.txt');
    expect(res.status).toBe(400);
  });
});

describe('Explorer: filters, sorting, pagination', () => {
  test('filters on a column and sorts on another, on the server', async () => {
    const res = await request(app)
      .get(`/api/datasets/${energyId}/rows`)
      .set(auth(sara))
      .query({
        filters: JSON.stringify([{ column: 'country', op: 'eq', value: 'Morocco' }]),
        sortBy: 'year',
        sortDir: 'desc',
        pageSize: 5,
      });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(36); // Morocco, 1990 to 2025
    expect(res.body.rows).toHaveLength(5);
    expect(res.body.rows.map((r) => r.year)).toEqual([2025, 2024, 2023, 2022, 2021]);
  });

  test('blocks SQL injection through the sort column', async () => {
    const res = await request(app)
      .get(`/api/datasets/${energyId}/rows`)
      .set(auth(sara))
      .query({ sortBy: 'year; DROP TABLE users;--' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unknown column/);

    const { rows } = await pool.query("SELECT to_regclass('public.users') AS t");
    expect(rows[0].t).toBe('users');
  });

  test('computes descriptive statistics per column', async () => {
    const res = await request(app).get(`/api/datasets/${energyId}/stats`).set(auth(sara));
    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({ rowCount: 7603, columnCount: 15 });
    const year = res.body.stats.columns.find((c) => c.name === 'year');
    expect(year).toMatchObject({ type: 'number', min: 1990, max: 2025, missing: 0 });
  });
});

describe('Access rules', () => {
  test('a private dataset is invisible to other users', async () => {
    const created = await request(app)
      .post('/api/datasets')
      .set(auth(youssef))
      .field('title', 'Youssef private data')
      .field('category', 'Other')
      .attach('file', Buffer.from('a,b\n1,2\n'), 'private.csv');
    const res = await request(app).get(`/api/datasets/${created.body.dataset.id}`).set(auth(sara));
    expect(res.status).toBe(403);
  });

  test('a shared dataset can be read but not edited by others', async () => {
    expect((await request(app).get(`/api/datasets/${mixId}`).set(auth(sara))).status).toBe(200);
    const edit = await request(app).put(`/api/datasets/${mixId}`).set(auth(sara)).send({ title: 'Hacked' });
    expect(edit.status).toBe(403);
  });
});

describe('Advanced features on datasets', () => {
  test('quality score: 84/100, grade B, with its three dimensions', async () => {
    const res = await request(app).get(`/api/datasets/${energyId}/quality`).set(auth(sara));
    expect(res.status).toBe(200);
    expect(res.body.quality).toMatchObject({ score: 84, grade: 'B' });
    expect(res.body.quality.dimensions.map((d) => d.key)).toEqual(['completeness', 'uniqueness', 'consistency']);
  });

  test('outliers (IQR) flag China as the largest energy consumer', async () => {
    const res = await request(app)
      .get(`/api/datasets/${energyId}/outliers`)
      .set(auth(sara))
      .query({ column: 'primary_energy_consumption' });
    expect(res.status).toBe(200);
    expect(res.body.detail.rows[0]).toMatchObject({ country: 'China', _direction: 'high' });
    expect(res.body.detail.rows[0].primary_energy_consumption).toBeGreaterThan(res.body.detail.upperFence);
  });

  test('outliers are refused on a text column', async () => {
    const res = await request(app).get(`/api/datasets/${energyId}/outliers`).set(auth(sara)).query({ column: 'country' });
    expect(res.status).toBe(400);
  });
});
