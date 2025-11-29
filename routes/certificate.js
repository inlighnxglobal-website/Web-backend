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
    
    // Get all rows as JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the header row (first row with 'S. No.' in first column)
    const headerRowIndex = data.findIndex(row => row[0] === 'S. No.');
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Excel file');
    }
    
    // Get headers (assuming they are in the row after the header row index)
    const headers = data[headerRowIndex];
    
    // Get data rows (start from the row after headers)
    const dataRows = data.slice(headerRowIndex + 1);
    
    // Convert to array of objects
    return dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header) { // Only process columns with headers
          obj[header.trim()] = row[index];
        }
      });
      return obj;
    });
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
    const certificates = data.map(item => {
      // Map the Excel columns to your schema
      const certificate = {
        internId: (item['Intern ID'] || '').toString().trim().toUpperCase(),
        name: (item['Name of the Intern'] || '').toString().trim(),
        domain: (item['Domain'] || '').toString().trim(),
        duration: parseInt(item['Duration (in months)']) || 0,
        startingDate: item['Start Date'] || null,
        completionDate: item['End Date'] || null,
        // Add other fields as needed
      };
      
      // Log the mapping for debugging
      console.log('Mapped certificate:', certificate);
      return certificate;
    });

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
