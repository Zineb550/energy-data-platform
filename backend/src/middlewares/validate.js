// Validates req.body / req.query / req.params against a zod schema.
// Invalid input never reaches the controller: the client gets a 400
// with the list of problems, field by field.
const AppError = require('../utils/AppError');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError(400, 'Invalid data', details));
  }
  // Replace the raw input with the cleaned, typed version.
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};

module.exports = validate;
