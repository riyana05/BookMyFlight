

const express       = require('express');
const router        = express.Router();
const dealService   = require('./dealService');
const bookingService= require('./bookingService');
const { requireAdmin, adminLogin, adminLogout, sessionStatus } = require('./auth');
const { requestOtp, verifyOtp, userLogout, userStatus } = require('./userAuth');


router.post('/auth/login',   adminLogin);
router.post('/auth/logout',  adminLogout);
router.get ('/auth/status',  sessionStatus);


router.post('/auth/email/request-otp', requestOtp);
router.post('/auth/email/verify-otp',   verifyOtp);
router.post('/auth/email/logout',       userLogout);
router.get ('/auth/email/status',       userStatus);


router.get('/deals', async (req, res) => {
  try {
    const deals = await dealService.getActiveDeals();
    res.json({ success: true, data: deals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.get('/deals/:id', async (req, res) => {
  try {
    const deal = await dealService.getDealById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/deals/:id/seats — taken seats for a deal
router.get('/deals/:id/seats', (req, res) => {
  try {
    const taken = bookingService.getTakenSeats(req.params.id);
    res.json({ success: true, data: { taken } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/deals/:id/unavailable-dates — fully booked / no-service dates within 3 months
router.get('/deals/:id/unavailable-dates', async (req, res) => {
  try {
    const deal = await dealService.getDealById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const dates = bookingService.getUnavailableDates(deal.fromCode, deal.toCode);
    res.json({ success: true, data: { dates } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── PUBLIC: BOOKINGS ───────────────────────────────────────── */

// POST /api/bookings  — customer books a flight (no login, phone as ID)
router.post('/bookings', async (req, res) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.get('/bookings', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'phone query param required' });
    const bookings = await bookingService.getBookingsByPhone(phone);
    res.json({ success: true, data: bookings });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/bookings/session', (req, res) => {
  res.json({ success: true, data: [] });
});


router.get('/admin/deals', requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, data: await dealService.getAllDeals() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/deals', requireAdmin, async (req, res) => {
  try {
    const deal = await dealService.createDeal(req.body);
    res.status(201).json({ success: true, data: deal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.put('/admin/deals/:id', requireAdmin, async (req, res) => {
  try {
    const deal = await dealService.updateDeal(req.params.id, req.body);
    res.json({ success: true, data: deal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.delete('/admin/deals/:id', requireAdmin, async (req, res) => {
  try {
    await dealService.deleteDeal(req.params.id);
    res.json({ success: true, message: 'Deal deleted' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.get('/admin/bookings', requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, data: await bookingService.getAllBookings() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.get('/flights/status', (req, res) => {
  const { from, to } = req.query;
  const statuses = ['On Time', 'Delayed', 'Boarding', 'Departed', 'Arrived', 'Cancelled'];
  const gates    = ['A1','A2','A3','B1','B2','B3','C1','C2','D4','D5','E1','E2'];
  const airlines = ['IndiGo 6E-204','Air India AI-101','SpiceJet SG-302','Vistara UK-801','Go First G8-402'];
  const seed     = ((from||'BOM')+(to||'DEL')).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const now      = new Date();
  const flightSeed = seed + now.getHours();
  const statusIdx  = flightSeed % statuses.length;
  const gateIdx    = (flightSeed * 3) % gates.length;
  const airlineIdx = seed % airlines.length;
  const delayMin   = statusIdx === 1 ? (flightSeed % 6 + 1) * 10 : 0;
  const dep = new Date(now.getTime() + (20 + (flightSeed % 40)) * 60000);
  const arr = new Date(dep.getTime() + (60 + (seed % 120)) * 60000);
  res.json({ success: true, data: {
    flight:      airlines[airlineIdx],
    from: from || 'BOM', to: to || 'DEL',
    status:      statuses[statusIdx],
    gate:        gates[gateIdx],
    terminal:    `T${(gateIdx % 3) + 1}`,
    departure:   dep.toISOString(),
    arrival:     arr.toISOString(),
    delayMinutes: delayMin,
    updatedAt:   now.toISOString(),
  }});
});

router.get('/weather', (req, res) => {
  const { city } = req.query;
  const conditions = ['Sunny','Partly Cloudy','Cloudy','Light Rain','Heavy Rain','Thunderstorm','Clear','Hazy'];
  const seed = (city||'Mumbai').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const now  = new Date();
  const dayS = seed + now.getDate();
  const condIdx = dayS % conditions.length;
  const temp = 20 + (dayS % 22);
  const hum  = 40 + (dayS % 45);
  const wind = 5  + (dayS % 25);
  const forecast = [];
  const condList = ['Sunny','Partly Cloudy','Cloudy','Light Rain','Thunderstorm','Clear'];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    const s2 = seed + d.getDate();
    forecast.push({
      date: d.toISOString().slice(0,10),
      condition: condList[s2 % condList.length],
      high: 18 + (s2 % 20), low: 12 + (s2 % 12),
      humidity: 38 + (s2 % 42),
    });
  }
  res.json({ success: true, data: {
    city: city || 'Mumbai',
    condition: conditions[condIdx],
    temperature: temp,
    humidity: hum,
    windSpeed: wind,
    feelsLike: temp - 2 + (dayS % 5),
    forecast,
    updatedAt: now.toISOString(),
  }});
});

router.get('/airports/nearby', (req, res) => {
  const nearbyMap = {
    'Mumbai':    [{ code:'PNQ', name:'Pune Airport', city:'Pune', distance:'148 km', saving:'₹800–1200' },{ code:'NAS', name:'Nashik Airport', city:'Nashik', distance:'167 km', saving:'₹500–900' }],
    'Delhi':     [{ code:'AGR', name:'Agra Airport', city:'Agra', distance:'200 km', saving:'₹600–1000' },{ code:'LKO', name:'Lucknow Airport', city:'Lucknow', distance:'500 km', saving:'₹900–1500' }],
    'Bangalore': [{ code:'MYQ', name:'Mysore Airport', city:'Mysore', distance:'144 km', saving:'₹700–1100' },{ code:'HYD', name:'Hyderabad Airport', city:'Hyderabad', distance:'560 km', saving:'₹1200–2000' }],
    'Chennai':   [{ code:'TRZ', name:'Trichy Airport', city:'Trichy', distance:'320 km', saving:'₹800–1300' },{ code:'PNQ', name:'Pondicherry Airport', city:'Pondicherry', distance:'150 km', saving:'₹400–700' }],
    'Kolkata':   [{ code:'BBI', name:'Bhubaneswar Airport', city:'Bhubaneswar', distance:'440 km', saving:'₹700–1100' },{ code:'GAY', name:'Gaya Airport', city:'Gaya', distance:'430 km', saving:'₹600–900' }],
    'Hyderabad': [{ code:'WGC', name:'Warangal Airport', city:'Warangal', distance:'130 km', saving:'₹500–800' },{ code:'BZA', name:'Vijayawada Airport', city:'Vijayawada', distance:'270 km', saving:'₹800–1200' }],
  };
  const city = req.query.city || 'Mumbai';
  const key  = Object.keys(nearbyMap).find(k => city.toLowerCase().includes(k.toLowerCase())) || 'Mumbai';
  res.json({ success: true, data: { city, alternatives: nearbyMap[key] || [] }});
});

router.get('/carbon', (req, res) => {
  // Average CO2 per km in kg based on class
  const classMultiplier = { Economy: 1.0, 'Premium Economy': 1.6, Business: 2.9, First: 4.0 };
  const distanceMap = {
    'BOM-DEL': 1148, 'DEL-BOM': 1148, 'BLR-CCU': 1870, 'CCU-BLR': 1870,
    'MAA-HYD': 521,  'HYD-MAA': 521,  'DEL-GOI': 1901, 'GOI-DEL': 1901,
    'CCU-BOM': 1660, 'BOM-CCU': 1660, 'PNQ-AMD': 490,  'AMD-PNQ': 490,
  };
  const { from, to, passengers, seatClass } = req.query;
  const route = `${from}-${to}`;
  const dist  = distanceMap[route] || 1000;
  const mult  = classMultiplier[seatClass] || 1.0;
  const pax   = Number(passengers) || 1;
  // Average emission factor: 0.115 kg CO2 per km per passenger (economy)
  const perPax    = Math.round(dist * 0.115 * mult);
  const total     = perPax * pax;
  const treesNeeded = Math.ceil(total / 21); // avg tree absorbs 21kg CO2/year
  const carEquiv    = Math.round(total / 0.21 / 1000 * 10) / 10; // avg car 210g/km
  res.json({ success: true, data: {
    from, to, distance: dist, seatClass: seatClass || 'Economy',
    passengers: pax,
    co2PerPassenger: perPax, totalCo2: total,
    treesNeeded, carEquivalentKm: carEquiv,
    offsetCost: Math.ceil(total * 0.15), // ₹0.15 per g CO2
  }});
});

router.get('/flights/food', (req, res) => {
  const menus = {
    'IndiGo': {
      Economy: [
        { name:'Veg Biryani Box', price:349, type:'Veg', icon:'🍚' },
        { name:'Chicken Wrap', price:299, type:'Non-Veg', icon:'🌯' },
        { name:'Paneer Sandwich', price:249, type:'Veg', icon:'🥪' },
        { name:'Masala Chips + Cold Coffee', price:199, type:'Veg', icon:'☕' },
        { name:'Fruit Bowl', price:149, type:'Veg', icon:'🍇' },
      ],
    },
    'Air India': {
      Business: [
        { name:'Butter Chicken + Naan', price:0, type:'Non-Veg', icon:'🍗', included:true },
        { name:'Dal Makhani + Rice', price:0, type:'Veg', icon:'🍛', included:true },
        { name:'Dessert Platter', price:0, type:'Veg', icon:'🍮', included:true },
        { name:'Welcome Drink', price:0, type:'Veg', icon:'🥂', included:true },
      ],
      Economy: [
        { name:'Veg Thali', price:399, type:'Veg', icon:'🍱' },
        { name:'Chicken Curry + Rice', price:429, type:'Non-Veg', icon:'🍛' },
        { name:'Sandwich + Juice', price:249, type:'Veg', icon:'🥪' },
      ],
    },
    'SpiceJet': {
      Economy: [
        { name:'SpiceBox Veg', price:299, type:'Veg', icon:'🥗' },
        { name:'SpiceBox Non-Veg', price:329, type:'Non-Veg', icon:'🍗' },
        { name:'Cold Coffee + Cookies', price:179, type:'Veg', icon:'☕' },
        { name:'Maggi Noodles', price:149, type:'Veg', icon:'🍜' },
      ],
    },
    'Vistara': {
      'Premium Economy': [
        { name:'Gourmet Meal (choice)', price:0, type:'Both', icon:'🍽', included:true },
        { name:'Snack Pack', price:0, type:'Veg', icon:'🥨', included:true },
        { name:'Soft Drinks', price:0, type:'Veg', icon:'🥤', included:true },
      ],
      Economy: [
        { name:'Club Vistara Meal', price:449, type:'Veg', icon:'🍱' },
        { name:'Chicken Tikka Roll', price:399, type:'Non-Veg', icon:'🌯' },
        { name:'Tea + Biscuits', price:149, type:'Veg', icon:'🍵' },
      ],
    },
  };
  const { airline, seatClass } = req.query;
  const airlineName = Object.keys(menus).find(a => (airline||'').includes(a)) || 'IndiGo';
  const classKey = seatClass || 'Economy';
  const airlineMenu = menus[airlineName] || menus['IndiGo'];
  const items = airlineMenu[classKey] || airlineMenu[Object.keys(airlineMenu)[0]] || [];
  res.json({ success: true, data: { airline: airlineName, seatClass: classKey, items }});
});

router.get('/airports/terminal', (req, res) => {
  const terminals = {
    BOM: { name:'Chhatrapati Shivaji Maharaj International Airport', terminals:[
      { id:'T1', name:'Terminal 1 (Domestic)', gates:['A1-A20','B1-B15'], amenities:['Food Court','Lounges','Duty Free','Prayer Room'] },
      { id:'T2', name:'Terminal 2 (International)', gates:['C1-C30','D1-D20'], amenities:['Premium Lounges','Retail Mall','Spa','Children Area'] },
    ]},
    DEL: { name:'Indira Gandhi International Airport', terminals:[
      { id:'T1', name:'Terminal 1 (Low-cost carriers)', gates:['D1-D18'], amenities:['Quick Bites','ATM','Shopping'] },
      { id:'T2', name:'Terminal 2 (Closed)', gates:[], amenities:[] },
      { id:'T3', name:'Terminal 3 (International/Full-service)', gates:['A1-A30','B1-B25','C1-C20'], amenities:['Grand Hyatt Lounge','Yoga Room','Art Gallery','Premium Dining'] },
    ]},
    BLR: { name:'Kempegowda International Airport', terminals:[
      { id:'T1', name:'Terminal 1 (Current)', gates:['A1-A25','B1-B20'], amenities:['Food Court','Lounge','Retail'] },
      { id:'T2', name:'Terminal 2 (New)', gates:['C1-C30'], amenities:['Premium Lounges','Gardens','Fine Dining','Art Zone'] },
    ]},
    CCU: { name:'Netaji Subhas Chandra Bose International Airport', terminals:[
      { id:'T1', name:'Domestic Terminal', gates:['D1-D12'], amenities:['Cafe','ATM','Shopping'] },
      { id:'T2', name:'International Terminal', gates:['A1-A15','B1-B10'], amenities:['Lounge','Duty Free','Restaurant'] },
    ]},
  };
  const code = (req.query.code||'BOM').toUpperCase();
  const info = terminals[code] || terminals['BOM'];
  res.json({ success: true, data: { code, ...info }});
});


router.get('/multicity/fare', (req, res) => {
  const { legs } = req.query; 
  if (!legs) return res.status(400).json({ error: 'legs param required e.g. BOM-DEL,DEL-BLR' });
  const basePrices = { 'BOM-DEL':4500,'DEL-BOM':4500,'BLR-CCU':5800,'CCU-BLR':5800,'MAA-HYD':3200,'HYD-MAA':3200,'DEL-GOI':7000,'GOI-DEL':7000,'CCU-BOM':4200,'BOM-CCU':4200,'PNQ-AMD':2600 };
  const airlines   = ['IndiGo','Air India','SpiceJet','Vistara'];
  const durations  = {'BOM-DEL':'2h 10m','DEL-BOM':'2h 10m','BLR-CCU':'2h 45m','CCU-BLR':'2h 45m','MAA-HYD':'1h 20m','DEL-GOI':'2h 30m','CCU-BOM':'2h 50m','PNQ-AMD':'1h 15m'};
  const legArr = legs.split(',').map(l=>l.trim().toUpperCase());
  const result  = legArr.map((l,i)=>{
    const [from,to]=l.split('-');
    const seed=(from+to).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const price=basePrices[l]||Math.round(2000+seed%5000);
    return { leg:i+1, from, to, price, airline:airlines[seed%airlines.length], duration:durations[l]||'2h 0m' };
  });
  const total=result.reduce((s,l)=>s+l.price,0);
  const multiDiscount=Math.round(total*0.07); // 7% multi-city discount
  res.json({ success:true, data:{ legs:result, subtotal:total, multiCityDiscount:multiDiscount, total:total-multiDiscount }});
});


router.get('/promos/validate', (req, res) => {
  const codes = {
    'SAVE10':  { discount: 10, type: 'percent', desc: '10% off your booking' },
    'FIRST200':{ discount: 200, type: 'flat',   desc: '₹200 off first booking' },
    'BMF50':   { discount: 50, type: 'flat',    desc: '₹50 instant discount' },
    'FLY20':   { discount: 20, type: 'percent', desc: '20% off — Limited time' },
    'WELCOME': { discount: 15, type: 'percent', desc: '15% welcome discount' },
  };
  const code = (req.query.code || '').toUpperCase().trim();
  const promo = codes[code];
  if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
  res.json({ success: true, data: { code, ...promo } });
});

// GET /api/airlines/reviews?airline=IndiGo — Airline reviews
router.get('/airlines/reviews', (req, res) => {
  const reviews = {
    'IndiGo': { avg: 4.1, total: 1284, breakdown: { 5:52, 4:28, 3:12, 2:5, 1:3 },
      topReviews: [
        { name:'Rahul M.', rating:5, comment:'Always on time, clean aircraft. Best budget airline in India!', date:'2026-05-10' },
        { name:'Priya S.', rating:4, comment:'Good service, staff very helpful. Seat comfort could be better.', date:'2026-05-01' },
        { name:'Arjun K.', rating:3, comment:'Delayed by 40 mins but crew managed well.', date:'2026-04-22' },
      ]},
    'Air India': { avg: 3.8, total: 892, breakdown: { 5:35, 4:30, 3:18, 2:10, 1:7 },
      topReviews: [
        { name:'Neha T.', rating:5, comment:'Business class is world-class. Food was amazing!', date:'2026-05-08' },
        { name:'Vikram B.', rating:4, comment:'Good legroom, meals included. A bit old aircraft.', date:'2026-04-30' },
        { name:'Sunita R.', rating:3, comment:'Check-in was slow but flight was smooth.', date:'2026-04-15' },
      ]},
    'SpiceJet': { avg: 3.6, total: 743, breakdown: { 5:28, 4:25, 3:22, 2:15, 1:10 },
      topReviews: [
        { name:'Amit P.', rating:4, comment:'Cheap fares, decent service. Gets the job done!', date:'2026-05-12' },
        { name:'Kavya L.', rating:3, comment:'Flight was okay, app needs improvement.', date:'2026-05-02' },
        { name:'Ravi N.', rating:3, comment:'On time today which was a pleasant surprise.', date:'2026-04-18' },
      ]},
    'Vistara': { avg: 4.5, total: 621, breakdown: { 5:65, 4:22, 3:8, 2:3, 1:2 },
      topReviews: [
        { name:'Divya C.', rating:5, comment:'Premium Economy was worth every rupee. Staff exceptional!', date:'2026-05-15' },
        { name:'Karan J.', rating:5, comment:'Best domestic airline. Always a pleasure flying Vistara.', date:'2026-05-05' },
        { name:'Meera S.', rating:4, comment:'Very professional crew and punctual departure.', date:'2026-04-28' },
      ]},
  };
  const airline = req.query.airline || 'IndiGo';
  const key = Object.keys(reviews).find(k => airline.includes(k)) || 'IndiGo';
  res.json({ success: true, data: { airline: key, ...reviews[key] } });
});

router.get('/flights/compare', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  const seed = (from+to).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const options = [
    { airline:'IndiGo', code:'6E-204', class:'Economy', price: 3200+(seed%2000), duration:'2h 10m', baggage:'15kg', meals:'Paid', stops:'Non-stop', rating:4.1, onTimePercent:88 },
    { airline:'Air India', code:'AI-101', class:'Economy', price: 4100+(seed%1800), duration:'2h 20m', baggage:'25kg', meals:'Included', stops:'Non-stop', rating:3.8, onTimePercent:81 },
    { airline:'SpiceJet', code:'SG-302', class:'Economy', price: 2900+(seed%1500), duration:'2h 35m', baggage:'15kg', meals:'Paid', stops:'1 stop', rating:3.6, onTimePercent:76 },
    { airline:'Vistara', code:'UK-801', class:'Premium Economy', price: 5800+(seed%2200), duration:'2h 05m', baggage:'35kg', meals:'Included', stops:'Non-stop', rating:4.5, onTimePercent:93 },
  ];
  res.json({ success: true, data: { from, to, options } });
});

router.get('/deals/surprise', async (req, res) => {
  try {
    const deals = await dealService.getActiveDeals();
    if (!deals.length) return res.status(404).json({ error: 'No active deals' });
    const pick = deals[Math.floor(Math.random() * deals.length)];
    res.json({ success: true, data: pick });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


router.get('/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const all = await bookingService.getAllBookings();
    const deals = await dealService.getAllDeals();
    // Group by day
    const byDay = {};
    all.forEach(b => {
      const day = (b.bookedAt||'').slice(0,10);
      if (!byDay[day]) byDay[day] = { bookings:0, revenue:0 };
      byDay[day].bookings++;
      byDay[day].revenue += b.total||0;
    });
    const chart = Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([date,v])=>({date,...v}));
    // Popular routes
    const routes = {};
    all.forEach(b => {
      const k = `${b.fromCode}-${b.toCode}`;
      if (!routes[k]) routes[k] = 0;
      routes[k]++;
    });
    const popularRoutes = Object.entries(routes).sort(([,a],[,b])=>b-a).slice(0,5).map(([r,c])=>({route:r,bookings:c}));
    // Deal performance
    const dealPerf = deals.map(d => ({
      id:d.id, route:`${d.fromCode}-${d.toCode}`,
      bookings: all.filter(b=>b.dealId===d.id).length,
      revenue:  all.filter(b=>b.dealId===d.id).reduce((s,b)=>s+(b.total||0),0),
    })).sort((a,b)=>b.bookings-a.bookings);
    res.json({ success:true, data:{ chart, popularRoutes, dealPerformance:dealPerf, totalRevenue:all.reduce((s,b)=>s+(b.total||0),0), totalBookings:all.length }});
  } catch(e){ res.status(500).json({ error:e.message }); }
});


router.post('/waitlist', (req, res) => {
  const { from, to, targetPrice, phone, email } = req.body;
  if (!from || !to || !phone) return res.status(400).json({ error: 'from, to, phone required' });
  // In production this would persist — for now acknowledge
  const ref = 'WL' + Math.random().toString(36).slice(2,8).toUpperCase();
  res.json({ success:true, data:{ ref, from, to, targetPrice, phone, message:`You're on the waitlist! We'll alert ${phone} when a ${from}→${to} deal drops below ₹${targetPrice||'any price'}.` }});
});


module.exports = router;
