const { app, request, pool, login, auth, idOf } = require('../helpers');

let sara;
let youssef;
let energyId;

const morocco = { column: 'country', op: 'eq', value: 'Morocco' };
const run = (token, config) =>
  request(app).post('/api/analyses/run').set(auth(token)).send({ datasetId: energyId, config });

beforeAll(async () => {
  sara = await login('sara');
  youssef = await login('youssef');
  energyId = await idOf('datasets', 'title', 'Energy transition by country (1990–2025)');
});
afterAll(() => pool.end());

describe('Analysis engine', () => {
  test('computes an indicator with filters (real value from the source)', async () => {
    const res = await run(sara, {
      metrics: [{ agg: 'avg', column: 'renewables_share_energy' }],
      filters: [morocco, { column: 'year', op: 'eq', value: 2024 }],
      chart: 'kpi',
    });
    expect(res.status).toBe(200);
    expect(res.body.result.rows[0].m0).toBeCloseTo(8.673, 3);
  });

  test('groups and ranks: top 3 consumers in 2024', async () => {
    const res = await run(sara, {
      metrics: [{ agg: 'sum', column: 'primary_energy_consumption' }],
      groupBy: 'country',
      filters: [{ column: 'year', op: 'eq', value: 2024 }],
      sort: 'value_desc',
      limit: 3,
    });
    expect(res.status).toBe(200);
    expect(res.body.result.rows.map((r) => r.label)).toEqual(['China', 'United States', 'India']);
  });

  test('refuses a sum on a text column', async () => {
    const res = await run(sara, { metrics: [{ agg: 'sum', column: 'country' }] });
    expect(res.status).toBe(400);
  });

  test('forecast: linear trend of Morocco renewables since 2000', async () => {
    const res = await run(sara, {
      metrics: [{ agg: 'avg', column: 'renewables_share_energy' }],
      groupBy: 'year',
      filters: [morocco, { column: 'year', op: 'gte', value: 2000 }],
      chart: 'line',
      forecast: { periods: 6 },
    });
    expect(res.status).toBe(200);
    const model = res.body.result.forecast.models[0];
    expect(model.slopePerStep).toBeCloseTo(0.267, 3);
    expect(model.r2).toBeCloseTo(0.823, 3);
    expect(res.body.result.rows.at(-1)).toMatchObject({ label: 2030, forecast: true });
  });

  test('forecast needs a numeric time grouping', async () => {
    const res = await run(sara, {
      metrics: [{ agg: 'avg', column: 'renewables_share_energy' }],
      groupBy: 'country',
      forecast: { periods: 3 },
    });
    expect(res.status).toBe(400);
  });
});

describe('Saved analyses and sharing', () => {
  test('a saved analysis is private by default', async () => {
    const created = await request(app)
      .post('/api/analyses')
      .set(auth(sara))
      .send({
        datasetId: energyId,
        name: 'Private test analysis',
        config: { metrics: [{ agg: 'count' }], groupBy: 'year' },
      });
    expect(created.status).toBe(201);
    expect(created.body.analysis.visibility).toBe('private');

    const asYoussef = await request(app).get(`/api/analyses/${created.body.analysis.id}`).set(auth(youssef));
    expect(asYoussef.status).toBe(403);
  });

  test('a shared analysis is readable by others, with its result', async () => {
    const id = await idOf('analyses', 'name', 'Key energy indicators (2024)');
    const res = await request(app).get(`/api/analyses/${id}`).set(auth(youssef));
    expect(res.status).toBe(200);
    expect(res.body.analysis.canEdit).toBe(false);
    expect(res.body.result.rows).toHaveLength(1);
  });
});
