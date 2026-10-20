const { app, request, pool, login, auth, idOf } = require('../helpers');

let sara;
let youssef;
let profileId; // "Country energy profile", Sara, public
const SLUG = 'a1b2c3d4e5f6';

beforeAll(async () => {
  sara = await login('sara');
  youssef = await login('youssef');
  profileId = await idOf('dashboards', 'name', 'Country energy profile');
});
afterAll(() => pool.end());

const kpi = (widgets) => widgets.find((w) => w.chart === 'kpi').result.rows[0];

describe('Dashboard filters', () => {
  test('a dashboard filter replaces the analysis filter on the same column', async () => {
    const morocco = await request(app)
      .post(`/api/dashboards/${profileId}/data`)
      .set(auth(sara))
      .send({ filters: [{ column: 'country', value: 'Morocco' }] });
    const spain = await request(app)
      .post(`/api/dashboards/${profileId}/data`)
      .set(auth(sara))
      .send({ filters: [{ column: 'country', value: 'Spain' }] });

    expect(morocco.status).toBe(200);
    expect(kpi(morocco.body.widgets).m1).toBeCloseTo(8.673, 3);
    expect(kpi(spain.body.widgets).m1).not.toBeCloseTo(kpi(morocco.body.widgets).m1, 1);
  });

  test('lists the values offered in each filter', async () => {
    const res = await request(app).get(`/api/dashboards/${profileId}`).set(auth(sara));
    const country = res.body.filterOptions.find((o) => o.column === 'country');
    expect(country.values).toContain('Morocco');
    expect(country.values.length).toBeGreaterThan(200);
  });
});

describe('Public dashboards', () => {
  test('are readable by visitors without a token', async () => {
    const res = await request(app).post(`/api/public/dashboards/${SLUG}/data`).send({});
    expect(res.status).toBe(200);
    expect(res.body.widgets).toHaveLength(4);
    expect(res.body.widgets.every((w) => !w.error)).toBe(true);
  });

  test('an unknown link gives 404', async () => {
    expect((await request(app).get('/api/public/dashboards/000000000000')).status).toBe(404);
  });

  test('other users can view but not edit', async () => {
    expect((await request(app).get(`/api/dashboards/${profileId}`).set(auth(youssef))).status).toBe(200);
    const edit = await request(app).put(`/api/dashboards/${profileId}`).set(auth(youssef)).send({ name: 'Hacked' });
    expect(edit.status).toBe(403);
  });
});
