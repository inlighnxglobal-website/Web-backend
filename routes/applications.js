import express from 'express';
import Application from '../models/Application.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/applications
// @desc    Get all applications
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/applications
// @desc    Submit a new internship application
// @access  Public
router.post('/', async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            collegeName,
            address,
            userType,
            graduationYear,
            state,
            internshipType,
            acknowledgment
        } = req.body;

        // Create a new application
        const newApplication = new Application({
            fullName,
            email,
            phone,
            collegeName,
            address,
            userType,
            graduationYear,
            state,
            internshipType,
            acknowledgment
        });

        // Save to database
        await newApplication.save();

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: newApplication
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting application',
            error: error.message
        });
    }
});

export default router;
