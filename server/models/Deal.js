

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    from:             { type: String, required: true },
    fromCode:         { type: String, required: true },
    to:               { type: String, required: true },
    toCode:           { type: String, required: true },
    price:            { type: Number, required: true },
    airline:          { type: String, required: true },
    seats:            { type: String, default: 'Economy' },
    duration:         { type: String, required: true },
    expiresInSeconds: { type: Number, default: 3600 },
    expiresAt:        { type: Date, required: true },
    featured:         { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.models.Deal || mongoose.model('Deal', dealSchema);
