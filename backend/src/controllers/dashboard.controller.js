const dashboardService = require('../services/dashboard.service');

const present = (d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  visibility: d.visibility,
  publicSlug: d.public_slug,
  widgets: d.widgets,
  filterColumns: d.filter_columns,
  defaultFilters: d.default_filters,
  ownerId: d.owner_id,
  ownerName: d.owner_name,
  canEdit: d.can_edit,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

async function list(req, res) {
  const scope = ['mine', 'shared', 'all'].includes(req.query.scope) ? req.query.scope : 'all';
  res.json({ dashboards: await dashboardService.list(req.user, { scope }) });
}

async function create(req, res) {
  const dashboard = await dashboardService.create(req.user, req.body);
  res.status(201).json({ dashboard: present(dashboard) });
}

// Dashboard + the values available in its filters.
async function getOne(req, res) {
  const dashboard = await dashboardService.getDashboard(req.params.id, req.user);
  const filterOptions = await dashboardService.getFilterOptions(dashboard);
  res.json({ dashboard: present(dashboard), filterOptions });
}

// Results of every widget, computed with the viewer's filters.
async function data(req, res) {
  const dashboard = await dashboardService.getDashboard(req.params.id, req.user);
  res.json({ widgets: await dashboardService.getData(dashboard, req.user, req.body.filters) });
}

async function update(req, res) {
  const dashboard = await dashboardService.getDashboard(req.params.id, req.user, { write: true });
  const updated = await dashboardService.update(dashboard, req.user, req.body);
  res.json({ dashboard: present(updated) });
}

async function remove(req, res) {
  const dashboard = await dashboardService.getDashboard(req.params.id, req.user, { write: true });
  await dashboardService.remove(dashboard, req.user);
  res.status(204).end();
}

// ----- Public access (visitors, no login) -----

async function publicList(req, res) {
  res.json({ dashboards: await dashboardService.listPublic() });
}

async function publicGet(req, res) {
  const dashboard = await dashboardService.getPublicDashboard(req.params.slug);
  const filterOptions = await dashboardService.getFilterOptions(dashboard);
  const { ownerId, canEdit, ...pub } = present(dashboard);
  res.json({ dashboard: pub, filterOptions });
}

async function publicData(req, res) {
  const dashboard = await dashboardService.getPublicDashboard(req.params.slug);
  const widgets = await dashboardService.getData(dashboard, null, req.body.filters, { isPublicView: true });
  res.json({ widgets });
}

module.exports = { list, create, getOne, data, update, remove, publicList, publicGet, publicData };
