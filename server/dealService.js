
const Deal = require('./models/Deal');

class DealService {

  /** Compute live secondsLeft from stored expiresAt, return a plain object. */
  _hydrate(deal, now) {
    if (!deal) return null;
    const obj = deal.toObject ? deal.toObject() : { ...deal };
    obj.id = String(obj._id || obj.id);
    obj.secondsLeft = Math.max(0, Math.floor((new Date(obj.expiresAt).getTime() - now) / 1000));
    return obj;
  }

  /** Return all non-expired deals, computing secondsLeft dynamically. */
  async getActiveDeals() {
    const now = Date.now();
    const all = await Deal.find().lean();
    return all
      .map(d => this._hydrate(d, now))
      .filter(d => d.secondsLeft > 0);
  }

  /** Return all deals (including expired) — for admin view. */
  async getAllDeals() {
    const now = Date.now();
    const all = await Deal.find().sort({ createdAt: -1 }).lean();
    return all.map(d => this._hydrate(d, now));
  }

  async getDealById(id) {
    if (!id) return null;
    let d;
    try {
      d = await Deal.findById(id).lean();
    } catch (e) {
      return null; // invalid ObjectId
    }
    if (!d) return null;
    return this._hydrate(d, Date.now());
  }

  /**
   * Create a new deal.
   * Design Pattern: Factory Method — builds a complete deal object.
   */
  async createDeal({ from, fromCode, to, toCode, price, airline, seats, duration, expiresInSeconds, featured }) {
    if (!from || !fromCode || !to || !toCode || !price || !airline || !duration) {
      throw new Error('Missing required deal fields');
    }
    const secs = Number(expiresInSeconds) || 3600;
    const deal = await Deal.create({
      from, fromCode, to, toCode,
      price:            Number(price),
      airline,
      seats:            seats || 'Economy',
      duration,
      expiresInSeconds: secs,
      expiresAt:        new Date(Date.now() + secs * 1000),
      featured:         !!featured,
    });
    return this._hydrate(deal, Date.now());
  }

  async updateDeal(id, fields) {
    const existing = await Deal.findById(id);
    if (!existing) throw new Error('Deal not found');
    const updates = { ...fields };
    if (fields.expiresInSeconds) {
      updates.expiresAt = new Date(Date.now() + Number(fields.expiresInSeconds) * 1000);
      updates.expiresInSeconds = Number(fields.expiresInSeconds);
    }
    if (fields.price) updates.price = Number(fields.price);
    if (fields.featured !== undefined) updates.featured = !!fields.featured;
    const updated = await Deal.findByIdAndUpdate(id, updates, { new: true });
    return this._hydrate(updated, Date.now());
  }

  async deleteDeal(id) {
    const existing = await Deal.findById(id);
    if (!existing) throw new Error('Deal not found');
    await Deal.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new DealService();   // Singleton
