import express from 'express';
import Certificate from '../models/Certificate.js';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import xlsx from 'xlsx';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper function to parse Excel file
const parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Error processing Excel file');
  }
};

// Bulk upload certificates from Excel
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Parse the Excel file
    const data = parseExcel(req.file.path);
    
    // Transform data to match certificate schema
    const certificates = data.map(item => ({
      internId: item.internId?.toString().trim().toUpperCase(),
      name: item.name?.toString().trim(),
      domain: item.domain?.toString().trim(),
      duration: Number(item.duration) || 0,
      startingDate: item.startingDate,
      completionDate: item.completionDate,
      // Add other fields as per your schema
    }));

    // Validate certificates
    for (const cert of certificates) {
      if (!cert.internId || !cert.name || !cert.domain) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data in Excel file. Make sure all required fields are present.',
          data: cert
        });
      }
    }

    // Insert into database
    const result = await Certificate.insertMany(certificates, { ordered: false });
    
    res.status(201).json({
      success: true,
      message: 'Certificates uploaded successfully',
      count: result.length
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate internId found. Please ensure all internId values are unique.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during bulk upload',
      error: error.message
    });
  }
});

export default router;
