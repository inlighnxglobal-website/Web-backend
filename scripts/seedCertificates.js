import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Certificate from '../models/Certificate.js';
import connectDB from '../config/db.js';

dotenv.config();

const sampleCertificates = [
  {
    internId: 'ITID00001',
    name: 'VELUGULA D',
    domain: 'Data Analyst',
    duration: 1,
    startingDate: new Date('2024-12-15'),
    completionDate: new Date('2025-01-15'),
    status: 'active'
  }
];

const seedCertificates = async () => {
  try {
    await connectDB();
    
    // Clear existing certificates
    await Certificate.deleteMany({});
    console.log('Cleared existing certificates');
    
    // Insert sample certificates
    const inserted = await Certificate.insertMany(sampleCertificates);
    console.log(`Inserted ${inserted.length} sample certificates`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding certificates:', error);
    process.exit(1);
  }
};

seedCertificates();

