const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const ACCOUNTS = {
  admin: ['admin@energyinsight.ma', 'Admin1234'],
  sara: ['sara@energyinsight.ma', 'Sara12345'],
  youssef: ['youssef@energyinsight.ma', 'Youssef123'],
  karim: ['karim@energyinsight.ma', 'Karim1234'],
};

async function login(who) {
  const [email, password] = ACCOUNTS[who];
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${who}: ${res.status}`);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Ids of the demo content, looked up by name so tests never depend on insertion order.
async function idOf(table, column, value) {
  const { rows } = await pool.query(`SELECT id FROM ${table} WHERE ${column} = $1`, [value]);
  return rows[0].id;
}

module.exports = { app, request, pool, login, auth, idOf };
