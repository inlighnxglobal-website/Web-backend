import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  internId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true
  },
  startingDate: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  completionDate: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;

