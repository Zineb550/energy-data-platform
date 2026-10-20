// Writes the API documentation files into docs/:
//   docs/openapi.json                        (OpenAPI 3, can be imported in Postman or Swagger)
//   docs/EnergyInsight.postman_collection.json
// Run with:  npm run docs:build
const fs = require('fs');
const path = require('path');
const endpoints = require('../src/docs/endpoints');
const { buildOpenApi } = require('../src/docs/openapi');

const DOCS = path.join(__dirname, '..', '..', 'docs');

// Postman: "/datasets/{id}" -> "/datasets/:id" with a path variable
function postmanRequest(e) {
  const pathParts = e.path.replace(/^\//, '').split('/').map((p) => p.replace(/^\{(.+)\}$/, ':$1'));
  const query = (e.query || []).map((q) => ({ key: q.name, value: q.example || '', description: q.description, disabled: !q.example }));
  const request = {
    method: e.method.toUpperCase(),
    header: [],
    description: [e.description, `Access: ${e.auth}`].filter(Boolean).join('\n\n'),
    url: {
      raw: `{{baseUrl}}/${pathParts.join('/')}${query.length ? '?' + query.filter((q) => !q.disabled).map((q) => `${q.key}=${q.value}`).join('&') : ''}`,
      host: ['{{baseUrl}}'],
      path: pathParts,
      query,
      variable: Object.entries(e.params || {}).map(([key, value]) => ({ key, value: String(value) })),
    },
  };
  if (e.auth === 'public') request.auth = { type: 'noauth' };
  if (e.auth === 'admin') request.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{adminToken}}', type: 'string' }] };
  if (e.body) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(e.body, null, 2), options: { raw: { language: 'json' } } };
  }
  if (e.form) {
    request.body = {
      mode: 'formdata',
      formdata: e.form.map((f) =>
        f.type === 'file' ? { key: f.key, type: 'file', src: [], description: f.description } : { key: f.key, value: f.value, type: 'text', description: f.description }
      ),
    };
  }
  return request;
}

// After "Log in", Postman stores the token in {{token}} automatically.
const saveTokenScript = (variable) => [
  'var data = pm.response.json();',
  'if (data.token) {',
  `  pm.collectionVariables.set("${variable}", data.token);`,
  '}',
  'pm.test("Logged in", function () {',
  '  pm.response.to.have.status(200);',
  '});',
];

function buildPostman() {
  const folders = [...new Set(endpoints.map((e) => e.tag))].map((tag) => ({
    name: tag,
    item: endpoints
      .filter((e) => e.tag === tag)
      .map((e) => {
        const item = { name: `${e.summary}`, request: postmanRequest(e) };
        if (e.path === '/auth/login') {
          item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: saveTokenScript('token') } }];
        }
        return item;
      }),
  }));

  // Extra request: log in as admin (fills {{adminToken}} for the Administration folder).
  const adminLogin = {
    name: 'Log in as admin (fills {{adminToken}})',
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: saveTokenScript('adminToken') } }],
    request: postmanRequest({
      method: 'post',
      path: '/auth/login',
      auth: 'public',
      body: { email: 'admin@energyinsight.ma', password: 'Admin1234' },
      description: 'Run this before the Administration requests.',
    }),
  };
  folders.find((f) => f.name === 'Administration').item.unshift(adminLogin);

  return {
    info: {
      name: 'EnergyInsight API',
      description:
        'Start with "Auth > Log in": the token is saved automatically and used by every request.\n' +
        'For the Administration folder, first run "Log in as admin".\n' +
        'Requires the API running on http://localhost:4000 (npm run dev in backend/).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000/api' },
      { key: 'token', value: '' },
      { key: 'adminToken', value: '' },
    ],
    item: folders,
  };
}

fs.writeFileSync(path.join(DOCS, 'openapi.json'), JSON.stringify(buildOpenApi(), null, 2));
fs.writeFileSync(path.join(DOCS, 'EnergyInsight.postman_collection.json'), JSON.stringify(buildPostman(), null, 2));
console.log(`Wrote docs/openapi.json and docs/EnergyInsight.postman_collection.json (${endpoints.length} endpoints)`);
