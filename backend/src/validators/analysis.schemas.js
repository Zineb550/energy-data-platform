const { z } = require('zod');
const { filterSchema } = require('./dataset.schemas');

const AGGREGATIONS = ['sum', 'avg', 'min', 'max', 'count'];
const CHARTS = ['bar', 'line', 'pie', 'kpi', 'table'];
const SORTS = ['label_asc', 'label_desc', 'value_desc', 'value_asc'];

// One indicator: "average of renewables_share_energy", "count of rows"...
const metricSchema = z
  .object({
    agg: z.enum(AGGREGATIONS),
    column: z.string().min(1).nullable().optional(),
  })
  .refine((m) => m.agg === 'count' || m.column, { message: 'Choose a column for this indicator' });

// Everything that defines an analysis.
const analysisConfigSchema = z.object({
  metrics: z.array(metricSchema).min(1, 'Add at least one indicator').max(4, 'Maximum 4 indicators'),
  groupBy: z.string().min(1).nullable().optional().default(null),
  filters: z.array(filterSchema).max(10).optional().default([]),
  sort: z.enum(SORTS).optional().default('label_asc'),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  chart: z.enum(CHARTS).optional().default('bar'),
  // Advanced feature: linear trend forecast for N future periods (e.g. 5 years).
  forecast: z
    .object({ periods: z.coerce.number().int().min(1).max(10) })
    .nullable()
    .optional()
    .default(null),
});

const runAnalysisSchema = z.object({
  datasetId: z.coerce.number().int().positive(),
  config: analysisConfigSchema,
});

const analysisSchema = z.object({
  datasetId: z.coerce.number().int().positive(),
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).optional().default(''),
  visibility: z.enum(['private', 'shared']).optional().default('private'),
  config: analysisConfigSchema,
});

const analysisUpdateSchema = analysisSchema.omit({ datasetId: true }).partial();

module.exports = {
  AGGREGATIONS,
  CHARTS,
  SORTS,
  analysisConfigSchema,
  runAnalysisSchema,
  analysisSchema,
  analysisUpdateSchema,
};
