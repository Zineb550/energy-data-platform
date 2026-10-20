// Builds the OpenAPI 3 specification (shown by Swagger UI at /api/docs).
const endpoints = require('./endpoints');

const AUTH_NOTE = {
  public: 'Open to visitors (no token).',
  user: 'Requires a logged-in user (JWT).',
  admin: 'Requires an administrator (JWT with role admin).',
};

function buildOpenApi() {
  const paths = {};
  for (const e of endpoints) {
    const op = {
      tags: [e.tag],
      summary: e.summary,
      description: [e.description, AUTH_NOTE[e.auth]].filter(Boolean).join('\n\n'),
      parameters: [
        ...Object.entries(e.params || {}).map(([name, example]) => ({
          name,
          in: 'path',
          required: true,
          schema: { type: typeof example === 'number' ? 'integer' : 'string' },
          example,
        })),
        ...(e.query || []).map((q) => ({
          name: q.name,
          in: 'query',
          required: false,
          description: q.description,
          schema: { type: 'string' },
          example: q.example || undefined,
        })),
      ],
      responses: Object.fromEntries(
        Object.entries(e.responses).map(([code, description]) => [code, { description }])
      ),
    };
    if (e.auth !== 'public') op.security = [{ bearerAuth: [] }];
    if (e.body) op.requestBody = { required: true, content: { 'application/json': { example: e.body } } };
    if (e.form) {
      op.requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'title', 'category'],
              properties: Object.fromEntries(
                e.form.map((f) => [
                  f.key,
                  f.type === 'file'
                    ? { type: 'string', format: 'binary', description: f.description }
                    : { type: 'string', example: f.value, description: f.description },
                ])
              ),
            },
          },
        },
      };
    }
    paths[e.path] = { ...(paths[e.path] || {}), [e.method]: op };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'EnergyInsight API',
      version: '1.0.0',
      description:
        'REST API of the EnergyInsight data platform.\n\n' +
        '1. Call **POST /auth/login** (e.g. sara@energyinsight.ma / Sara12345, or admin@energyinsight.ma / Admin1234).\n' +
        '2. Copy the token, click **Authorize** and paste it.\n\n' +
        'Every error has the same format: `{ "error": { "message": "...", "details": [...] } }`.',
    },
    servers: [{ url: '/api' }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    tags: [...new Set(endpoints.map((e) => e.tag))].map((name) => ({ name })),
    paths,
  };
}

module.exports = { buildOpenApi };
