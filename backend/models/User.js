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
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
