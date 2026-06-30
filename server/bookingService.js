

const Booking     = require('./models/Booking');
const dealService = require('./dealService');

// Simulated taken seats per deal (deterministic so seat grid is consistent)
function takenSeats(dealId) {
  const id    = String(dealId);
  const seed  = id.charCodeAt(0) + (id.charCodeAt(1) || 5);
  const seats = [];
  const L     = ['A','B','C','D','E','F'];
  for (let r = 1; r <= 6; r++)
    for (let c = 0; c < 6; c++)
      if ((r * seed + c * 3) % 7 === 0) seats.push(`${r}${L[c]}`);
  return seats;
}


function getUnavailableDates(fromCode, toCode) {
  const seed    = (fromCode + toCode).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const unavailable = [];

  // 3 months ahead
  for (let i = 1; i <= 92; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Deterministic pseudo-random using seed + day-of-year
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    if ((seed * 31 + dayOfYear * 17) % 4 === 0) {
      unavailable.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
  }
  return unavailable;
}

function toPlain(b) {
  if (!b) return null;
  const obj = b.toObject ? b.toObject() : { ...b };
  obj.id = String(obj._id || obj.id);
  return obj;
}

class BookingService {

  async createBooking({ dealId, name, phone, email, passengers, seat, flightDate }) {
    if (!dealId || !name || !phone) throw new Error('dealId, name and phone are required');
    if (!flightDate)                throw new Error('Flight date is required');
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Invalid Indian mobile number');

    // Validate date
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const selected = new Date(flightDate);
    if (isNaN(selected.getTime()))      throw new Error('Invalid flight date');
    if (selected <= today)              throw new Error('Flight date must be in the future');
    const maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth() + 3);
    if (selected > maxDate)             throw new Error('Flight date cannot be more than 3 months ahead');

    const deal = await dealService.getDealById(dealId);
    if (!deal)                throw new Error('Deal not found');
    if (deal.secondsLeft <= 0) throw new Error('This deal has expired');

    // Check date is not unavailable for this route
    const unavailable = getUnavailableDates(deal.fromCode, deal.toCode);
    if (unavailable.includes(flightDate)) throw new Error('No flights available on the selected date for this route');

    const taken = takenSeats(dealId);
    if (seat && taken.includes(seat)) throw new Error('Selected seat is already taken');

    const pax   = Math.max(1, Math.min(5, Number(passengers) || 1));
    const base  = deal.price * pax;
    const taxes = Math.round(base * 0.18);
    const total = base + taxes;
    const ref   = 'BMF' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const booking = await Booking.create({
      ref,
      dealId: String(dealId),
      from:       deal.from,  fromCode: deal.fromCode,
      to:         deal.to,    toCode:   deal.toCode,
      airline:    deal.airline,
      seatClass:  deal.seats,
      duration:   deal.duration,
      flightDate,
      name,
      phone,
      email:      email || '',
      seat:       seat  || 'Auto',
      passengers: pax,
      basePrice:  base,
      taxes,
      total,
      status:     'Confirmed',
      bookedAt:   new Date(),
    });
    return toPlain(booking);
  }

  async getBookingsByPhone(phone) {
    if (!phone) throw new Error('Phone number required');
    const all = await Booking.find({ phone }).sort({ bookedAt: -1 }).lean();
    return all.map(toPlain);
  }

  async getBookingByRef(ref) {
    const b = await Booking.findOne({ ref }).lean();
    return toPlain(b);
  }

  async getAllBookings() {
    const all = await Booking.find().sort({ bookedAt: -1 }).lean();
    return all.map(toPlain);
  }

  getTakenSeats(dealId) {
    return takenSeats(dealId);
  }


  getUnavailableDates(fromCode, toCode) {
    return getUnavailableDates(fromCode, toCode);
  }
}

module.exports = new BookingService();   // Singleton
