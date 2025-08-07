const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  // name fields
  name: { type: String, default: '' },         // full display name
  givenName: { type: String, default: '' },    // first name
  familyName: { type: String, default: '' },   // last name

  // profile
  profilePicture: { type: String, default: null }, // URL
  phoneNumber: { type: String, default: null },   // unverified by default
  phoneVerified: { type: Boolean, default: false },

  // personal
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  birthday: { type: Date, default: null },

  // locale / preferences
  language: { type: String, default: 'en' }, 
  country: { type: String, default: '' },
  timezone: { type: String, default: '' },

  // email verification fields
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, default: null },
  emailVerificationExpiresAt: { type: Date, default: null },

  // roles & auditing
  roles: { type: [String], default: ['user'] },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// update timestamp on save
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
