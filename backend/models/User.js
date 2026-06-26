const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  name: {
    type: String
  },
  picture: {
    type: String
  },
  googleTokens: {
    type: Object,
    default: {}
  },
  persona: {
    personal: {
      phone: { type: String, default: '' },
      altPhone: { type: String, default: '' },
      gender: { type: String, default: '' },
      dob: { type: String, default: '' },
      fathersName: { type: String, default: '' },
      address: { type: String, default: '' },
      altAddress: { type: String, default: '' },
      pincode: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      hobby: { type: String, default: '' }
    },
    professional: {
      schoolName: { type: String, default: '' },
      schoolPassingYear: { type: String, default: '' },
      tenthPassingYear: { type: String, default: '' },
      marks10th: { type: String, default: '' },
      tenthBoard: { type: String, default: '' },
      twelfthPassingYear: { type: String, default: '' },
      marks12th: { type: String, default: '' },
      twelfthBoard: { type: String, default: '' },
      collegeName: { type: String, default: '' },
      collegePassingYear: { type: String, default: '' },
      course: { type: String, default: '' },
      cgpa: { type: String, default: '' },
      industry: { type: String, default: '' },
      yearsOfExperience: { type: String, default: '' },
      linkedinUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
