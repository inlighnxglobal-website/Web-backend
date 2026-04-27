import express from 'express';
import Onboarding from '../models/Onboarding.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create new onboarding entry
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, domain, state, role, verified } = req.body;
    
    const newOnboarding = new Onboarding({
      name,
      email,
      phone,
      domain,
      state,
      role,
      verified
    });

    const savedOnboarding = await newOnboarding.save();
    res.status(201).json({
      success: true,
      message: 'Onboarding application submitted successfully',
      data: savedOnboarding
    });
  } catch (error) {
    console.error('Error in creating onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit onboarding application',
      error: error.message
    });
  }
});

// Get all onboarding entries
router.get('/', protect, async (req, res) => {
  try {
    const onboardingEntries = await Onboarding.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: onboardingEntries
    });
  } catch (error) {
    console.error('Error in fetching onboarding entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding entries',
      error: error.message
    });
  }
});

// Delete an onboarding entry
router.delete('/:id', protect, async (req, res) => {
  try {
    await Onboarding.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Onboarding entry deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleting onboarding entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete onboarding entry',
      error: error.message
    });
  }
});

export default router;
