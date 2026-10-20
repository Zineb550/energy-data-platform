const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Invalid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

module.exports = { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema };
