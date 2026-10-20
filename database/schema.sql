-- =============================================================
-- EnergyInsight — database schema (PostgreSQL 14+)
-- Run with:  psql -U postgres -d energy_insight -f database/schema.sql
-- (or simply:  npm run db:setup  from the backend folder)
-- =============================================================

DROP TABLE IF EXISTS activity_log  CASCADE;
DROP TABLE IF EXISTS dashboards    CASCADE;
DROP TABLE IF EXISTS analyses      CASCADE;
DROP TABLE IF EXISTS dataset_rows  CASCADE;
DROP TABLE IF EXISTS datasets      CASCADE;
DROP TABLE IF EXISTS users         CASCADE;

-- -------------------------------------------------------------
-- Users: one table for every role (user / admin)
-- -------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,                       -- bcrypt hash, never the password
  role          VARCHAR(10)  NOT NULL DEFAULT 'user'  CHECK (role   IN ('user', 'admin')),
  status        VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Datasets: metadata of an imported file
-- "columns" describes the file: [{ "name": "year", "type": "number" }, ...]
-- -------------------------------------------------------------
CREATE TABLE datasets (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(150) NOT NULL,
  description TEXT,
  category    VARCHAR(50)  NOT NULL,
  source      VARCHAR(255),
  columns     JSONB        NOT NULL,
  row_count   INTEGER      NOT NULL DEFAULT 0,
  visibility  VARCHAR(10)  NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Dataset rows: one line of the CSV = one JSONB object
-- This lets the platform accept ANY CSV without creating new tables.
-- -------------------------------------------------------------
CREATE TABLE dataset_rows (
  id         BIGSERIAL PRIMARY KEY,
  dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index  INTEGER NOT NULL,                               -- original line order
  data       JSONB   NOT NULL
);
CREATE INDEX idx_rows_dataset ON dataset_rows (dataset_id, row_index);

-- -------------------------------------------------------------
-- Analyses: a saved configuration (indicators, grouping, filters, chart)
-- config = { "metrics": [{ "agg": "avg", "column": "renewables_share_energy" }],
--            "groupBy": "year", "filters": [...], "sort": "label_asc",
--            "limit": 50, "chart": "line" }
-- -------------------------------------------------------------
CREATE TABLE analyses (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  dataset_id  INTEGER      NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  config      JSONB        NOT NULL,
  visibility  VARCHAR(10)  NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Dashboards: several analyses shown together as widgets
--   widgets         = [{ "analysisId": 3, "size": "half" }, ...]   (display order)
--   filter_columns  = ["country", "year"]   filters offered to the viewer
--   default_filters = [{ "column": "country", "value": "Morocco" }]
-- -------------------------------------------------------------
CREATE TABLE dashboards (
  id              SERIAL PRIMARY KEY,
  owner_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  widgets         JSONB        NOT NULL DEFAULT '[]',
  filter_columns  JSONB        NOT NULL DEFAULT '[]',
  default_filters JSONB        NOT NULL DEFAULT '[]',
  visibility      VARCHAR(10)  NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  public_slug     VARCHAR(40)  UNIQUE,                      -- public link: /p/<slug>
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Activity log: feeds the administration dashboard
-- -------------------------------------------------------------
CREATE TABLE activity_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,                        -- e.g. LOGIN, DATASET_IMPORT
  target     VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_date ON activity_log (created_at DESC);
