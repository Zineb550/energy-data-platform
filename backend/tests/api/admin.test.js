const { app, request, pool, login, auth, idOf } = require('../helpers');

let admin;
let sara;
let karimId;

beforeAll(async () => {
  admin = await login('admin');
  sara = await login('sara');
  karimId = await idOf('users', 'email', 'karim@energyinsight.ma');
});
afterAll(async () => {
  await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [karimId]);
  await pool.end();
});

describe('Administration', () => {
  test('is forbidden to normal users', async () => {
    const res = await request(app).get('/api/admin/stats').set(auth(sara));
    expect(res.status).toBe(403);
  });

  test('returns global indicators', async () => {
    const res = await request(app).get('/api/admin/stats').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.totals.users).toBeGreaterThanOrEqual(4);
    expect(res.body.activityByDay).toHaveLength(30);
  });

  test('disabling a user blocks them at once, even with a valid token', async () => {
    const karim = await login('karim');

    const disable = await request(app).put(`/api/admin/users/${karimId}`).set(auth(admin)).send({ status: 'disabled' });
    expect(disable.status).toBe(200);

    expect((await request(app).get('/api/auth/me').set(auth(karim))).status).toBe(403);
    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'karim@energyinsight.ma', password: 'Karim1234' });
    expect(relogin.status).toBe(403);

    const log = await request(app).get('/api/admin/activity').set(auth(admin)).query({ action: 'ADMIN_USER_UPDATE' });
    expect(log.body.rows[0].target).toMatch(/karim@energyinsight\.ma/);
  });

  test('an admin cannot change their own account', async () => {
    const adminId = await idOf('users', 'email', 'admin@energyinsight.ma');
    const res = await request(app).put(`/api/admin/users/${adminId}`).set(auth(admin)).send({ role: 'user' });
    expect(res.status).toBe(400);
  });
});
