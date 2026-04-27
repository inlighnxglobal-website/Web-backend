import express from 'express';
import Onboarding from '../models/Onboarding.js';
import Settings from '../models/Settings.js';
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

// Get WhatsApp link (Public)
router.get('/whatsapp-link', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'whatsapp_link' });
    const defaultLink = 'https://chat.whatsapp.com/FOQ0mur19NsKHjR5907WMb';
    
    res.status(200).json({
      success: true,
      link: setting ? setting.value : defaultLink
    });
  } catch (error) {
    console.error('Error fetching WhatsApp link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp link'
    });
  }
});

// Update WhatsApp link (Protected)
router.post('/whatsapp-link', protect, async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ success: false, message: 'Link is required' });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: 'whatsapp_link' },
      { value: link },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'WhatsApp link updated successfully',
      link: setting.value
    });
  } catch (error) {
    console.error('Error updating WhatsApp link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WhatsApp link'
    });
  }
});

export default router;
