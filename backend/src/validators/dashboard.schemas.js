const { z } = require('zod');

const widgetSchema = z.object({
  analysisId: z.coerce.number().int().positive(),
  size: z.enum(['half', 'full']).optional().default('half'),
});

// Dashboard filters are always "column = value", chosen from a list.
const dashboardFilterSchema = z.object({
  column: z.string().min(1),
  value: z.union([z.string(), z.number()]),
});

const dashboardSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).optional().default(''),
  visibility: z.enum(['private', 'shared', 'public']).optional().default('private'),
  widgets: z.array(widgetSchema).max(12, 'Maximum 12 widgets').optional().default([]),
  filterColumns: z.array(z.string().min(1)).max(4, 'Maximum 4 filters').optional().default([]),
  defaultFilters: z.array(dashboardFilterSchema).max(4).optional().default([]),
});

const dashboardUpdateSchema = dashboardSchema.partial();

// Filters chosen by the viewer when looking at a dashboard.
const dashboardDataSchema = z.object({
  filters: z.array(dashboardFilterSchema).max(4).optional().default([]),
});

module.exports = { dashboardSchema, dashboardUpdateSchema, dashboardDataSchema };
