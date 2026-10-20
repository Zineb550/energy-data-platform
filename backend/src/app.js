// Builds the Express application (middlewares + routes).
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const { buildOpenApi } = require('./docs/openapi');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Interactive API documentation (Swagger UI). Declared before helmet,
// whose strict content policy would block the documentation page's scripts.
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApi(), { customSiteTitle: 'EnergyInsight API' }));

app.use(helmet()); // secure HTTP headers
app.use(cors({ origin: env.clientUrl })); // only our React app may call the API
app.use(express.json({ limit: '1mb' })); // JSON bodies
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev')); // request logs in the terminal

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
