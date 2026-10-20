// One command to (re)create the database with demo data:
//   npm run db:setup
// 1. runs database/schema.sql (drops and recreates every table)
// 2. creates the demo accounts
// 3. imports the energy CSVs from database/data/ with the same code as the upload feature
// 4. creates demo analyses and dashboards (one of them public)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../src/config/db');
const { parseCsv } = require('../src/services/csv.service');
const { insertRows } = require('../src/services/dataset.service');

const DB_DIR = path.join(__dirname, '..', '..', 'database');

const USERS = [
  { name: 'Platform Admin', email: 'admin@energyinsight.ma', password: 'Admin1234', role: 'admin', daysAgo: 30 },
  { name: 'Sara Analyst', email: 'sara@energyinsight.ma', password: 'Sara12345', role: 'user', daysAgo: 25 },
  { name: 'Youssef Analyst', email: 'youssef@energyinsight.ma', password: 'Youssef123', role: 'user', daysAgo: 22 },
  { name: 'Karim Student', email: 'karim@energyinsight.ma', password: 'Karim1234', role: 'user', daysAgo: 12 },
];

const DATASETS = [
  {
    file: 'energy_by_country.csv',
    owner: 'sara@energyinsight.ma',
    title: 'Energy transition by country (1990–2025)',
    description:
      'Primary energy consumption, energy per capita and the share of fossil, renewable, solar, wind, hydro and nuclear energy for every country, plus carbon intensity of electricity and greenhouse gas emissions.',
    category: 'Energy',
    source: 'Our World in Data — owid/energy-data (Energy Institute, Ember, EIA)',
    visibility: 'shared',
  },
  {
    file: 'electricity_mix.csv',
    owner: 'youssef@energyinsight.ma',
    title: 'Electricity generation mix by country (2000–2025)',
    description:
      'Electricity generation in TWh by source (coal, gas, oil, nuclear, hydro, solar, wind, bioenergy) and the renewable and fossil share of electricity.',
    category: 'Electricity',
    source: 'Our World in Data — owid/energy-data (Ember, Energy Institute)',
    visibility: 'shared',
  },
];

// Demo analyses. "dataset" is the index in DATASETS above.
const f = (column, op, value) => ({ column, op, value });
const ANALYSES = [
  {
    key: 'kpi', owner: 'sara@energyinsight.ma', dataset: 0, visibility: 'shared',
    name: 'Key energy indicators (2024)',
    description: 'Energy per capita, renewable share and carbon intensity of electricity.',
    config: {
      metrics: [
        { agg: 'avg', column: 'energy_per_capita' },
        { agg: 'avg', column: 'renewables_share_energy' },
        { agg: 'avg', column: 'carbon_intensity_elec' },
      ],
      groupBy: null, filters: [f('country', 'eq', 'Morocco'), f('year', 'eq', 2024)], sort: 'label_asc', limit: 1, chart: 'kpi',
    },
  },
  {
    key: 'renewables', owner: 'sara@energyinsight.ma', dataset: 0, visibility: 'shared',
    name: 'Renewable, wind and solar share of energy',
    description: 'Share of primary energy (%) since 2000, with a linear trend forecast to 2030.',
    config: {
      metrics: [
        { agg: 'avg', column: 'renewables_share_energy' },
        { agg: 'avg', column: 'wind_share_energy' },
        { agg: 'avg', column: 'solar_share_energy' },
      ],
      groupBy: 'year', filters: [f('country', 'eq', 'Morocco'), f('year', 'gte', 2000)], sort: 'label_asc', limit: 50, chart: 'line',
      forecast: { periods: 6 },
    },
  },
  {
    key: 'mix', owner: 'sara@energyinsight.ma', dataset: 0, visibility: 'private',
    name: 'Primary energy mix (2024)',
    description: 'Fossil, nuclear and renewable share of primary energy (%).',
    config: {
      metrics: [
        { agg: 'avg', column: 'fossil_share_energy' },
        { agg: 'avg', column: 'renewables_share_energy' },
        { agg: 'avg', column: 'nuclear_share_energy' },
      ],
      groupBy: null, filters: [f('country', 'eq', 'Morocco'), f('year', 'eq', 2024)], sort: 'label_asc', limit: 1, chart: 'pie',
    },
  },
  {
    key: 'sources', owner: 'sara@energyinsight.ma', dataset: 1, visibility: 'private',
    name: 'Electricity generation by source (TWh)',
    description: 'Coal, gas, wind and solar electricity since 2000.',
    config: {
      metrics: [
        { agg: 'sum', column: 'coal_electricity' },
        { agg: 'sum', column: 'gas_electricity' },
        { agg: 'sum', column: 'wind_electricity' },
        { agg: 'sum', column: 'solar_electricity' },
      ],
      groupBy: 'year', filters: [f('country', 'eq', 'Morocco')], sort: 'label_asc', limit: 50, chart: 'line',
    },
  },
  {
    key: 'consumers', owner: 'youssef@energyinsight.ma', dataset: 0, visibility: 'shared',
    name: 'Top 10 primary energy consumers (TWh)',
    description: 'Countries ranked by primary energy consumption.',
    config: {
      metrics: [{ agg: 'sum', column: 'primary_energy_consumption' }],
      groupBy: 'country', filters: [f('year', 'eq', 2024)], sort: 'value_desc', limit: 10, chart: 'bar',
    },
  },
  {
    key: 'greenest', owner: 'youssef@energyinsight.ma', dataset: 1, visibility: 'shared',
    name: 'Top 10 renewable share of electricity (%)',
    description: 'Countries generating at least 10 TWh, ranked by renewable share of electricity.',
    config: {
      metrics: [{ agg: 'avg', column: 'renewables_share_elec' }],
      groupBy: 'country', filters: [f('year', 'eq', 2024), f('electricity_generation', 'gte', 10)], sort: 'value_desc', limit: 10, chart: 'bar',
    },
  },
];

const DASHBOARDS = [
  {
    owner: 'sara@energyinsight.ma', visibility: 'public', slug: 'a1b2c3d4e5f6',
    name: 'Country energy profile',
    description: 'Pick a country to see its energy indicators, mix and transition since 2000.',
    widgets: [
      { key: 'kpi', size: 'full' }, { key: 'renewables', size: 'half' },
      { key: 'mix', size: 'half' }, { key: 'sources', size: 'full' },
    ],
    filterColumns: ['country'], defaultFilters: [{ column: 'country', value: 'Morocco' }],
  },
  {
    owner: 'youssef@energyinsight.ma', visibility: 'shared', slug: null,
    name: 'World rankings',
    description: 'Biggest consumers and greenest electricity systems, year by year.',
    widgets: [{ key: 'consumers', size: 'half' }, { key: 'greenest', size: 'half' }],
    filterColumns: ['year'], defaultFilters: [{ column: 'year', value: 2024 }],
  },
];

async function main() {
  // --if-empty: used by Docker on every start. Seeds only a brand-new database,
  // so restarting the containers never wipes your data.
  if (process.argv.includes('--if-empty')) {
    const { rows } = await pool.query("SELECT to_regclass('public.users') AS t");
    if (rows[0].t) {
      console.log('Database already initialised, nothing to do.');
      await pool.end();
      return;
    }
  }

  console.log('1/4 Creating tables...');
  await pool.query(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));

  console.log('2/4 Creating demo accounts...');
  const ids = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW() - make_interval(days => $5)) RETURNING id`,
      [u.name, u.email, hash, u.role, u.daysAgo]
    );
    ids[u.email] = rows[0].id;
  }

  console.log('3/4 Importing demo datasets...');
  const datasetIds = [];
  for (const d of DATASETS) {
    const { columns, rows } = parseCsv(fs.readFileSync(path.join(DB_DIR, 'data', d.file)));
    await withTransaction(async (client) => {
      const { rows: created } = await client.query(
        `INSERT INTO datasets (owner_id, title, description, category, source, visibility, columns, row_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [ids[d.owner], d.title, d.description, d.category, d.source, d.visibility, JSON.stringify(columns), rows.length]
      );
      await insertRows(client, created[0].id, rows);
      datasetIds.push(created[0].id);
    });
    console.log(`   - ${d.title}: ${rows.length} rows, ${columns.length} columns`);
  }

  console.log('4/4 Creating demo analyses and dashboards...');
  const analysisIds = {};
  for (const a of ANALYSES) {
    const { rows } = await pool.query(
      `INSERT INTO analyses (owner_id, dataset_id, name, description, config, visibility)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [ids[a.owner], datasetIds[a.dataset], a.name, a.description, JSON.stringify(a.config), a.visibility]
    );
    analysisIds[a.key] = rows[0].id;
  }
  for (const d of DASHBOARDS) {
    const widgets = d.widgets.map((w) => ({ analysisId: analysisIds[w.key], size: w.size }));
    await pool.query(
      `INSERT INTO dashboards (owner_id, name, description, widgets, filter_columns, default_filters, visibility, public_slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ids[d.owner], d.name, d.description, JSON.stringify(widgets), JSON.stringify(d.filterColumns),
       JSON.stringify(d.defaultFilters), d.visibility, d.slug]
    );
  }
  console.log(`   - ${ANALYSES.length} analyses, ${DASHBOARDS.length} dashboards`);

  // Demo history for the admin dashboard: logins and actions over the last 3 weeks.
  // (A fixed pseudo-random sequence, so every reset gives the same history.)
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const events = [];
  const at = (daysAgo, hour) => `NOW() - INTERVAL '${daysAgo} days ${24 - hour} hours'`;
  for (let day = 20; day >= 1; day--) {
    for (const u of USERS) {
      const chance = u.role === 'admin' ? 0.35 : u.email.startsWith('karim') ? 0.25 : 0.7;
      if (rand() < chance) events.push([ids[u.email], 'LOGIN', null, at(day, 8 + Math.floor(rand() * 10))]);
    }
  }
  events.push([ids['karim@energyinsight.ma'], 'REGISTER', null, at(12, 10)]);
  DATASETS.forEach((d, i) => events.push([ids[d.owner], 'DATASET_IMPORT', d.title, at(19 - i, 11)]));
  ANALYSES.forEach((a, i) => events.push([ids[a.owner], 'ANALYSIS_CREATE', a.name, at(16 - i * 2, 14)]));
  DASHBOARDS.forEach((d, i) => events.push([ids[d.owner], 'DASHBOARD_CREATE', d.name, at(5 - i, 15)]));
  events.push([ids['sara@energyinsight.ma'], 'DASHBOARD_PUBLISH', DASHBOARDS[0].name, at(4, 16)]);
  for (const [userId, action, target, when] of events) {
    await pool.query(`INSERT INTO activity_log (user_id, action, target, created_at) VALUES ($1, $2, $3, ${when})`, [
      userId,
      action,
      target,
    ]);
  }
  console.log(`   - ${events.length} activity log entries`);

  console.log('\nDone. Demo accounts:');
  USERS.forEach((u) => console.log(`   ${u.role.padEnd(5)}  ${u.email}  /  ${u.password}`));
  console.log('\nPublic dashboard: http://localhost:5173/p/a1b2c3d4e5f6');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Setup failed:', err.message);
  await pool.end();
  process.exit(1);
});
