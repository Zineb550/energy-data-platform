// Entry point of every API route: /api/...
const router = require('express').Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth.routes'));
router.use('/datasets', require('./dataset.routes'));
router.use('/analyses', require('./analysis.routes'));
router.use('/dashboards', require('./dashboard.routes'));
router.use('/public', require('./public.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
