import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'Business', 
      'Development', 
      'Cybersecurity', 
      'Data Science',
      'Business & Analytics',
      'Cyber Security',
      'AI & Machine Learning',
      'Data & Analytics'
    ]
  },
  level: {
    type: String,
    required: true,
    trim: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Beginner to Intermediate']
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  skills: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
    trim: true
  },
  detailsLink: {
    type: String,
    trim: true
  },
  // Course Details Fields
  overview: {
    type: String,
    trim: true
  },
  detailedSummary: {
    type: String,
    trim: true
  },
  courseTopics: {
    type: [String],
    default: []
  },
  technologies: {
    type: [String],
    default: []
  },
  originalPrice: {
    type: Number,
    default: 2000
  },
  discountedPrice: {
    type: Number,
    default: 1499
  },
  modules: {
    type: Number,
    default: 6
  },
  hours: {
    type: Number,
    default: 8
  },
  certificateImage: {
    type: String,
    trim: true
  },
  additionalImages: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster queries
programSchema.index({ category: 1 });
programSchema.index({ level: 1 });
programSchema.index({ status: 1 });

const Program = mongoose.model('Program', programSchema);

export default Program;

