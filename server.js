import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import verifyRoutes from './routes/verify.js';
import programRoutes from './routes/programs.js';
import certificateRoutes from './routes/certificate.js';
import authRoutes from './routes/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom JSON error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body',
      error: err.message,
      hint: 'Please check your JSON syntax. Make sure all strings are properly quoted and there are no trailing commas.'
    });
  }
  next(err);
});

// API Routes
app.use('/api/verify', verifyRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/auth', authRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the bulk upload page
app.get('/bulk-upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bulk-upload.html'));
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    ...(isDevelopment && { error: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

