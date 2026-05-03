import mongoose from 'mongoose';

const onboardingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  domain: {
    type: String
  },
  state: {
    type: String
  },
  role: {
    type: String
  },
  verified: {
    type: Boolean,
    default: false
  },
  shortIntro: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Onboarding = mongoose.model('Onboarding', onboardingSchema);

export default Onboarding;
