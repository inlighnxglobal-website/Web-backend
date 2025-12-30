import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    fullName: {
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
    collegeName: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true,
        enum: ['Student', 'Fresher', 'Working Professional']
    },
    graduationYear: {
        type: String,
        required: function () {
            return this.userType === 'Student';
        }
    },
    state: {
        type: String,
        required: true
    },
    internshipType: {
        type: String,
        required: true
    },
    acknowledgment: {
        type: Boolean,
        required: true,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Application = mongoose.model('Application', applicationSchema);

export default Application;
