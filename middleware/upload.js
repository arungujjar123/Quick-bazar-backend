/*
 * =====================================================
 * FILE UPLOAD MIDDLEWARE (Multer)
 * =====================================================
 *
 * Yeh middleware Excel/CSV file uploads handle karta hai
 * Memory storage use karta hai (disk par save nahi karta,
 * directly buffer mein read karke parse karta hai)
 *
 * Supported file types:
 * - .xlsx (Excel 2007+)
 * - .xls  (Excel 97-2003)
 * - .csv  (Comma Separated Values)
 */

const multer = require("multer");
const path = require("path");

// ============ Memory Storage Configuration ============
// File ko disk par save nahi karta, RAM buffer mein rakhta hai
// Yeh fast hai aur temporary files ka cleanup nahi karna padta
const storage = multer.memoryStorage();

// ============ File Filter - Sirf Excel/CSV Allow Karo ============
const excelFileFilter = (req, file, cb) => {
  const allowedExtensions = [".xlsx", ".xls", ".csv"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true); // File accept karo
  } else {
    cb(
      new Error(
        `Invalid file type "${ext}". Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.`
      ),
      false
    );
  }
};

// ============ Multer Instance for Excel/CSV Uploads ============
const uploadExcel = multer({
  storage: storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB file size
  },
});

module.exports = { uploadExcel };
