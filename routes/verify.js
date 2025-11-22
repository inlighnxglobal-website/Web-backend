import express from 'express';
import Certificate from '../models/Certificate.js';

const router = express.Router();

// Helper function to parse dates (accept DD-MM-YYYY or YYYY-MM-DD format)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return new Date(dateStr);
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 2) {
      // DD-MM-YYYY format
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      // YYYY-MM-DD format
      return new Date(dateStr);
    }
  }
  return new Date(dateStr);
};

// Helper function to extract and validate certificate data
const extractCertificateData = (item) => {
  const internId = item.internId || item["Intern ID"];
  const name = item.name || item["Name"];
  const domain = item.domain || item["Domain"];
  const duration = item.duration !== undefined ? item.duration : item["Duration"];
  const startingDate = item.startingDate || item["Starting Date"];
  const completionDate = item.completionDate || item["Completion Date"];
  const email = item.email || item["Email"];

  return {
    internId,
    name,
    domain,
    duration,
    startingDate,
    completionDate,
    email
  };
};

// Helper function to validate certificate data
const validateCertificate = (data) => {
  const errors = [];
  
  if (!data.internId || data.internId.trim() === '') {
    errors.push('Intern ID is required');
  }
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!data.domain || data.domain.trim() === '') {
    errors.push('Domain is required');
  }
  if (data.duration === undefined || data.duration === null) {
    errors.push('Duration is required');
  }
  if (!data.startingDate) {
    errors.push('Starting Date is required');
  }
  if (!data.completionDate) {
    errors.push('Completion Date is required');
  }

  // Validate date formats
  if (data.startingDate) {
    const startDate = parseDate(data.startingDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid Starting Date format');
    }
  }
  if (data.completionDate) {
    const endDate = parseDate(data.completionDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid Completion Date format');
    }
  }

  return errors;
};

// POST /api/verify - Add a new certificate
router.post('/', async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty. Please provide certificate data.',
        example: {
          internId: "ITID00001",
          name: "John Doe",
          domain: "Data Analyst",
          duration: 1,
          startingDate: "15-12-2024",
          completionDate: "15-01-2025"
        }
      });
    }

    // Extract data from request
    const data = extractCertificateData(req.body);

    // Validate required fields
    const validationErrors = validateCertificate(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        received: Object.keys(req.body)
      });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({ 
      internId: data.internId.trim().toUpperCase() 
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Certificate with this Intern ID already exists'
      });
    }

    // Helper function to normalize date - keep DD-MM-YYYY format as string
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      // If already in DD-MM-YYYY format, return as string
      if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr.trim())) {
        return dateStr.trim();
      }
      
      // Otherwise, parse and convert to DD-MM-YYYY string format
      const parsed = parseDate(dateStr);
      if (parsed && !isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      return dateStr;
    };

    // Create new certificate
    const certificate = new Certificate({
      internId: data.internId.trim().toUpperCase(),
      name: data.name.trim(),
      domain: data.domain.trim(),
      duration: Number(data.duration),
      startingDate: normalizeDate(data.startingDate),
      completionDate: normalizeDate(data.completionDate),
      email: data.email ? data.email.trim().toLowerCase() : undefined,
      status: 'active'
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate added successfully',
      data: {
        internId: certificate.internId,
        name: certificate.name,
        domain: certificate.domain,
        duration: certificate.duration
      }
    });
  } catch (error) {
    console.error('Error adding certificate:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the certificate',
      error: error.message
    });
  }
});

// POST /api/verify/bulk - Add multiple certificates at once
router.post('/bulk', async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty. Please provide certificates array.',
        example: {
          certificates: [
            {
              internId: "ITID00001",
              name: "John Doe",
              domain: "Data Analyst",
              duration: 1,
              startingDate: "15-12-2024",
              completionDate: "15-01-2025"
            }
          ]
        }
      });
    }

    const { certificates } = req.body;

    // Validate that certificates array is provided
    if (!Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of certificates in the "certificates" field',
        example: {
          certificates: [
            {
              "internId": "ITID00001",
              "name": "John Doe",
              "domain": "Data Analyst",
              "duration": 1,
              "startingDate": "15-12-2024",
              "completionDate": "15-01-2025"
            }
          ]
        }
      });
    }

    // Limit bulk insert to prevent server overload
    const MAX_BULK_SIZE = 1000;
    if (certificates.length > MAX_BULK_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Bulk insert limited to ${MAX_BULK_SIZE} certificates at a time. Please split your data into smaller batches.`
      });
    }

    const results = {
      total: certificates.length,
      successful: [],
      failed: [],
      skipped: []
    };

    // Process each certificate
    for (let i = 0; i < certificates.length; i++) {
      const item = certificates[i];
      const index = i + 1;

      try {
        // Extract data from the item
        const data = extractCertificateData(item);

        // Validate the data
        const validationErrors = validateCertificate(data);
        if (validationErrors.length > 0) {
          results.failed.push({
            index,
            internId: data.internId || 'N/A',
            errors: validationErrors
          });
          continue;
        }

        // Check if certificate already exists
        const existing = await Certificate.findOne({ 
          internId: data.internId.trim().toUpperCase() 
        });

        if (existing) {
          results.skipped.push({
            index,
            internId: data.internId.trim().toUpperCase(),
            reason: 'Certificate with this Intern ID already exists'
          });
          continue;
        }

        // Helper function to normalize date - keep DD-MM-YYYY format as string
        const normalizeDate = (dateStr) => {
          if (!dateStr) return null;
          
          // If already in DD-MM-YYYY format, return as string
          if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr.trim())) {
            return dateStr.trim();
          }
          
          // Otherwise, parse and convert to DD-MM-YYYY string format
          const parsed = parseDate(dateStr);
          if (parsed && !isNaN(parsed.getTime())) {
            const day = String(parsed.getDate()).padStart(2, '0');
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const year = parsed.getFullYear();
            return `${day}-${month}-${year}`;
          }
          
          return dateStr;
        };

        // Create and save certificate
        const certificate = new Certificate({
          internId: data.internId.trim().toUpperCase(),
          name: data.name.trim(),
          domain: data.domain.trim(),
          duration: Number(data.duration),
          startingDate: normalizeDate(data.startingDate),
          completionDate: normalizeDate(data.completionDate),
          email: data.email ? data.email.trim().toLowerCase() : undefined,
          status: 'active'
        });

        await certificate.save();

        results.successful.push({
          index,
          internId: certificate.internId,
          name: certificate.name
        });

      } catch (error) {
        // Handle individual certificate errors without stopping the process
        results.failed.push({
          index,
          internId: item.internId || item["Intern ID"] || 'N/A',
          errors: [error.message || 'Unknown error occurred']
        });
        console.error(`Error processing certificate at index ${index}:`, error);
      }
    }

    // Determine response status based on results
    const hasFailures = results.failed.length > 0;
    const hasSkipped = results.skipped.length > 0;
    const allFailed = results.successful.length === 0;

    const response = {
      success: !allFailed,
      message: `Processed ${results.total} certificates. ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped.`,
      results: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      }
    };

    // Include detailed results if there are failures or skipped items
    if (hasFailures || hasSkipped) {
      response.details = {
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped
      };
    }

    // Return appropriate status code
    if (allFailed) {
      return res.status(400).json(response);
    } else if (hasFailures || hasSkipped) {
      return res.status(207).json(response); // 207 Multi-Status for partial success
    } else {
      return res.status(201).json(response);
    }

  } catch (error) {
    console.error('Error in bulk insert:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing bulk insert',
      error: error.message
    });
  }
});

// GET /api/verify - Get all certificates (with optional query parameters)
router.get('/', async (req, res) => {
  try {
    const { status, domain, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (domain) {
      query.domain = { $regex: domain, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { internId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const certificates = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    // Helper function to format date as DD-MM-YYYY
    const formatDate = (date) => {
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return date;
      }
      if (date instanceof Date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return date || '';
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formattedCertificates = certificates.map(cert => ({
      internId: cert.internId,
      name: cert.name,
      domain: cert.domain,
      duration: cert.duration,
      startingDate: formatDate(cert.startingDate),
      completionDate: formatDate(cert.completionDate),
      email: cert.email,
      status: cert.status,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt
    }));

    res.json({
      success: true,
      count: certificates.length,
      data: formattedCertificates
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching certificates',
      error: error.message
    });
  }
});

// GET /api/verify/:internId
router.get('/:internId', async (req, res) => {
  try {
    const { internId } = req.params;
    
    if (!internId || internId.trim() === '') {
      return res.status(400).json({
        valid: false,
        message: 'Intern ID is required'
      });
    }

    // Find certificate by internId (case-insensitive)
    const certificate = await Certificate.findOne({
      internId: internId.trim().toUpperCase()
    });

    if (!certificate) {
      return res.status(404).json({
        valid: false,
        message: 'Certificate not found. Please check your Intern ID and try again.'
      });
    }

    // Check if certificate is revoked
    if (certificate.status === 'revoked') {
      return res.status(403).json({
        valid: false,
        message: 'This certificate has been revoked and is no longer valid.'
      });
    }

    // Helper function to format date as DD-MM-YYYY
    // Handles both Date objects and string dates in DD-MM-YYYY format
    const formatDate = (date) => {
      // If it's already a string in DD-MM-YYYY format, return as is
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return date;
      }
      
      // If it's a Date object, format it
      if (date instanceof Date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      // Try to parse as Date and format
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        // If date parsing fails, return the original value or empty string
        return date || '';
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Return certificate details with exact field names matching MongoDB format
    res.json({
      valid: true,
      "Name": certificate.name,
      "Domain": certificate.domain,
      "Duration": certificate.duration,
      "Intern ID": certificate.internId,
      "Starting Date": formatDate(certificate.startingDate),
      "Completion Date": formatDate(certificate.completionDate)
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      valid: false,
      message: 'An error occurred while verifying the certificate. Please try again later.'
    });
  }
});

// PUT /api/verify/:internId - Update certificate details
router.put('/:internId', async (req, res) => {
  try {
    const { internId } = req.params;
    
    if (!internId || internId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required'
      });
    }

    const certificate = await Certificate.findOne({
      internId: internId.trim().toUpperCase()
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Helper function to normalize date - keep DD-MM-YYYY format as string
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr.trim())) {
        return dateStr.trim();
      }
      
      const parsed = parseDate(dateStr);
      if (parsed && !isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      return dateStr;
    };

    // Update allowed fields
    const allowedUpdates = ['name', 'domain', 'duration', 'startingDate', 'completionDate', 'email', 'status'];
    const updates = {};
    const updateData = extractCertificateData(req.body);

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined || updateData[field] !== undefined) {
        const value = req.body[field] !== undefined ? req.body[field] : updateData[field];
        
        if (field === 'email') {
          updates[field] = value ? value.trim().toLowerCase() : undefined;
        } else if (field === 'startingDate' || field === 'completionDate') {
          updates[field] = normalizeDate(value);
        } else if (field === 'duration') {
          updates[field] = Number(value);
        } else if (field === 'status') {
          if (['active', 'revoked'].includes(value)) {
            updates[field] = value;
          }
        } else if (typeof value === 'string') {
          updates[field] = value.trim();
        } else {
          updates[field] = value;
        }
      }
    });

    // Validate dates if being updated
    if (updates.startingDate) {
      const startDate = parseDate(updates.startingDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Starting Date format'
        });
      }
    }
    if (updates.completionDate) {
      const endDate = parseDate(updates.completionDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Completion Date format'
        });
      }
    }

    Object.assign(certificate, updates);
    await certificate.save();

    // Format date for response
    const formatDate = (date) => {
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return date;
      }
      if (date instanceof Date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return date || '';
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      data: {
        internId: certificate.internId,
        name: certificate.name,
        domain: certificate.domain,
        duration: certificate.duration,
        startingDate: formatDate(certificate.startingDate),
        completionDate: formatDate(certificate.completionDate),
        email: certificate.email,
        status: certificate.status
      }
    });
  } catch (error) {
    console.error('Error updating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the certificate',
      error: error.message
    });
  }
});

// DELETE /api/verify/:internId - Delete certificate
router.delete('/:internId', async (req, res) => {
  try {
    const { internId } = req.params;
    
    if (!internId || internId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required'
      });
    }

    const certificate = await Certificate.findOneAndDelete({
      internId: internId.trim().toUpperCase()
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate deleted successfully',
      data: {
        internId: certificate.internId,
        name: certificate.name
      }
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the certificate',
      error: error.message
    });
  }
});

export default router;

