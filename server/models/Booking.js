

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    ref:        { type: String, required: true, unique: true },
    dealId:     { type: String, required: true },
    from:       String,
    fromCode:   String,
    to:         String,
    toCode:     String,
    airline:    String,
    seatClass:  String,
    duration:   String,
    flightDate: String,
    name:       { type: String, required: true },
    phone:      { type: String, required: true },
    email:      { type: String, default: '' },
    seat:       { type: String, default: 'Auto' },
    passengers: { type: Number, default: 1 },
    basePrice:  Number,
    taxes:      Number,
    total:      Number,
    status:     { type: String, default: 'Confirmed' },
    bookedAt:   { type: Date, default: Date.now },
  }
);

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
