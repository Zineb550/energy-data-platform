const analysisService = require('../services/analysis.service');

const present = (a) => ({
  id: a.id,
  name: a.name,
  description: a.description,
  visibility: a.visibility,
  config: a.config,
  datasetId: a.dataset_id,
  datasetTitle: a.dataset_title,
  datasetColumns: a.dataset_columns,
  ownerId: a.owner_id,
  ownerName: a.owner_name,
  canEdit: a.can_edit,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

// Runs a configuration without saving it (live preview of the builder).
async function run(req, res) {
  res.json({ result: await analysisService.preview(req.user, req.body) });
}

async function list(req, res) {
  const analyses = await analysisService.list(req.user, {
    scope: ['mine', 'shared', 'all'].includes(req.query.scope) ? req.query.scope : 'all',
    datasetId: Number(req.query.datasetId) || undefined,
  });
  res.json({ analyses });
}

async function create(req, res) {
  const analysis = await analysisService.create(req.user, req.body);
  res.status(201).json({ analysis: present(analysis) });
}

// Returns the analysis AND its result, ready to draw.
async function getOne(req, res) {
  const analysis = await analysisService.getAnalysis(req.params.id, req.user);
  const result = await analysisService.getResult(analysis);
  res.json({ analysis: present(analysis), result });
}

async function update(req, res) {
  const analysis = await analysisService.getAnalysis(req.params.id, req.user, { write: true });
  const updated = await analysisService.update(analysis, req.user, req.body);
  res.json({ analysis: present(updated) });
}

async function remove(req, res) {
  const analysis = await analysisService.getAnalysis(req.params.id, req.user, { write: true });
  await analysisService.remove(analysis, req.user);
  res.status(204).end();
}

module.exports = { run, list, create, getOne, update, remove, present };
