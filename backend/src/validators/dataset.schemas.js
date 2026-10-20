const { z } = require('zod');

const CATEGORIES = ['Energy', 'Electricity', 'Environment', 'Economy', 'Other'];

// Metadata sent with the CSV upload (multipart form fields are strings).
const datasetMetaSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).optional().default(''),
  category: z.enum(CATEGORIES, { message: `Category must be one of: ${CATEGORIES.join(', ')}` }),
  source: z.string().trim().max(255).optional().default(''),
  visibility: z.enum(['private', 'shared']).optional().default('private'),
});

// Editing a dataset: every field is optional.
const datasetUpdateSchema = datasetMetaSchema.partial();

// One filter: { column: "country", op: "eq", value: "Morocco" }
const filterSchema = z.object({
  column: z.string().min(1),
  op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains']),
  value: z.union([z.string(), z.number()]),
});

// Query string of GET /datasets/:id/rows
const rowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  // filters arrive as a JSON string in the URL: ?filters=[{...}]
  filters: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return [];
      try {
        return z.array(filterSchema).max(10).parse(JSON.parse(s));
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid filters' });
        return z.NEVER;
      }
    }),
});

module.exports = { CATEGORIES, datasetMetaSchema, datasetUpdateSchema, filterSchema, rowsQuerySchema };
