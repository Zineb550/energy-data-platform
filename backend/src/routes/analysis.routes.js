const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/analysis.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const a = require('../utils/asyncHandler');
const s = require('../validators/analysis.schemas');

const idParam = validate(z.object({ id: z.coerce.number().int().positive() }), 'params');

router.use(authenticate);

router.post('/run', validate(s.runAnalysisSchema), a(ctrl.run));
router.get('/', a(ctrl.list));
router.post('/', validate(s.analysisSchema), a(ctrl.create));
router.get('/:id', idParam, a(ctrl.getOne));
router.put('/:id', idParam, validate(s.analysisUpdateSchema), a(ctrl.update));
router.delete('/:id', idParam, a(ctrl.remove));

module.exports = router;
