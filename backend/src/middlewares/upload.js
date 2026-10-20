// Receives an uploaded CSV in memory (no temporary file on disk).
const multer = require('multer');
const AppError = require('../utils/AppError');

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const isCsv = file.originalname.toLowerCase().endsWith('.csv');
    cb(isCsv ? null : new AppError(400, 'Only .csv files are accepted'), isCsv);
  },
}).single('file');

module.exports = uploadCsv;
