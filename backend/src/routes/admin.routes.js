// Administration routes: logged-in AND role = admin.
const router = require('express').Router();
const { z } = require('zod');
const adminService = require('../services/admin.service');
const validate = require('../middlewares/validate');
const { authenticate, requireRole } = require('../middlewares/auth');
const a = require('../utils/asyncHandler');

const idParam = validate(z.object({ id: z.coerce.number().int().positive() }), 'params');
const userUpdateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().regex(/^[A-Z_]+$/).optional(),
});

router.use(authenticate, requireRole('admin'));

router.get('/stats', a(async (req, res) => res.json(await adminService.getStats())));

router.get(
  '/users',
  a(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
    res.json({ users: await adminService.listUsers({ search }) });
  })
);
router.put(
  '/users/:id',
  idParam,
  validate(userUpdateSchema),
  a(async (req, res) => res.json({ user: await adminService.updateUser(req.user, req.params.id, req.body) }))
);
router.delete(
  '/users/:id',
  idParam,
  a(async (req, res) => {
    await adminService.deleteUser(req.user, req.params.id);
    res.status(204).end();
  })
);

router.get('/datasets', a(async (req, res) => res.json({ datasets: await adminService.listDatasets() })));

router.get(
  '/activity',
  validate(activityQuerySchema, 'query'),
  a(async (req, res) => res.json(await adminService.listActivity(req.validatedQuery)))
);

module.exports = router;
