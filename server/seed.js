

require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('./models/Deal');

const seedDeals = [
  { from:'Mumbai',    fromCode:'BOM', to:'Delhi',     toCode:'DEL', price:4299, airline:'IndiGo',    seats:'Economy',         duration:'2h 10m', expiresInSeconds:7200,  featured:true  },
  { from:'Bangalore', fromCode:'BLR', to:'Kolkata',   toCode:'CCU', price:5499, airline:'Air India', seats:'Business',        duration:'2h 45m', expiresInSeconds:3600,  featured:false },
  { from:'Chennai',   fromCode:'MAA', to:'Hyderabad', toCode:'HYD', price:2999, airline:'SpiceJet',  seats:'Economy',         duration:'1h 20m', expiresInSeconds:10800, featured:true  },
  { from:'Delhi',     fromCode:'DEL', to:'Goa',       toCode:'GOI', price:6799, airline:'Vistara',   seats:'Premium Economy', duration:'2h 30m', expiresInSeconds:5400,  featured:false },
  { from:'Kolkata',   fromCode:'CCU', to:'Mumbai',    toCode:'BOM', price:3899, airline:'IndiGo',    seats:'Economy',         duration:'2h 50m', expiresInSeconds:1800,  featured:false },
  { from:'Pune',      fromCode:'PNQ', to:'Ahmedabad', toCode:'AMD', price:2499, airline:'Go First',  seats:'Economy',         duration:'1h 15m', expiresInSeconds:9000,  featured:true  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Add it to your .env file first.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB Atlas');

  const existing = await Deal.countDocuments();
  if (existing > 0) {
    console.log(`ℹ  Deals collection already has ${existing} document(s) — skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  const now = Date.now();
  const docs = seedDeals.map(d => ({
    ...d,
    expiresAt: new Date(now + d.expiresInSeconds * 1000),
  }));

  await Deal.insertMany(docs);
  console.log(`✅ Seeded ${docs.length} deals.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
