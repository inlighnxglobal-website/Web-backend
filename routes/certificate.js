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
    console.log('Reading Excel file:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all rows as JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Log first few rows for debugging
    console.log('First 5 rows of raw data:', JSON.stringify(data.slice(0, 5), null, 2));
    
    // Find the header row - match exact format from screenshot
    const headerRowIndex = data.findIndex(row => 
      row && row.length >= 7 && // Ensure we have enough columns
      String(row[0]).trim().toLowerCase() === 's. no.' &&
      String(row[1]).trim().toLowerCase() === 'intern id' &&
      String(row[2]).toLowerCase().includes('name of the intern')
    );
    
    console.log('Header row index:', headerRowIndex);

    if (headerRowIndex === -1) {
      console.error('Could not find header row. First column values:', data.slice(0, 5).map(r => r[0]));
      throw new Error('Could not find header row in Excel file. Please ensure your file has headers like "S. No." in the first column.');
    }
    
    // Define exact headers based on the screenshot
    const headers = [
      'S. No.',
      'Intern ID',
      'Name of the Intern',
      'Domain',
      'Duration (in months)',
      'Start Date',
      'End Date',
      'Email ID',
      'Contact No.',
      'Mentor Name',
      'Mentor Email ID',
      'Mentor Contact No.'
    ];
    
    console.log('Using predefined headers:', headers);
    
    console.log('Found headers:', headers);
    
    // Get data rows (start from the row after headers)
    let dataRows = [];
    
    // Start from the row after headers and process until we hit an empty row
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      // Skip empty rows or rows where the first cell is empty
      if (!row || !row[0]) break;
      
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
          if (header === 'S. No.') {
            value = parseInt(value) || 0;
          } else if (header === 'Duration (in months)') {
            value = parseInt(value) || 0;
          } else if (header === 'Contact No.' || header === 'Mentor Contact No.') {
            value = String(value).replace(/\D/g, ''); // Remove non-numeric characters
          } else if (header === 'Email ID' || header === 'Mentor Email ID') {
            value = String(value).toLowerCase().trim();
          } else if (header === 'Name of the Intern' || header === 'Mentor Name') {
            value = String(value || '').trim();
            // Convert to Title Case
            value = value.replace(/\w\S*/g, txt => 
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
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
        // Direct mapping based on exact header names
        const certificate = {
          internId: String(item['Intern ID'] || '').trim().toUpperCase(),
          name: String(item['Name of the Intern'] || '').trim(),
          domain: String(item['Domain'] || '').trim(),
          duration: parseInt(item['Duration (in months)']) || 0,
          startingDate: item['Start Date'] || null,
          completionDate: item['End Date'] || null,
          email: String(item['Email ID'] || '').toLowerCase().trim(),
          contactNo: String(item['Contact No.'] || '').replace(/\D/g, ''),
          mentor: {
            name: String(item['Mentor Name'] || '').trim(),
            email: String(item['Mentor Email ID'] || '').toLowerCase().trim(),
            contactNo: String(item['Mentor Contact No.'] || '').replace(/\D/g, '')
          }
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
