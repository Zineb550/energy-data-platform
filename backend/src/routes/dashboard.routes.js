const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/dashboard.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const a = require('../utils/asyncHandler');
const s = require('../validators/dashboard.schemas');

const idParam = validate(z.object({ id: z.coerce.number().int().positive() }), 'params');

router.use(authenticate);

router.get('/', a(ctrl.list));
router.post('/', validate(s.dashboardSchema), a(ctrl.create));
router.get('/:id', idParam, a(ctrl.getOne));
router.post('/:id/data', idParam, validate(s.dashboardDataSchema), a(ctrl.data));
router.put('/:id', idParam, validate(s.dashboardUpdateSchema), a(ctrl.update));
router.delete('/:id', idParam, a(ctrl.remove));

module.exports = router;
