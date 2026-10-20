// PostgreSQL connection pool. Every query in the app goes through `query()`.
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({ connectionString: env.databaseUrl });

// Values are always sent as parameters ($1, $2...), never concatenated
// into the SQL text: this is what protects the app against SQL injection.
const query = (text, params) => pool.query(text, params);

// Runs several queries in one transaction (all succeed or all are cancelled).
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
