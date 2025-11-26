import express from 'express';
import Program from '../models/Program.js';

const router = express.Router();

// Helper function to validate program data
const validateProgram = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required');
  }
  if (!data.summary || data.summary.trim() === '') {
    errors.push('Summary is required');
  }
  if (!data.category || data.category.trim() === '') {
    errors.push('Category is required');
  } else if (![
    'Business', 
    'Development', 
    'Cybersecurity', 
    'Data Science',
    'Business & Analytics',
    'Cyber Security',
    'AI & Machine Learning',
    'Data & Analytics'
  ].includes(data.category)) {
    errors.push('Category must be one of: Business, Development, Cybersecurity, Data Science, Business & Analytics, Cyber Security, AI & Machine Learning, Data & Analytics');
  }
  if (!data.level || data.level.trim() === '') {
    errors.push('Level is required');
  } else if (!['Beginner', 'Intermediate', 'Advanced', 'Beginner to Intermediate'].includes(data.level)) {
    errors.push('Level must be one of: Beginner, Intermediate, Advanced, Beginner to Intermediate');
  }
  if (!data.duration || data.duration.trim() === '') {
    errors.push('Duration is required');
  }
  if (data.rating !== undefined && (isNaN(data.rating) || data.rating < 0 || data.rating > 5)) {
    errors.push('Rating must be a number between 0 and 5');
  }

  return errors;
};

// GET /api/programs - Get all programs
router.get('/', async (req, res) => {
  try {
    const { status, category, level, search } = req.query;
    const query = {};

    // Only filter by status if explicitly provided
    // This allows fetching all programs or filtering by status
    if (status && status !== 'all') {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (level) {
      query.level = level;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const programs = await Program.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching programs',
      error: error.message
    });
  }
});

// GET /api/programs/by-name/:name - Get a program by name/title
router.get('/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Decode URL-encoded name and replace hyphens/dashes with spaces for better matching
    let decodedName = decodeURIComponent(name)
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .trim();
    
    // Normalize the search term: handle abbreviations and compound words
    // e.g., "ai ml" should match "AI & Machine Learning"
    // e.g., "frontend" should match "Front-End" or "Front End"
    const normalizeWord = (word) => {
      // Handle common abbreviations and variations
      const mappings = {
        'ai': '(ai|artificial.?intelligence)',
        'ml': '(ml|machine.?learning)',
        'frontend': '(front.?end|frontend)',
        'backend': '(back.?end|backend)',
        'fullstack': '(full.?stack|fullstack)',
        'full-stack': '(full.?stack|fullstack)',
      };
      
      const lowerWord = word.toLowerCase();
      if (mappings[lowerWord]) {
        return mappings[lowerWord];
      }
      return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // First try: match by detailsLink (most reliable - exact match)
    let program = await Program.findOne({
      detailsLink: `/programs/${name}`
    }).select('-__v');
    
    // Second try: if not found, try title matching with flexible regex
    if (!program) {
      const words = decodedName.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length > 0) {
        // Create regex pattern that matches all words (in any order, with flexible spacing)
        const regexPattern = words.map(normalizeWord).join('.*');
        
        program = await Program.findOne({
          title: { $regex: new RegExp(regexPattern, 'i') }
        }).select('-__v');
        
        // Third try: if still not found, try matching each word individually (more flexible)
        if (!program) {
          // Create a pattern that requires all words to be present (in any order)
          const allWordsPattern = words.map(w => {
            const normalized = normalizeWord(w);
            return `(?=.*${normalized})`;
          }).join('');
          
          program = await Program.findOne({
            title: { $regex: new RegExp(allWordsPattern, 'i') }
          }).select('-__v');
        }
      }
    }

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error fetching program by name:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the program',
      error: error.message
    });
  }
});

// GET /api/programs/:id - Get a single program by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let program;
    if (isObjectId) {
      // Try to find by ID first
      program = await Program.findById(id).select('-__v');
    }
    
    // If not found by ID, try searching by title (for backward compatibility)
    if (!program) {
      const decodedName = decodeURIComponent(id)
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
      
      // Create a more flexible regex pattern that matches words in any order
      const words = decodedName.split(/\s+/).filter(w => w.length > 0);
      const regexPattern = words.map(word => 
        word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ).join('.*');
      
      program = await Program.findOne({
        title: { $regex: new RegExp(regexPattern, 'i') }
      }).select('-__v');
    }

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid program ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the program',
      error: error.message
    });
  }
});

// POST /api/programs - Add a new program
router.post('/', async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty. Please provide program data.',
        example: {
          title: 'Business Analyst Internship Program',
          summary: 'Master data-driven decision making and business intelligence tools.',
          category: 'Business',
          level: 'Beginner',
          duration: '3 months',
          rating: 4.8,
          skills: ['SQL', 'Tableau', 'Excel', 'Analytics'],
          thumbnail: 'https://example.com/image.jpg',
          detailsLink: '/programs/business-analyst'
        }
      });
    }

    // Extract and prepare data
    const data = {
      title: req.body.title,
      summary: req.body.summary,
      category: req.body.category,
      level: req.body.level,
      duration: req.body.duration,
      rating: req.body.rating,
      skills: req.body.skills || [],
      thumbnail: req.body.thumbnail,
      detailsLink: req.body.detailsLink,
      overview: req.body.overview,
      detailedSummary: req.body.detailedSummary,
      courseTopics: req.body.courseTopics || [],
      technologies: req.body.technologies || [],
      originalPrice: req.body.originalPrice,
      discountedPrice: req.body.discountedPrice,
      modules: req.body.modules,
      hours: req.body.hours,
      certificateImage: req.body.certificateImage,
      additionalImages: req.body.additionalImages || [],
      status: req.body.status || 'active'
    };

    // Validate required fields
    const validationErrors = validateProgram(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Create new program
    const program = new Program({
      title: data.title.trim(),
      summary: data.summary.trim(),
      category: data.category.trim(),
      level: data.level.trim(),
      duration: data.duration.trim(),
      rating: data.rating ? Number(data.rating) : 0,
      skills: Array.isArray(data.skills) ? data.skills.map(s => s.trim()) : [],
      thumbnail: data.thumbnail ? data.thumbnail.trim() : undefined,
      detailsLink: data.detailsLink ? data.detailsLink.trim() : undefined,
      overview: data.overview ? data.overview.trim() : undefined,
      detailedSummary: data.detailedSummary ? data.detailedSummary.trim() : undefined,
      courseTopics: Array.isArray(data.courseTopics) ? data.courseTopics.map(t => t.trim()) : [],
      technologies: Array.isArray(data.technologies) ? data.technologies.map(t => t.trim()) : [],
      originalPrice: data.originalPrice ? Number(data.originalPrice) : 2000,
      discountedPrice: data.discountedPrice ? Number(data.discountedPrice) : 1499,
      modules: data.modules ? Number(data.modules) : 6,
      hours: data.hours ? Number(data.hours) : 8,
      certificateImage: data.certificateImage ? data.certificateImage.trim() : undefined,
      additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages.map(img => img.trim()) : [],
      status: data.status
    });

    await program.save();

    res.status(201).json({
      success: true,
      message: 'Program added successfully',
      data: program
    });
  } catch (error) {
    console.error('Error adding program:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the program',
      error: error.message
    });
  }
});

// DELETE /api/programs?all=true - Delete all programs
router.delete('/', async (req, res) => {
  try {
    const { all } = req.query;
    
    // Only delete all if explicitly requested with ?all=true
    if (all === 'true') {
      const result = await Program.deleteMany({});
      
      return res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} program(s)`,
        deletedCount: result.deletedCount
      });
    }
    
    // If no query parameter, return error
    return res.status(400).json({
      success: false,
      message: 'To delete all programs, use: DELETE /api/programs?all=true'
    });
  } catch (error) {
    console.error('Error deleting all programs:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting programs',
      error: error.message
    });
  }
});

// DELETE /api/programs/:id - Delete a program
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await Program.findByIdAndDelete(id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      message: 'Program deleted successfully',
      data: {
        id: program._id,
        title: program.title
      }
    });
  } catch (error) {
    console.error('Error deleting program:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid program ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the program',
      error: error.message
    });
  }
});

export default router;

