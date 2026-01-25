import express from 'express';
import SchoolApplication from '../models/SchoolApplication.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/school-applications
// @desc    Get all school applications
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const applications = await SchoolApplication.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching school applications:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/school-applications
// @desc    Submit a new school application
// @access  Public
router.post('/', async (req, res) => {
    try {
        const {
            name,
            email,
            number,
            designation,
            schoolName,
            message
        } = req.body;

        // Create a new application
        const newApplication = new SchoolApplication({
            name,
            email,
            phone: number, // Mapping number to phone
            designation,
            schoolName,
            message
        });

        // Save to database
        await newApplication.save();

        res.status(201).json({
            success: true,
            message: 'School application submitted successfully',
            data: newApplication
        });
    } catch (error) {
        console.error('Error submitting school application:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting school application',
            error: error.message
        });
    }
});

// @route   DELETE /api/school-applications/:id
// @desc    Delete a school application
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const application = await SchoolApplication.findById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        await application.deleteOne();

        res.json({
            success: true,
            message: 'Application removed'
        });
    } catch (error) {
        console.error('Error deleting school application:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

export default router;
