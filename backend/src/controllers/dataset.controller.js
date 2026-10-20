const datasetService = require('../services/dataset.service');
const statsService = require('../services/stats.service');
const qualityService = require('../services/quality.service');
const outlierService = require('../services/outlier.service');
const { datasetMetaSchema, CATEGORIES } = require('../validators/dataset.schemas');
const AppError = require('../utils/AppError');

// Strips internal fields before sending a dataset to the client.
const present = (d) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  category: d.category,
  source: d.source,
  visibility: d.visibility,
  columns: d.columns,
  rowCount: d.row_count,
  ownerId: d.owner_id,
  ownerName: d.owner_name,
  canEdit: d.can_edit,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

async function categories(req, res) {
  res.json({ categories: CATEGORIES });
}

async function create(req, res) {
  if (!req.file) throw new AppError(400, 'Please choose a CSV file');
  // Form fields come with the file (multipart), so they are validated here.
  const parsed = datasetMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError(400, 'Invalid data', details);
  }
  const dataset = await datasetService.createFromCsv(req.user, parsed.data, req.file.buffer);
  res.status(201).json({ dataset: present({ ...dataset, can_edit: true }) });
}

async function list(req, res) {
  const datasets = await datasetService.list(req.user, {
    scope: ['mine', 'shared', 'all'].includes(req.query.scope) ? req.query.scope : 'all',
    search: typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '',
  });
  res.json({ datasets });
}

async function getOne(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user);
  res.json({ dataset: present(dataset) });
}

async function rows(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user);
  const result = await datasetService.getRows(dataset, req.validatedQuery);
  res.json(result);
}

async function stats(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user);
  res.json({ stats: await statsService.getDatasetStats(dataset) });
}

// Advanced feature 1: data quality score
async function quality(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user);
  res.json({ quality: await qualityService.getQuality(dataset) });
}

// Advanced feature 2: outliers (summary of all numeric columns, or detail of one)
async function outliers(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user);
  if (req.query.column) {
    res.json({ detail: await outlierService.detail(dataset, String(req.query.column)) });
  } else {
    res.json({ columns: await outlierService.summary(dataset) });
  }
}

async function update(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user, { write: true });
  const updated = await datasetService.update(dataset, req.user, req.body);
  res.json({ dataset: present({ ...updated, owner_name: dataset.owner_name, can_edit: true }) });
}

async function remove(req, res) {
  const dataset = await datasetService.getDatasetForUser(req.params.id, req.user, { write: true });
  await datasetService.remove(dataset, req.user);
  res.status(204).end();
}

module.exports = { categories, create, list, getOne, rows, stats, quality, outliers, update, remove };
