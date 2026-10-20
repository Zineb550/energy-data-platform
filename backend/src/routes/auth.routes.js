const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const a = require('../utils/asyncHandler');
const s = require('../validators/auth.schemas');

// Max 10 login/register attempts per 15 minutes per IP (slows down password guessing).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again in 15 minutes' } },
  // The automated test suite logs in many times in a row: no limit there.
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/register', authLimiter, validate(s.registerSchema), a(ctrl.register));
router.post('/login', authLimiter, validate(s.loginSchema), a(ctrl.login));
router.get('/me', authenticate, a(ctrl.me));
router.put('/me', authenticate, validate(s.updateProfileSchema), a(ctrl.updateProfile));
router.put('/me/password', authenticate, validate(s.changePasswordSchema), a(ctrl.changePassword));

module.exports = router;
