const { app, request, pool, login, auth } = require('../helpers');

afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  test('validates every field and reports each problem', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'a', email: 'nope', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  test('creates an account, hashes the password and returns a token', async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'Password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, role: 'user' });
    expect(res.body.user.password_hash).toBeUndefined();

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/); // bcrypt, never the clear password
  });

  test('refuses an email that already has an account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sara Bis', email: 'sara@energyinsight.ma', password: 'Password123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('gives the same message for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'sara@energyinsight.ma', password: 'nope' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'nope' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  test('returns a token that opens /me', async () => {
    const token = await login('sara');
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('sara@energyinsight.ma');
  });
});

describe('protected routes', () => {
  test('refuse requests without a token', async () => {
    expect((await request(app).get('/api/datasets')).status).toBe(401);
  });

  test('refuse a forged token', async () => {
    const res = await request(app).get('/api/auth/me').set(auth('not.a.real.token'));
    expect(res.status).toBe(401);
  });
});
