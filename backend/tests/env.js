// Runs before every test file: points the app at the TEST database,
// never at the development one from backend/.env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/energy_insight_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
