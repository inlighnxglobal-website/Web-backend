import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = 'praghav77k@gmail.com';
        const adminPassword = 'Raghav@555';

        // Check if admin already exists
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        // Create admin user
        await User.create({
            email: adminEmail,
            password: adminPassword,
        });

        console.log(`Admin user seeded successfully: ${adminEmail}`);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
