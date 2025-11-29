import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { body, validationResult } from 'express-validator';
import Certificate from '../models/Certificate.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper function to parse Excel file
const parseExcel = (filePath) => {
  try {
    console.log('Reading Excel file:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all rows as JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Log first few rows for debugging
    console.log('First 5 rows of raw data:', JSON.stringify(data.slice(0, 5), null, 2));
    
    // Find the header row - match the actual format from the logs
    const headerRowIndex = 0; // First row contains headers in this format
    
    // Define headers based on the actual file structure
    const headers = [
      'Name',
      'Domain',
      'Duration',
      'Intern ID',
      'Starting Date',
      'Completion Date'
    ];
    
    console.log('Using headers from first row:', headers);
    
    console.log('Using predefined headers:', headers);
    
    console.log('Found headers:', headers);
    
    // Get data rows (start from the row after headers)
    let dataRows = [];
    
    // Start from the first data row (index 1 since index 0 is header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Skip empty rows or rows where the first cell is empty
      if (!row || !row[0]) continue;
      
      // Ensure the row has enough columns
      const paddedRow = [...row];
      while (paddedRow.length < headers.length) {
        paddedRow.push('');
      }
      
      dataRows.push(paddedRow);
    }
    
    console.log(`Found ${dataRows.length} data rows`);
    
    console.log(`Found ${dataRows.length} data rows after header`);
    
    // Convert to array of objects with proper formatting
    const result = dataRows.map((row, rowIndex) => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header) {
          let value = row[index] !== undefined ? row[index] : '';
          
          // Format specific fields
          if (header === 'Duration') {
            value = parseInt(value) || 0;
          } else if (header === 'Starting Date' || header === 'Completion Date') {
            // Convert Excel date number to JavaScript Date
            value = value ? new Date((value - 25569) * 86400 * 1000) : null;
          } else if (header === 'Name') {
            value = String(value || '').trim();
            // Convert to Title Case
            value = value.replace(/\w\S*/g, txt => 
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
          } else if (header === 'Intern ID') {
            value = String(value || '').toUpperCase().trim();
          } else {
            value = String(value || '').trim();
          }
          
          obj[header] = value;
        }
      });
      return obj;
    });
    
    console.log('First parsed row:', JSON.stringify(result[0], null, 2));
    return result;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Error processing Excel file: ${error.message}`);
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
    
        // Transform data to match certificate schema with flexible field mapping
    const certificates = data.map((item, index) => {
      try {
        // Map the fields from the Excel to the certificate schema
        const certificate = {
          internId: item['Intern ID'],
          name: item['Name'],
          domain: item['Domain'],
          duration: item['Duration'],
          startingDate: item['Starting Date'],
          completionDate: item['Completion Date']
        };
        
        // Format dates if they exist
        if (certificate.startingDate && certificate.startingDate instanceof Date === false) {
          certificate.startingDate = new Date(certificate.startingDate);
        }
        if (certificate.completionDate && certificate.completionDate instanceof Date === false) {
          certificate.completionDate = new Date(certificate.completionDate);
        }
        
        console.log(`Mapped row ${index + 1}:`, certificate);
        return certificate;
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        console.error('Problematic row data:', item);
        throw new Error(`Error in row ${index + 1}: ${error.message}`);
      }
    }).filter(cert => cert.internId || cert.name); // Filter out empty rows

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

    // Use bulkWrite to handle duplicates by skipping them
    const operations = certificates.map(cert => ({
      updateOne: {
        filter: { internId: cert.internId },
        update: { $setOnInsert: cert },
        upsert: true
      }
    }));
    
    // Execute bulk operation
    const result = await Certificate.bulkWrite(operations, { ordered: false });
    
    // Delete the temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
    
    res.status(200).json({
      success: true,
      insertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      duplicates: result.writeErrors ? result.writeErrors.length : 0,
      message: `Successfully processed ${certificates.length} certificates`,
      details: {
        inserted: result.upsertedCount,
        duplicates: result.writeErrors ? result.writeErrors.length : 0
      }
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    
    // Delete the temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting temp file in error handler:', err);
      }
    }
    
    // Handle bulk write errors specifically
    if (error.name === 'MongoBulkWriteError' && error.writeErrors) {
      const duplicateCount = error.writeErrors.filter(e => e.code === 11000).length;
      const otherErrors = error.writeErrors.filter(e => e.code !== 11000);
      
      return res.status(207).json({
        success: true,
        message: `Processed with ${duplicateCount} duplicates skipped`,
        details: {
          duplicates: duplicateCount,
          otherErrors: otherErrors.length,
          inserted: error.result?.nInserted || 0,
          totalAttempted: error.result?.nMatched + error.result?.nUpserted + error.result?.nModified || 0
        },
        error: otherErrors.length > 0 ? otherErrors[0].errmsg : undefined
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error in bulk upload: ' + error.message,
      error: error.stack
    });
  }
});

export default router;
