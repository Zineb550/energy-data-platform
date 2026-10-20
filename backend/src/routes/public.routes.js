// Routes open to visitors (no login): public dashboards only.
const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/dashboard.controller');
const validate = require('../middlewares/validate');
const a = require('../utils/asyncHandler');
const { dashboardDataSchema } = require('../validators/dashboard.schemas');

const slugParam = validate(z.object({ slug: z.string().regex(/^[a-f0-9]{12}$/, 'Invalid link') }), 'params');

router.get('/dashboards', a(ctrl.publicList));
router.get('/dashboards/:slug', slugParam, a(ctrl.publicGet));
router.post('/dashboards/:slug/data', slugParam, validate(dashboardDataSchema), a(ctrl.publicData));

module.exports = router;
