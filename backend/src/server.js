// Starts the HTTP server.
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

pool
  .query('SELECT 1')
  .then(() => {
    app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}/api`));
  })
  .catch((err) => {
    console.error('Cannot connect to PostgreSQL:', err.message);
    console.error('Check DATABASE_URL in backend/.env and that PostgreSQL is running.');
    process.exit(1);
  });
