# EnergyInsight

**A full-stack data platform to import, explore, analyze and share energy data — from a raw CSV to a public dashboard.**

[!\[CI](https://github.com/Zineb550/energy-data-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Zineb550/energy-data-platform/actions/workflows/ci.yml)
!\[React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=white)
!\[Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js\&logoColor=white)
!\[PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql\&logoColor=white)
!\[Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker\&logoColor=white)
!\[Tests](https://img.shields.io/badge/tests-47%20passing-2ea44f)

!\[Public dashboard: switching countries recomputes every chart](docs/screenshots/demo.gif)

*A public dashboard built in the app: picking a country recomputes every widget on the server, from real* [*Our World in Data*](https://github.com/owid/energy-data) *figures (218 countries, 1990–2025).*

\---

## Why

Energy analyses often start from scattered CSV files that each analyst re-processes by hand. EnergyInsight covers the whole life cycle of a dataset in one web app:

**Import → Explore → Analyze → Visualize → Share**

Built as a team project at INPT (Rabat) by **EL HADI Zineb, MIMIS Amine, DIHAJI Youssef and CHOUAI Chihab**, then extended with automated tests, CI and Docker.

## Quick start

With Docker, one command:

```bash
docker compose up --build
```

Then open **http://localhost:8080**. The database is created and filled with demo data on the first start. The interactive API documentation is at **http://localhost:8080/api/docs**.

|Role|Email|Password|
|-|-|-|
|Admin|admin@energyinsight.ma|Admin1234|
|Analyst|sara@energyinsight.ma|Sara12345|
|Analyst|youssef@energyinsight.ma|Youssef123|

Without Docker, see [Local development](#local-development).

## Features

|||
|-|-|
|**Import**|CSV upload with automatic delimiter and column-type detection (numbers, French decimal commas, dates, text); missing-value markers normalized|
|**Explore**|Server-side search, filters, sorting and pagination; descriptive statistics per column|
|**Analyze**|Visual builder: 1–4 indicators (sum, avg, min, max, count), group by any column, filters, rankings; live preview|
|**Visualize**|Bar, line, pie, KPI cards and tables; dashboards whose filters recompute every widget at once|
|**Share**|Private, shared with the team, or public through an unguessable link; others can copy a shared analysis|
|**Data quality score**|0–100 score and A–D grade from completeness, uniqueness and consistency, with recommendations|
|**Outlier detection**|Tukey's IQR fences on every numeric column, with the most extreme rows|
|**Forecast**|Least-squares linear trend extended N periods, drawn dashed, with slope and R²|
|**Administration**|Platform KPIs, 30-day activity, user management (roles, disable, delete), audit log|

|Explorer|Analysis builder with forecast|
|-|-|
|!\[Explorer filtered on Morocco](docs/screenshots/explorer.png)|!\[Analysis builder with a linear forecast to 2030](docs/screenshots/analysis-forecast.png)|
|**Data quality score**|**Outlier detection (IQR)**|
|!\[Data quality score, 84 out of 100](docs/screenshots/data-quality.png)|!\[Outliers per numeric column](docs/screenshots/outliers.png)|
|**Administration**|**API documentation (Swagger)**|
|!\[Admin dashboard](docs/screenshots/admin.png)|!\[Swagger UI](docs/screenshots/swagger.png)|

## Architecture

!\[Architecture: React front-end, Express REST API, PostgreSQL](docs/architecture.svg)

* **Front-end:** React 18, Vite, React Router, Tailwind CSS, Recharts. Displays and navigates; never decides access rights.
* **API:** Node.js and Express, layered `routes → controllers → services`, with middlewares for JWT authentication, role checks, zod validation and a single error format. 36 endpoints.
* **Database:** PostgreSQL, 6 tables ([data model](docs/data-model.svg)), plain parameterized SQL through `pg`.
* **Data pipeline:** [`database/prepare\_data.py`](database/prepare_data.py) (pandas) rebuilds the demo datasets from the raw Our World in Data file (23,377 rows × 130 columns): aggregates removed, columns selected, no value created or modified.

Full design document (in French): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Key design decisions

**Any CSV, one fixed schema.** Each uploaded row is stored as a JSONB object, with the dataset's typed column list kept alongside. No table is created at upload time, yet PostgreSQL still filters, sorts and aggregates inside the JSON (`(data->>'year')::numeric`). *Trade-off:* beyond millions of rows a dedicated or columnar table would be faster; for this scale, queries take milliseconds.

**One analysis = one SQL query.** An analysis is stored as a JSON configuration, not as data. The engine ([`analysis.engine.js`](backend/src/services/analysis.engine.js)) translates it into a single aggregate query, so only the result, a few dozen rows, reaches the browser.

**User-chosen columns without SQL injection.** Column names are checked against the dataset's known columns **and** sent as SQL parameters, like every value; sort directions and operators come from fixed lists. `?sortBy=year; DROP TABLE users` returns `400 Unknown column`, and a test checks it.

**Reusable analyses.** A dashboard filter replaces the analysis filter on the same column, so one "Morocco" analysis works for any country.

### Security

|Concern|Implementation|
|-|-|
|Passwords|bcrypt hashes; identical error for unknown email and wrong password; login rate limiting|
|Sessions|JWT checked on every request; the user is reloaded each time, so a disabled account is blocked immediately|
|Authorization|Role middleware and owner / shared / public rules in every service, enforced by the API (the UI only mirrors them)|
|Input|A zod schema for every body and query; CSV only, 10 MB max|
|Public links|Random 48-bit slugs, removed when a dashboard stops being public; only the owner's own widgets are exposed|

## Testing and CI

|Suite|Tool|Covers|
|-|-|-|
|API (33 tests)|Jest + Supertest, real PostgreSQL|auth, access rules, CSV import, explorer, SQL-injection guard, analysis engine, forecast, dashboards, public links, admin|
|Unit (10 tests)|Jest|CSV parsing and type detection, least-squares forecast|
|Pipeline (4 tests)|pytest|aggregate removal, row filtering, rounding, no invented values|

GitHub Actions runs all three suites and the front-end build on every push and pull request, with PostgreSQL as a service container.

```bash
cd backend \&\& npm test                    # needs a local PostgreSQL (see below)
cd database \&\& pytest                     # pip install -r requirements-dev.txt
```

The API tests use a separate `energy\_insight\_test` database, created automatically. Override it with `TEST\_DATABASE\_URL`.

## API

REST API documented with OpenAPI 3:

* **Swagger UI:** `/api/docs`. Log in with `POST /auth/login`, click *Authorize*, paste the token.
* **Postman:** [`docs/EnergyInsight.postman\_collection.json`](docs/EnergyInsight.postman_collection.json). *Auth → Log in* saves the token automatically.
* Both are generated from a single description, [`backend/src/docs/endpoints.js`](backend/src/docs/endpoints.js) (`npm run docs:build`), so they cannot drift apart.

## Local development

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
# 1. database
psql -U postgres -c "CREATE DATABASE energy\_insight;"

# 2. API  (http://localhost:4000/api)
cd backend
cp .env.example .env        # then set your PostgreSQL password in DATABASE\_URL
npm install
npm run db:setup            # tables + demo accounts + datasets (resets the database)
npm run dev

# 3. front-end, in a second terminal  (http://localhost:5173)
cd frontend
npm install
npm run dev
```

On Windows PowerShell, if `npm` is blocked: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

To rebuild the demo datasets from the latest Our World in Data release:

```bash
pip install -r database/requirements.txt
python database/prepare\_data.py
```

## Project structure

```
backend/          Express API: routes, controllers, services, middlewares, validators, tests
frontend/         React app: pages, components, API layer, hooks
database/         schema.sql, demo CSVs, prepare\_data.py and its tests
docs/             architecture document, diagrams, OpenAPI spec, Postman collection, screenshots
.github/          CI workflow
docker-compose.yml
```

## Roadmap

* Session token in an httpOnly cookie instead of `localStorage`
* Excel and JSON import; direct connection to open-data APIs
* Choropleth map (ISO country codes are already in the data)
* More realistic forecasting (ARIMA, Prophet)
* Responsive layout for mobile

## Credits

Data: [Our World in Data — Energy](https://github.com/owid/energy-data), licensed CC BY 4.0, compiling the Energy Institute *Statistical Review of World Energy*, Ember and the U.S. EIA.

