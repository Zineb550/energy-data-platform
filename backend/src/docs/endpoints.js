// Single description of every API endpoint.
// It generates both the Swagger page (/api/docs) and the Postman collection,
// so the two documentations can never disagree.
//
// auth: 'public' = no token, 'user' = any logged-in user, 'admin' = admin only

const config = {
  metrics: [{ agg: 'avg', column: 'renewables_share_energy' }],
  groupBy: 'year',
  filters: [{ column: 'country', op: 'eq', value: 'Morocco' }],
  sort: 'label_asc',
  limit: 50,
  chart: 'line',
  forecast: { periods: 5 },
};

module.exports = [
  // ---------------- Auth ----------------
  {
    tag: 'Auth', method: 'post', path: '/auth/register', auth: 'public', summary: 'Create an account',
    description: 'Creates a user (role "user"). The password is hashed with bcrypt. Returns a JWT.',
    body: { name: 'Nadia Test', email: 'nadia@example.com', password: 'Password123' },
    responses: { 201: 'Account created, returns { user, token }', 400: 'Invalid data', 409: 'Email already used', 429: 'Too many attempts' },
  },
  {
    tag: 'Auth', method: 'post', path: '/auth/login', auth: 'public', summary: 'Log in',
    description: 'Returns a JWT valid 1 day. Send it as "Authorization: Bearer <token>". In Postman, the token is saved automatically.',
    body: { email: 'sara@energyinsight.ma', password: 'Sara12345' },
    responses: { 200: 'Logged in, returns { user, token }', 401: 'Incorrect email or password', 403: 'Account disabled', 429: 'Too many attempts' },
  },
  { tag: 'Auth', method: 'get', path: '/auth/me', auth: 'user', summary: 'Current user', responses: { 200: 'The logged-in user', 401: 'Not logged in' } },
  { tag: 'Auth', method: 'put', path: '/auth/me', auth: 'user', summary: 'Update my name', body: { name: 'Sara Analyst' }, responses: { 200: 'Updated user' } },
  {
    tag: 'Auth', method: 'put', path: '/auth/me/password', auth: 'user', summary: 'Change my password',
    description: 'The example keeps the same password, so the demo account still works after running the collection.',
    body: { currentPassword: 'Sara12345', newPassword: 'Sara12345' },
    responses: { 200: 'Password updated', 400: 'Current password incorrect' },
  },

  // ---------------- Datasets ----------------
  { tag: 'Datasets', method: 'get', path: '/datasets/categories', auth: 'user', summary: 'List of categories', responses: { 200: '{ categories }' } },
  {
    tag: 'Datasets', method: 'get', path: '/datasets', auth: 'user', summary: 'List datasets',
    query: [
      { name: 'scope', example: 'all', description: 'mine | shared | all' },
      { name: 'search', example: 'energy', description: 'Text searched in title, description, category' },
    ],
    responses: { 200: '{ datasets }' },
  },
  {
    tag: 'Datasets', method: 'post', path: '/datasets', auth: 'user', summary: 'Import a CSV file',
    description: 'multipart/form-data. Column types (number, date, text) are detected automatically. Max 10 MB.',
    form: [
      { key: 'file', type: 'file', description: 'The .csv file' },
      { key: 'title', value: 'My energy data' },
      { key: 'description', value: 'Imported from Postman' },
      { key: 'category', value: 'Energy', description: 'Energy | Electricity | Environment | Economy | Other' },
      { key: 'source', value: 'Our World in Data' },
      { key: 'visibility', value: 'private', description: 'private | shared' },
    ],
    responses: { 201: '{ dataset }', 400: 'Invalid file or data' },
  },
  { tag: 'Datasets', method: 'get', path: '/datasets/{id}', auth: 'user', summary: 'Dataset details (with columns)', params: { id: 1 }, responses: { 200: '{ dataset }', 403: 'No access', 404: 'Not found' } },
  {
    tag: 'Datasets', method: 'get', path: '/datasets/{id}/rows', auth: 'user', summary: 'Rows: search, filters, sort, pagination', params: { id: 1 },
    query: [
      { name: 'page', example: '1' },
      { name: 'pageSize', example: '25', description: '1 to 200' },
      { name: 'search', example: '', description: 'Text searched in every column' },
      { name: 'sortBy', example: 'year' },
      { name: 'sortDir', example: 'desc', description: 'asc | desc' },
      { name: 'filters', example: '[{"column":"country","op":"eq","value":"Morocco"}]', description: 'JSON array. op: eq, neq, gt, gte, lt, lte, contains' },
    ],
    responses: { 200: '{ rows, total, page, pageSize, totalPages }', 400: 'Unknown column or invalid filter' },
  },
  { tag: 'Datasets', method: 'get', path: '/datasets/{id}/stats', auth: 'user', summary: 'Automatic statistics (types, missing values, min/max/mean...)', params: { id: 1 }, responses: { 200: '{ stats }' } },
  { tag: 'Advanced features', method: 'get', path: '/datasets/{id}/quality', auth: 'user', summary: 'Data quality score (0-100)', params: { id: 1 }, description: 'Completeness (50 pts), uniqueness (25 pts), consistency (25 pts), grade A-D and recommendations.', responses: { 200: '{ quality }' } },
  {
    tag: 'Advanced features', method: 'get', path: '/datasets/{id}/outliers', auth: 'user', summary: 'Outlier detection (IQR method)', params: { id: 1 },
    description: 'Without "column": fences and outlier count for every numeric column. With "column": the most extreme rows of that column.',
    query: [{ name: 'column', example: 'energy_per_capita', description: 'Optional numeric column' }],
    responses: { 200: '{ columns } or { detail }', 400: 'Column is not numeric' },
  },
  {
    tag: 'Datasets', method: 'put', path: '/datasets/{id}', auth: 'user', summary: 'Edit dataset information (owner or admin)', params: { id: 1 },
    body: { visibility: 'shared' },
    responses: { 200: '{ dataset }', 403: 'Not the owner' },
  },
  { tag: 'Datasets', method: 'delete', path: '/datasets/{id}', auth: 'user', summary: 'Delete a dataset (owner or admin)', params: { id: 99 }, responses: { 204: 'Deleted', 403: 'Not the owner' } },

  // ---------------- Analyses ----------------
  {
    tag: 'Analyses', method: 'post', path: '/analyses/run', auth: 'user', summary: 'Run an analysis without saving it (preview)',
    description: 'metrics: 1-4 indicators (agg: sum | avg | min | max | count). groupBy: column or null. chart: bar | line | pie | kpi | table. forecast: optional { periods } (needs a numeric time grouping such as year).',
    body: { datasetId: 1, config },
    responses: { 200: '{ result }: groups, values and optional forecast', 400: 'Invalid configuration' },
  },
  { tag: 'Analyses', method: 'get', path: '/analyses', auth: 'user', summary: 'List analyses', query: [{ name: 'scope', example: 'all', description: 'mine | shared | all' }], responses: { 200: '{ analyses }' } },
  {
    tag: 'Analyses', method: 'post', path: '/analyses', auth: 'user', summary: 'Save an analysis',
    body: { datasetId: 1, name: 'Morocco renewables trend', description: 'Created from Postman', visibility: 'private', config },
    responses: { 201: '{ analysis }', 400: 'Invalid data' },
  },
  { tag: 'Analyses', method: 'get', path: '/analyses/{id}', auth: 'user', summary: 'Analysis and its computed result', params: { id: 2 }, responses: { 200: '{ analysis, result }', 403: 'Private analysis of someone else' } },
  { tag: 'Analyses', method: 'put', path: '/analyses/{id}', auth: 'user', summary: 'Update an analysis (owner or admin)', params: { id: 2 }, body: { visibility: 'shared' }, responses: { 200: '{ analysis }' } },
  { tag: 'Analyses', method: 'delete', path: '/analyses/{id}', auth: 'user', summary: 'Delete an analysis (owner or admin)', params: { id: 99 }, responses: { 204: 'Deleted' } },

  // ---------------- Dashboards ----------------
  { tag: 'Dashboards', method: 'get', path: '/dashboards', auth: 'user', summary: 'List dashboards', query: [{ name: 'scope', example: 'all', description: 'mine | shared | all' }], responses: { 200: '{ dashboards }' } },
  {
    tag: 'Dashboards', method: 'post', path: '/dashboards', auth: 'user', summary: 'Create a dashboard',
    description: 'visibility: private | shared | public. A public dashboard receives a random link (publicSlug).',
    body: {
      name: 'My dashboard', description: '', visibility: 'private',
      widgets: [{ analysisId: 1, size: 'full' }, { analysisId: 2, size: 'half' }],
      filterColumns: ['country'], defaultFilters: [{ column: 'country', value: 'Morocco' }],
    },
    responses: { 201: '{ dashboard }', 400: 'Invalid data or inaccessible analysis' },
  },
  { tag: 'Dashboards', method: 'get', path: '/dashboards/{id}', auth: 'user', summary: 'Dashboard and the values of its filters', params: { id: 1 }, responses: { 200: '{ dashboard, filterOptions }' } },
  {
    tag: 'Dashboards', method: 'post', path: '/dashboards/{id}/data', auth: 'user', summary: 'Compute every widget with the chosen filters', params: { id: 1 },
    description: 'A dashboard filter replaces the analysis filter on the same column.',
    body: { filters: [{ column: 'country', value: 'Germany' }] },
    responses: { 200: '{ widgets }' },
  },
  { tag: 'Dashboards', method: 'put', path: '/dashboards/{id}', auth: 'user', summary: 'Update a dashboard (owner or admin)', params: { id: 1 }, body: { visibility: 'public' }, responses: { 200: '{ dashboard }' } },
  { tag: 'Dashboards', method: 'delete', path: '/dashboards/{id}', auth: 'user', summary: 'Delete a dashboard (owner or admin)', params: { id: 99 }, responses: { 204: 'Deleted' } },

  // ---------------- Public ----------------
  { tag: 'Public (visitors)', method: 'get', path: '/public/dashboards', auth: 'public', summary: 'List public dashboards', responses: { 200: '{ dashboards }' } },
  { tag: 'Public (visitors)', method: 'get', path: '/public/dashboards/{slug}', auth: 'public', summary: 'A public dashboard', params: { slug: 'a1b2c3d4e5f6' }, responses: { 200: '{ dashboard, filterOptions }', 404: 'Not public' } },
  {
    tag: 'Public (visitors)', method: 'post', path: '/public/dashboards/{slug}/data', auth: 'public', summary: 'Compute a public dashboard', params: { slug: 'a1b2c3d4e5f6' },
    body: { filters: [{ column: 'country', value: 'France' }] },
    responses: { 200: '{ widgets }' },
  },

  // ---------------- Admin ----------------
  { tag: 'Administration', method: 'get', path: '/admin/stats', auth: 'admin', summary: 'Global indicators and activity', responses: { 200: '{ totals, activityByDay, actions, topUsers, recentUsers }', 403: 'Not an admin' } },
  { tag: 'Administration', method: 'get', path: '/admin/users', auth: 'admin', summary: 'List users', query: [{ name: 'search', example: '', description: 'Name or email' }], responses: { 200: '{ users }' } },
  {
    tag: 'Administration', method: 'put', path: '/admin/users/{id}', auth: 'admin', summary: 'Change role or status of a user', params: { id: 4 },
    description: 'status: active | disabled. role: user | admin. Try { "status": "disabled" } then log in as Karim: refused.',
    body: { status: 'active' },
    responses: { 200: '{ user }', 400: 'Cannot change your own account' },
  },
  { tag: 'Administration', method: 'delete', path: '/admin/users/{id}', auth: 'admin', summary: 'Delete a user and their content', params: { id: 99 }, responses: { 204: 'Deleted', 400: 'Cannot delete your own account' } },
  { tag: 'Administration', method: 'get', path: '/admin/datasets', auth: 'admin', summary: 'Every dataset on the platform', responses: { 200: '{ datasets }' } },
  {
    tag: 'Administration', method: 'get', path: '/admin/activity', auth: 'admin', summary: 'Activity log (paginated)',
    query: [
      { name: 'page', example: '1' },
      { name: 'pageSize', example: '25' },
      { name: 'action', example: '', description: 'e.g. LOGIN, DATASET_IMPORT' },
    ],
    responses: { 200: '{ rows, total, page, pageSize, totalPages }' },
  },
];
