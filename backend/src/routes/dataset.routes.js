const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/dataset.controller');
const validate = require('../middlewares/validate');
const uploadCsv = require('../middlewares/upload');
const { authenticate } = require('../middlewares/auth');
const a = require('../utils/asyncHandler');
const s = require('../validators/dataset.schemas');

const idParam = validate(z.object({ id: z.coerce.number().int().positive() }), 'params');

// Every dataset route requires a logged-in user.
router.use(authenticate);

router.get('/categories', a(ctrl.categories));
router.get('/', a(ctrl.list));
router.post('/', uploadCsv, a(ctrl.create));
router.get('/:id', idParam, a(ctrl.getOne));
router.get('/:id/rows', idParam, validate(s.rowsQuerySchema, 'query'), a(ctrl.rows));
router.get('/:id/stats', idParam, a(ctrl.stats));
router.get('/:id/quality', idParam, a(ctrl.quality));
router.get('/:id/outliers', idParam, a(ctrl.outliers));
router.put('/:id', idParam, validate(s.datasetUpdateSchema), a(ctrl.update));
router.delete('/:id', idParam, a(ctrl.remove));

module.exports = router;
