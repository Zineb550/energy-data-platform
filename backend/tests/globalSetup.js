// Runs once before the whole suite: creates the test database if needed,
// then loads the same demo data as "npm run db:setup" into it.
const { execFileSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');

const TEST_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/energy_insight_test';

module.exports = async () => {
  const url = new URL(TEST_URL);
  const dbName = url.pathname.slice(1);

  // Connect to the default "postgres" database to create the test database.
  const adminUrl = new URL(TEST_URL);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rows.length) await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
  await client.end();

  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'setup-db.js')], {
    env: { ...process.env, DATABASE_URL: TEST_URL, JWT_SECRET: 'test-secret' },
    stdio: 'ignore',
  });
};
