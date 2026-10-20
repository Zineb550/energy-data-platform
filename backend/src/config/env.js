// Loads the .env file once and exposes the configuration to the whole app.
require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!env.databaseUrl || !env.jwtSecret) {
  console.error('Missing DATABASE_URL or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

module.exports = env;
