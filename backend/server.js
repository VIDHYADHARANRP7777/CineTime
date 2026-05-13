const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── RAZORPAY ──────────────────────────────────────────────────────────────────
// ✅ Updated credentials — read from env first, then fallback to hardcoded
const RZP_KEY_ID     = process.env.RAZORPAY_KEY_ID     || 'rzp_test_Soiy52I6HkMaEN';
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dlNQKRcxwDzqNd6aKqF7AyOv';

console.log('🔑 Razorpay Key:', RZP_KEY_ID.slice(0,20)+'...');
console.log('🔑 Secret length:', RZP_KEY_SECRET.length);

let razorpay = null;
try {
  if (RZP_KEY_ID && RZP_KEY_SECRET && RZP_KEY_ID.startsWith('rzp_')) {
    razorpay = new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET });
    console.log('✅ Razorpay initialized:', RZP_KEY_ID.slice(0,16)+'...');
  } else {
    console.warn('⚠️  Razorpay keys invalid — will use simulated mode');
  }
} catch(e) {
  console.error('❌ Razorpay init error:', e.message);
}

// ── MONGODB ───────────────────────────────────────────────────────────────────
const mongoURI = process.env.MONGO_URI ||
  'mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0';
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 20000 })
  .then(() => { console.log('✅ MongoDB Connected'); seedDefaults(); })
  .catch(err => console.error('❌ MongoDB:', err.message));

// ── SCHEMAS ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  email: String, phone: String,
  role:      { type: String, default: 'user' },
  cineCoins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const screenSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  rows:        { type: Number, default: 8 },
  seatsPerRow: { type: Number, default: 10 },
  capacity:    { type: Number, default: 80 },
  screenType:  { type: String, default: 'Standard' },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

const movieSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  genre:    String,
  language: { type: String, default: 'Tamil' },
  duration: String,
  rating:   { type: Number, default: 8.0 },
  shows: [{
    time:        String,
    screenId:    String,
    screenName:  String,
    screenType:  { type: String, default: 'Standard' },
    rows:        { type: Number, default: 8 },
    seatsPerRow: { type: Number, default: 10 },
    capacity:    { type: Number, default: 80 },
  }],
  timings:  [String],
  pricing: {
    morning:   { type: Number, default: 120 },
    afternoon: { type: Number, default: 150 },
    evening:   { type: Number, default: 180 },
    night:     { type: Number, default: 200 },
  },
  img:         String,
  description: String,
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

const snackSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  emoji:       { type: String, default: '🍿' },
  price:       { type: Number, required: true },
  coinPrice:   { type: Number, default: 0 },
  category:    { type: String, default: 'Snacks' },
  img:         { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

const parkingSchema = new mongoose.Schema({
  slotNumber:  { type: String, required: true, unique: true },
  block:       { type: String, default: 'A' },
  slotType:    { type: String, enum: ['Two-Wheeler','Four-Wheeler','Disabled'], default: 'Two-Wheeler' },
  price:       { type: Number, default: 30 },
  coinPrice:   { type: Number, default: 15 },
  isBooked:    { type: Boolean, default: false },
  bookedBy:    { type: String, default: null },
  bookingDate: Date, showTiming: String, movieName: String,
});

const ticketSchema = new mongoose.Schema({
  username:          String,
  movieName:         String,
  timing:            String,
  screenName:        { type: String, default: '' },
  rows:              { type: Number, default: 8 },
  seatsPerRow:       { type: Number, default: 10 },
  selectedSeats:     [Number],
  amount:            { type: Number, default: 0 },
  coinsUsed:         { type: Number, default: 0 },
  coinsEarned:       { type: Number, default: 0 },
  paymentMethod:     { type: String, default: 'razorpay' },
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  status:            { type: String, default: 'confirmed' },
  eTicketQR:         String,
  date:              { type: Date, default: Date.now },
});

const refreshmentOrderSchema = new mongoose.Schema({
  username:          String,
  movieName:         String,
  timing:            String,
  items:             [{ name: String, qty: Number, price: Number, coinPrice: Number }],
  total:             { type: Number, default: 0 },
  coinsUsed:         { type: Number, default: 0 },
  coinsEarned:       { type: Number, default: 0 },
  paymentMethod:     { type: String, default: 'razorpay' },
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  status:            { type: String, default: 'confirmed' },
  date:              { type: Date, default: Date.now },
});

const adminBookingSchema = new mongoose.Schema({
  username:      String,
  movieName:     String,
  timing:        String,
  screenName:    { type: String, default: '' },
  rows:          { type: Number, default: 8 },
  seatsPerRow:   { type: Number, default: 10 },
  selectedSeats: [Number],
  amount:        { type: Number, default: 0 },
  notes:         String,
  bookedBy:      { type: String, default: 'admin' },
  status:        { type: String, default: 'confirmed' },
  eTicketQR:     String,
  date:          { type: Date, default: Date.now },
});

const parkingBookingSchema = new mongoose.Schema({
  username:          String,
  slotNumber:        String,
  block:             String,
  slotType:          String,
  price:             { type: Number, default: 0 },
  coinPrice:         { type: Number, default: 0 },
  coinsUsed:         { type: Number, default: 0 },
  coinsEarned:       { type: Number, default: 0 },
  paymentMethod:     { type: String, default: 'razorpay' },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  movieName:         String,
  showTiming:        String,
  status:            { type: String, default: 'confirmed' },
  date:              { type: Date, default: Date.now },
});

const Screen           = mongoose.model('Screen',            screenSchema);
const User             = mongoose.model('User',              userSchema);
const Movie            = mongoose.model('Movie',             movieSchema);
const Snack            = mongoose.model('Snack',             snackSchema);
const ParkingSlot      = mongoose.model('ParkingSlot',       parkingSchema);
const Ticket           = mongoose.model('Ticket',            ticketSchema);
const RefreshmentOrder = mongoose.model('RefreshmentOrder',  refreshmentOrderSchema);
const AdminBooking     = mongoose.model('AdminBooking',      adminBookingSchema);
const ParkingBooking   = mongoose.model('ParkingBooking',    parkingBookingSchema);

// ── HELPER ────────────────────────────────────────────────────────────────────
async function getCoins(username) {
  const u = await User.findOne({ username });
  return u?.cineCoins || 0;
}

// ── SEED ──────────────────────────────────────────────────────────────────────
async function seedDefaults() {
  try {
    let screens = await Screen.find({ isActive: true });
    if (!screens.length) {
      screens = await Screen.insertMany([
        { name:'Screen 1',  rows:8,  seatsPerRow:10, capacity:80,  screenType:'Standard' },
        { name:'Screen 2',  rows:8,  seatsPerRow:10, capacity:80,  screenType:'Premium'  },
        { name:'IMAX Hall', rows:10, seatsPerRow:12, capacity:120, screenType:'IMAX'     },
      ]);
      console.log('🖥️  Screens seeded');
    }

    if (!await Movie.countDocuments()) {
      const [s1,s2,s3] = [screens[0], screens[1]||screens[0], screens[2]||screens[0]];
      const mk = (t,s) => ({ time:t, screenId:s._id.toString(), screenName:s.name, screenType:s.screenType, rows:s.rows, seatsPerRow:s.seatsPerRow, capacity:s.capacity });
      await Movie.insertMany([
        { title:'Leo', genre:'Action/Thriller', language:'Tamil', duration:'2h 44m', rating:8.2,
          shows:[mk('10:00 AM',s1),mk('2:30 PM',s2),mk('6:00 PM',s1),mk('10:30 PM',s3)],
          timings:['10:00 AM','2:30 PM','6:00 PM','10:30 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Leo_2023_film_poster.jpg/220px-Leo_2023_film_poster.jpg',
          description:'A mild-mannered man who runs a food business has his past catch up with him.' },
        { title:'Vikram', genre:'Action', language:'Tamil', duration:'2h 55m', rating:8.4,
          shows:[mk('10:15 AM',s2),mk('2:15 PM',s1),mk('6:15 PM',s3),mk('10:15 PM',s2)],
          timings:['10:15 AM','2:15 PM','6:15 PM','10:15 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Vikram_2022_film_poster.jpg/220px-Vikram_2022_film_poster.jpg',
          description:'A special agent investigates a series of murders by masked men.' },
        { title:'Oppenheimer', genre:'Biography/Drama', language:'English', duration:'3h 0m', rating:8.9,
          shows:[mk('11:00 AM',s3),mk('3:00 PM',s1),mk('7:00 PM',s2)],
          timings:['11:00 AM','3:00 PM','7:00 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/220px-Oppenheimer_%28film%29.jpg',
          description:'The story of J. Robert Oppenheimer and the Manhattan Project.' },
        { title:'Jawan', genre:'Action/Drama', language:'Hindi', duration:'2h 49m', rating:7.5,
          shows:[mk('9:30 AM',s1),mk('1:00 PM',s3),mk('5:30 PM',s2),mk('9:30 PM',s1)],
          timings:['9:30 AM','1:00 PM','5:30 PM','9:30 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Jawan_film_poster.jpg/220px-Jawan_film_poster.jpg',
          description:'A prison warden recruits women to fight injustice.' },
      ]);
      console.log('🎬 Movies seeded');
    }

    if (!await Snack.countDocuments()) {
      await Snack.insertMany([
        { name:'Popcorn (Large)',      emoji:'🍿', price:180, coinPrice:90,  category:'Snacks', img:'' },
        { name:'Popcorn (Medium)',     emoji:'🍿', price:120, coinPrice:60,  category:'Snacks', img:'' },
        { name:'Nachos + Cheese',      emoji:'🌮', price:150, coinPrice:75,  category:'Snacks', img:'' },
        { name:'Hot Dog',              emoji:'🌭', price:130, coinPrice:65,  category:'Snacks', img:'' },
        { name:'Veg Burger',           emoji:'🍔', price:110, coinPrice:55,  category:'Snacks', img:'' },
        { name:'Chocolate Bar',        emoji:'🍫', price:70,  coinPrice:35,  category:'Snacks', img:'' },
        { name:'Pepsi (Large)',        emoji:'🥤', price:90,  coinPrice:45,  category:'Drinks', img:'' },
        { name:'Pepsi (Medium)',       emoji:'🥤', price:60,  coinPrice:30,  category:'Drinks', img:'' },
        { name:'Water Bottle',         emoji:'💧', price:40,  coinPrice:20,  category:'Drinks', img:'' },
        { name:'Fresh Lime Soda',      emoji:'🍋', price:80,  coinPrice:40,  category:'Drinks', img:'' },
        { name:'Combo (Popcorn+Pepsi)',emoji:'🎉', price:230, coinPrice:115, category:'Combos', img:'' },
        { name:'Family Pack',          emoji:'🎊', price:450, coinPrice:225, category:'Combos', img:'' },
      ]);
      console.log('🍿 Snacks seeded');
    }

    if (!await ParkingSlot.countDocuments()) {
      const slots = [];
      for(let i=1;i<=15;i++) slots.push({slotNumber:`A${i}`,block:'A',slotType:'Two-Wheeler', price:30,coinPrice:15});
      for(let i=1;i<=12;i++) slots.push({slotNumber:`B${i}`,block:'B',slotType:'Four-Wheeler',price:60,coinPrice:30});
      for(let i=1;i<=8; i++) slots.push({slotNumber:`C${i}`,block:'C',slotType:'Four-Wheeler',price:80,coinPrice:40});
      for(let i=1;i<=5; i++) slots.push({slotNumber:`D${i}`,block:'D',slotType:'Disabled',    price:0, coinPrice:0 });
      await ParkingSlot.insertMany(slots);
      console.log('🅿️  Parking seeded');
    }
  } catch(e) { console.error('Seed error:', e.message); }
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/', (req,res) => res.json({ status:'Cine Time API ✅', version:'9.0', razorpay: razorpay ? 'live' : 'simulated', keyId: RZP_KEY_ID.slice(0,16)+'...' }));
app.get('/api', (req,res) => res.json({ status:'Cine Time API ✅', version:'9.0', razorpay: razorpay ? 'live' : 'simulated', keyId: RZP_KEY_ID }));

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req,res) => {
  try {
    const { username, password, email, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error:'Username and password required' });
    if (await User.findOne({ username })) return res.status(400).json({ error:'Username already exists' });
    await new User({ username, password, email, phone }).save();
    res.status(201).json({ message:'Success' });
  } catch { res.status(400).json({ error:'Username already exists' }); }
});

app.post('/api/login', async (req,res) => {
  try {
    const { username, password } = req.body;
    if (username==='admin' && password==='7777') return res.json({ user:'admin', role:'admin', cineCoins:0 });
    const user = await User.findOne({ username, password });
    if (user) return res.json({ user:user.username, role:'user', email:user.email||'', cineCoins:user.cineCoins||0 });
    res.status(401).json({ error:'Invalid credentials' });
  } catch { res.status(500).json({ error:'Server error' }); }
});

app.get('/api/user/coins/:username', async (req,res) => {
  try { res.json({ cineCoins: await getCoins(req.params.username) }); }
  catch { res.json({ cineCoins:0 }); }
});

// ── SCREENS ───────────────────────────────────────────────────────────────────
app.get('/api/screens', async (req,res) => {
  try {
    const screens = await Screen.find({ isActive:true }).sort({ name:1 });
    console.log(`📡 GET /api/screens → ${screens.length} screens`);
    res.json(screens);
  } catch(e) {
    console.error('GET /api/screens error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/screens', async (req,res) => {
  try {
    const { name, rows, seatsPerRow, screenType } = req.body;
    if (!name?.trim()) return res.status(400).json({ error:'Screen name required' });
    const r   = parseInt(rows)        || 8;
    const spr = parseInt(seatsPerRow) || 10;
    const screen = await Screen.findOneAndUpdate(
      { name: name.trim() },
      { name:name.trim(), rows:r, seatsPerRow:spr, capacity:r*spr, screenType:screenType||'Standard', isActive:true },
      { new:true, upsert:true }
    );
    console.log('✅ Screen saved:', screen.name);
    res.status(201).json(screen);
  } catch(e) {
    console.error('POST /api/admin/screens error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/admin/screens/:id', async (req,res) => {
  try {
    const r   = parseInt(req.body.rows)        || 8;
    const spr = parseInt(req.body.seatsPerRow) || 10;
    const sc  = await Screen.findByIdAndUpdate(req.params.id,
      { name:req.body.name?.trim(), rows:r, seatsPerRow:spr, capacity:r*spr, screenType:req.body.screenType||'Standard' },
      { new:true }
    );
    if (!sc) return res.status(404).json({ error:'Screen not found' });
    res.json(sc);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.delete('/api/admin/screens/:id', async (req,res) => {
  try {
    await Screen.findByIdAndUpdate(req.params.id, { isActive:false });
    res.json({ message:'Removed' });
  } catch { res.status(400).json({ error:'Failed' }); }
});

// ── RAZORPAY ─────────────────────────────────────────────────────────────────
// ✅ FIXED: Always returns keyId so frontend uses the correct key
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    console.log(`💰 create-order: ₹${amount} | razorpay=${razorpay ? 'LIVE' : 'SIMULATED'} | key=${RZP_KEY_ID.slice(0,16)}...`);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Always return keyId so frontend can use it
    if (!razorpay) {
      return res.json({
        orderId:   `order_SIM_${Date.now()}`,
        amount:    Math.round(amount*100),
        amountINR: amount,
        currency:  'INR',
        keyId:     RZP_KEY_ID,   // ✅ always present
        simulated: true,
        reason:    'Razorpay not initialized'
      });
    }

    const order = await razorpay.orders.create({
      amount:   Math.round(amount*100),
      currency: req.body.currency || 'INR',
      receipt:  req.body.receipt  || `rcpt_${Date.now()}`,
      notes:    req.body.notes    || {},
    });
    console.log('✅ Real Razorpay order:', order.id);
    return res.json({
      orderId:   order.id,
      amount:    order.amount,
      amountINR: amount,
      currency:  order.currency,
      keyId:     RZP_KEY_ID,   // ✅ always present
      simulated: false,
    });
  } catch (err) {
    const msg = err.error?.description || err.message || 'Unknown';
    console.error('❌ create-order error:', msg);
    // Even on error, return a usable simulated order WITH keyId
    return res.json({
      orderId:   `order_SIM_${Date.now()}`,
      amount:    Math.round((parseFloat(req.body.amount)||0)*100),
      amountINR: parseFloat(req.body.amount)||0,
      currency:  'INR',
      keyId:     RZP_KEY_ID,   // ✅ always present
      simulated: true,
      reason:    msg,
    });
  }
});

app.post('/api/payment/verify', async (req,res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error:'Missing fields' });
    if (razorpay_order_id.startsWith('order_SIM_') || razorpay_order_id.startsWith('order_FALLBACK_'))
      return res.json({ success:true, simulated:true });
    const expected = crypto.createHmac('sha256', RZP_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ success:false, error:'Signature mismatch' });
    res.json({ success:true, paymentId:razorpay_payment_id });
  } catch(e) { res.status(500).json({ error:'Verification failed: '+e.message }); }
});

// ── MOVIES ────────────────────────────────────────────────────────────────────
app.get('/api/movies', async (req,res) => {
  try { res.json(await Movie.find({ isActive:true }).sort({ createdAt:1 })); }
  catch { res.json([]); }
});

const buildShows = (shows, timings) => {
  if (Array.isArray(shows) && shows.length) {
    return shows.map(s => ({
      time:        s.time,
      screenId:    s.screenId   || '',
      screenName:  s.screenName || '',
      screenType:  s.screenType || 'Standard',
      rows:        parseInt(s.rows)        || 8,
      seatsPerRow: parseInt(s.seatsPerRow) || 10,
      capacity:    parseInt(s.capacity)    || (parseInt(s.rows)||8)*(parseInt(s.seatsPerRow)||10),
    }));
  }
  if (timings) {
    const arr = Array.isArray(timings) ? timings : timings.split(',').map(t=>t.trim()).filter(Boolean);
    return arr.map(t => ({ time:t, screenId:'', screenName:'', screenType:'Standard', rows:8, seatsPerRow:10, capacity:80 }));
  }
  return [];
};

app.post('/api/admin/movies', async (req,res) => {
  try {
    const { title, genre, language, duration, rating, shows, timings, pricing, img, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error:'Title required' });
    const showsArr = buildShows(shows, timings);
    const movie = await Movie.findOneAndUpdate({ title:title.trim() },
      { title:title.trim(), genre, language, duration, rating:parseFloat(rating)||8.0,
        shows:showsArr, timings:showsArr.map(s=>s.time),
        pricing: pricing || { morning:120, afternoon:150, evening:180, night:200 },
        img:img||'', description:description||'', isActive:true },
      { new:true, upsert:true }
    );
    console.log('✅ Movie saved:', movie.title);
    res.status(201).json(movie);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.put('/api/admin/movies/:id', async (req,res) => {
  try {
    const { title, genre, language, duration, rating, shows, timings, pricing, img, description } = req.body;
    const showsArr = buildShows(shows, timings);
    const upd = { genre, language, duration, rating:parseFloat(rating)||8.0,
      shows:showsArr, timings:showsArr.map(s=>s.time),
      pricing: pricing || { morning:120, afternoon:150, evening:180, night:200 },
      img:img||'', description:description||'', isActive:true };
    if (title?.trim()) upd.title = title.trim();
    let saved = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id))
      saved = await Movie.findByIdAndUpdate(req.params.id, upd, { new:true });
    if (!saved && title?.trim())
      saved = await Movie.findOneAndUpdate({ title:title.trim() }, upd, { new:true, upsert:true });
    if (!saved) return res.status(404).json({ error:'Movie not found' });
    res.json(saved);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

// ✅ FIXED: Cascading delete — removes all Tickets & AdminBookings for the movie
app.delete('/api/admin/movies/:id', async (req,res) => {
  try {
    let movieTitle = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const m = await Movie.findByIdAndDelete(req.params.id);
      movieTitle = m?.title || null;
    }
    if (movieTitle) {
      const [td, ad] = await Promise.all([
        Ticket.deleteMany({ movieName: movieTitle }),
        AdminBooking.deleteMany({ movieName: movieTitle }),
      ]);
      console.log(`🗑 Cascading delete for "${movieTitle}": ${td.deletedCount} tickets, ${ad.deletedCount} admin bookings`);
    }
    res.json({ message:'Deleted', cascaded: movieTitle ? true : false });
  } catch(e) { res.status(400).json({ error:'Delete failed: '+e.message }); }
});

// ── SNACKS ────────────────────────────────────────────────────────────────────
app.get('/api/snacks', async (req,res) => {
  try { res.json(await Snack.find({ isAvailable:true })); }
  catch { res.json([]); }
});

app.post('/api/admin/snacks', async (req,res) => {
  try {
    const snack = await Snack.findOneAndUpdate(
      { name: req.body.name },
      { ...req.body, isAvailable:true },
      { new:true, upsert:true }
    );
    res.status(201).json(snack);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.put('/api/admin/snacks/:id', async (req,res) => {
  try {
    let s = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id))
      s = await Snack.findByIdAndUpdate(req.params.id, req.body, { new:true });
    if (!s) s = await Snack.findOneAndUpdate({ name:req.body.name }, req.body, { new:true, upsert:true });
    res.json(s);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.delete('/api/admin/snacks/:id', async (req,res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) await Snack.findByIdAndDelete(req.params.id);
    res.json({ message:'Deleted' });
  } catch { res.status(400).json({ error:'Delete failed' }); }
});

// ── PARKING ───────────────────────────────────────────────────────────────────
app.get('/api/parking', async (req,res) => {
  try {
    let slots = await ParkingSlot.find().sort({ slotNumber:1 });
    if (!slots.length) {
      const ns = [];
      for(let i=1;i<=15;i++) ns.push({slotNumber:`A${i}`,block:'A',slotType:'Two-Wheeler', price:30,coinPrice:15});
      for(let i=1;i<=12;i++) ns.push({slotNumber:`B${i}`,block:'B',slotType:'Four-Wheeler',price:60,coinPrice:30});
      for(let i=1;i<=8; i++) ns.push({slotNumber:`C${i}`,block:'C',slotType:'Four-Wheeler',price:80,coinPrice:40});
      for(let i=1;i<=5; i++) ns.push({slotNumber:`D${i}`,block:'D',slotType:'Disabled',    price:0, coinPrice:0 });
      await ParkingSlot.insertMany(ns);
      slots = await ParkingSlot.find().sort({ slotNumber:1 });
    }
    res.json(slots);
  } catch { res.json([]); }
});

app.post('/api/parking/book', async (req,res) => {
  try {
    const { slotNumber, username, showTiming, movieName, paymentMethod, coinsUsed, razorpayOrderId, razorpayPaymentId } = req.body;
    if (!slotNumber || !username) return res.status(400).json({ error:'slotNumber and username required' });
    const slot = await ParkingSlot.findOne({ slotNumber });
    if (!slot)       return res.status(404).json({ error:`Slot ${slotNumber} not found` });
    if (slot.isBooked) return res.status(400).json({ error:`Slot ${slotNumber} already booked` });
    let actualCoinsUsed = 0, coinsEarned = 0;
    if (paymentMethod === 'coins') {
      const needed = coinsUsed || slot.coinPrice;
      const user = await User.findOne({ username });
      if (!user || user.cineCoins < needed)
        return res.status(400).json({ error:`Need ${needed} coins. You have ${user?.cineCoins||0}.` });
      await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:-needed } });
      actualCoinsUsed = needed;
    } else if (paymentMethod === 'offline') {
      // ✅ Offline booking — no coins earned, no payment needed
      coinsEarned = 0;
    } else {
      coinsEarned = slot.slotType !== 'Disabled' ? 5 : 0;
      if (coinsEarned > 0) await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:coinsEarned } });
    }
    slot.isBooked   = true;
    slot.bookedBy   = username;
    slot.bookingDate = new Date();
    slot.showTiming  = showTiming || '';
    slot.movieName   = movieName  || 'General';
    await slot.save();
    await ParkingBooking.create({
      username, slotNumber:slot.slotNumber, block:slot.block||slot.slotNumber.charAt(0),
      slotType:slot.slotType, price:paymentMethod==='coins'?0:slot.price,
      coinPrice:slot.coinPrice, coinsUsed:actualCoinsUsed, coinsEarned,
      paymentMethod:paymentMethod||'razorpay',
      razorpayOrderId:razorpayOrderId||null, razorpayPaymentId:razorpayPaymentId||null,
      movieName:movieName||'General', showTiming:showTiming||'', status:'confirmed',
    });
    const newCoinBalance = await getCoins(username);
    res.json({ message:'Parking booked', slot, coinsEarned, newCoinBalance });
  } catch(e) { console.error('Parking book:', e); res.status(500).json({ error:'Booking failed: '+e.message }); }
});

app.post('/api/parking/release/:slotNumber', async (req,res) => {
  try {
    await ParkingSlot.findOneAndUpdate({ slotNumber:req.params.slotNumber },
      { isBooked:false, bookedBy:null, bookingDate:null, showTiming:null, movieName:null });
    res.json({ message:'Released' });
  } catch { res.status(500).json({ error:'Release failed' }); }
});

app.delete('/api/admin/parking/reset', async (req,res) => {
  try {
    await ParkingSlot.updateMany({}, { isBooked:false, bookedBy:null, bookingDate:null, showTiming:null, movieName:null });
    res.json({ message:'All released' });
  } catch { res.status(500).json({ error:'Reset failed' }); }
});

// ✅ NEW: Admin offline parking booking (no payment gateway)
app.post('/api/admin/parking/offline', async (req,res) => {
  try {
    const { slotNumber, username, showTiming, movieName, notes } = req.body;
    if (!slotNumber || !username) return res.status(400).json({ error:'slotNumber and username required' });
    const slot = await ParkingSlot.findOne({ slotNumber });
    if (!slot)        return res.status(404).json({ error:`Slot ${slotNumber} not found` });
    if (slot.isBooked) return res.status(400).json({ error:`Slot ${slotNumber} already booked` });
    slot.isBooked    = true;
    slot.bookedBy    = username;
    slot.bookingDate = new Date();
    slot.showTiming  = showTiming || '';
    slot.movieName   = movieName  || 'General';
    await slot.save();
    await ParkingBooking.create({
      username, slotNumber:slot.slotNumber, block:slot.block||slot.slotNumber.charAt(0),
      slotType:slot.slotType, price:0, coinPrice:slot.coinPrice,
      coinsUsed:0, coinsEarned:0, paymentMethod:'offline',
      razorpayOrderId:null, razorpayPaymentId:null,
      movieName:movieName||'General', showTiming:showTiming||'',
      status:'confirmed',
    });
    res.json({ message:'Offline parking booked', slot });
  } catch(e) { res.status(500).json({ error:'Offline parking failed: '+e.message }); }
});

// ✅ NEW: Admin offline snack order (no payment gateway)
app.post('/api/admin/snacks/offline', async (req,res) => {
  try {
    const { username, items, total, notes } = req.body;
    if (!username || !items?.length) return res.status(400).json({ error:'username and items required' });
    const order = new RefreshmentOrder({
      username, movieName:'Admin Offline', timing:'',
      items: items.map(i=>({ name:i.name, qty:i.qty||1, price:i.price||0, coinPrice:i.coinPrice||0 })),
      total: total || items.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0),
      coinsUsed:0, coinsEarned:0,
      paymentMethod:'offline',
      razorpayOrderId:null, razorpayPaymentId:null,
      status:'confirmed',
    });
    await order.save();
    res.status(201).json({ message:'Offline snack order placed', orderId:order._id });
  } catch(e) { res.status(400).json({ error:'Offline snack order failed: '+e.message }); }
});

// ── BOOKED SEATS ──────────────────────────────────────────────────────────────
app.get('/api/booked-seats/:movieName/:timing', async (req,res) => {
  try {
    const { movieName, timing } = req.params;
    const screenName = req.query.screen || '';
    const q = { movieName, timing };
    if (screenName) q.screenName = screenName;
    const [tickets, adminBks] = await Promise.all([Ticket.find(q), AdminBooking.find(q)]);
    let booked = [];
    tickets.forEach(t  => booked.push(...t.selectedSeats));
    adminBks.forEach(t => booked.push(...t.selectedSeats));
    res.json([...new Set(booked)]);
  } catch { res.json([]); }
});

// ── BOOK TICKET ───────────────────────────────────────────────────────────────
app.post('/api/book', async (req,res) => {
  try {
    const { username, movieName, timing, screenName, rows, seatsPerRow, selectedSeats, amount, coinsUsed, paymentMethod, razorpayOrderId, razorpayPaymentId } = req.body;
    if (!username || !movieName || !timing || !selectedSeats?.length)
      return res.status(400).json({ error:'Missing required fields' });
    let actualCoinsUsed = 0, coinsEarned = 0;
    if (paymentMethod === 'coins') {
      const needed = 500 * selectedSeats.length;
      const user = await User.findOne({ username });
      if (!user || user.cineCoins < needed)
        return res.status(400).json({ error:`Need ${needed} coins. You have ${user?.cineCoins||0}.` });
      await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:-needed } });
      actualCoinsUsed = needed;
    } else {
      coinsEarned = selectedSeats.length * 10;
      await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:coinsEarned } });
    }
    let eTicketQR = null;
    try {
      eTicketQR = await qrcode.toDataURL(JSON.stringify({
        app:'CINETIME', user:username, movie:movieName, timing,
        screen:screenName||'', seats:selectedSeats.map(s=>s+1), txId:Date.now()
      }), { width:300, margin:2 });
    } catch(e) { console.error('QR error:', e.message); }

    const ticket = new Ticket({
      username, movieName, timing, screenName:screenName||'',
      rows:parseInt(rows)||8, seatsPerRow:parseInt(seatsPerRow)||10,
      selectedSeats: selectedSeats.map(s => parseInt(s)),
      amount: paymentMethod==='coins' ? 0 : (amount||0),
      coinsUsed:actualCoinsUsed, coinsEarned,
      paymentMethod:paymentMethod||'razorpay',
      razorpayOrderId:razorpayOrderId||null,
      razorpayPaymentId:razorpayPaymentId||null,
      status:'confirmed', eTicketQR,
    });
    await ticket.save();
    const newCoinBalance = await getCoins(username);
    res.status(201).json({ message:'Booked', coinsEarned, eTicketQR, ticketId:ticket._id, newCoinBalance });
  } catch(e) { console.error('Book ticket:', e); res.status(500).json({ error:'Booking failed: '+e.message }); }
});

// ── HISTORY ───────────────────────────────────────────────────────────────────
app.get('/api/history/:username', async (req,res) => {
  try {
    const u = req.params.username;
    const [tickets, adminBookings, refreshments, parking] = await Promise.all([
      Ticket.find({ username:u }).sort({ date:-1 }),
      AdminBooking.find({ username:u }).sort({ date:-1 }),
      RefreshmentOrder.find({ username:u }).sort({ date:-1 }),
      ParkingBooking.find({ username:u }).sort({ date:-1 }),
    ]);
    res.json({ tickets, adminBookings, refreshments, parking });
  } catch { res.json({ tickets:[], adminBookings:[], refreshments:[], parking:[] }); }
});

// ── REFRESHMENTS ──────────────────────────────────────────────────────────────
app.post('/api/refreshments/order', async (req,res) => {
  try {
    const { username, total, paymentMethod, coinsUsed, razorpayOrderId, razorpayPaymentId } = req.body;
    let actualCoinsUsed = 0, coinsEarned = 0;
    if (paymentMethod === 'coins') {
      const needed = coinsUsed || Math.ceil(total/2);
      const user = await User.findOne({ username });
      if (!user || user.cineCoins < needed)
        return res.status(400).json({ error:`Need ${needed} coins. You have ${user?.cineCoins||0}.` });
      await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:-needed } });
      actualCoinsUsed = needed;
    } else if (paymentMethod !== 'offline') {
      coinsEarned = 5;
      await User.findOneAndUpdate({ username }, { $inc:{ cineCoins:5 } });
    }
    const order = new RefreshmentOrder({
      ...req.body, coinsUsed:actualCoinsUsed, coinsEarned,
      razorpayOrderId:razorpayOrderId||null, razorpayPaymentId:razorpayPaymentId||null,
      status:'confirmed'
    });
    await order.save();
    const newCoinBalance = await getCoins(username);
    res.status(201).json({ message:'Order placed', coinsEarned, orderId:order._id, newCoinBalance });
  } catch(e) { res.status(400).json({ error:'Order failed: '+e.message }); }
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/all-bookings', async (req,res) => {
  try {
    const [tickets, adminBookings, refreshments, parking] = await Promise.all([
      Ticket.find({}).sort({ date:-1 }).limit(500),
      AdminBooking.find({}).sort({ date:-1 }).limit(200),
      RefreshmentOrder.find({}).sort({ date:-1 }).limit(500),
      ParkingBooking.find({}).sort({ date:-1 }).limit(200),
    ]);
    res.json({ tickets, adminBookings, refreshments, parking });
  } catch { res.json({ tickets:[], adminBookings:[], refreshments:[], parking:[] }); }
});

app.get('/api/admin/users', async (req,res) => {
  try { res.json(await User.find({}, 'username email phone cineCoins role').sort({ _id:-1 })); }
  catch { res.json([]); }
});

app.get('/api/admin/detailed-seats/:movieName/:timing', async (req,res) => {
  try {
    const { movieName, timing } = req.params;
    const screenName = req.query.screen || '';
    const q = { movieName, timing };
    if (screenName) q.screenName = screenName;
    const [tickets, adminBks] = await Promise.all([Ticket.find(q), AdminBooking.find(q)]);
    const seatMap = {};
    tickets.forEach(t  => t.selectedSeats.forEach(s => { seatMap[s] = { user:t.username,           type:'user',  method:t.paymentMethod }; }));
    adminBks.forEach(t => t.selectedSeats.forEach(s => { seatMap[s] = { user:t.username+' (Admin)', type:'admin' }; }));
    res.json(seatMap);
  } catch { res.json({}); }
});

app.delete('/api/admin/refresh/:movieName/:timing', async (req,res) => {
  try {
    await Promise.all([
      Ticket.deleteMany({ movieName:req.params.movieName, timing:req.params.timing }),
      AdminBooking.deleteMany({ movieName:req.params.movieName, timing:req.params.timing }),
    ]);
    res.json({ message:'Show reset' });
  } catch { res.status(500).json({ error:'Reset failed' }); }
});

app.post('/api/admin/book-direct', async (req,res) => {
  try {
    const { username, movieName, timing, screenName, rows, seatsPerRow, selectedSeats, amount, notes } = req.body;
    if (!username || !movieName || !timing || !selectedSeats?.length)
      return res.status(400).json({ error:'Missing fields' });
    const seats = selectedSeats.map(s => parseInt(s)-1).filter(n => !isNaN(n) && n >= 0);
    if (!seats.length) return res.status(400).json({ error:'No valid seats' });
    const q = { movieName, timing };
    if (screenName) q.screenName = screenName;
    const [ex, ax] = await Promise.all([Ticket.find(q), AdminBooking.find(q)]);
    const allBooked = [...ex.flatMap(t=>t.selectedSeats), ...ax.flatMap(t=>t.selectedSeats)];
    const conflicts = seats.filter(s => allBooked.includes(s));
    if (conflicts.length) return res.status(400).json({ error:`Seats ${conflicts.map(s=>s+1).join(', ')} already booked` });
    let eTicketQR = null;
    try {
      eTicketQR = await qrcode.toDataURL(JSON.stringify({
        app:'CINETIME-ADMIN', user:username, movie:movieName, timing,
        screen:screenName||'', seats:seats.map(s=>s+1), txId:Date.now()
      }), { width:300, margin:2 });
    } catch(e) { console.error('QR:', e.message); }
    const booking = new AdminBooking({
      username, movieName, timing, screenName:screenName||'',
      rows:parseInt(rows)||8, seatsPerRow:parseInt(seatsPerRow)||10,
      selectedSeats:seats, amount:amount||0, notes:notes||'',
      status:'confirmed', eTicketQR
    });
    await booking.save();
    res.status(201).json({ message:'Booking created', bookingId:booking._id, eTicketQR });
  } catch(e) { res.status(500).json({ error:'Direct booking failed: '+e.message }); }
});

// ✅ FIXED: Analytics now sums Ticket + AdminBooking revenue, uses $unionWith for popular movies
app.get('/api/admin/analytics', async (req,res) => {
  try {
    const [tRev, pRev, sRev, adminRev, coins, tb, ab, tu] = await Promise.all([
      Ticket.aggregate([{ $group:{ _id:null, total:{ $sum:'$amount' } } }]),
      ParkingBooking.aggregate([{ $group:{ _id:null, total:{ $sum:'$price' } } }]),
      RefreshmentOrder.aggregate([{ $group:{ _id:null, total:{ $sum:'$total' } } }]),
      AdminBooking.aggregate([{ $group:{ _id:null, total:{ $sum:'$amount' } } }]),
      Ticket.aggregate([{ $group:{ _id:null, total:{ $sum:'$coinsEarned' } } }]),
      Ticket.countDocuments(), AdminBooking.countDocuments(),
      User.countDocuments({ role:{ $ne:'admin' } }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);
    const fmt = '%m/%d';
    const [tD, pD, sD] = await Promise.all([
      Ticket.aggregate([{ $match:{ date:{ $gte:sevenDaysAgo } } },{ $group:{ _id:{ $dateToString:{ format:fmt, date:'$date' } }, revenue:{ $sum:'$amount' }, bookings:{ $sum:1 } } }]),
      ParkingBooking.aggregate([{ $match:{ date:{ $gte:sevenDaysAgo } } },{ $group:{ _id:{ $dateToString:{ format:fmt, date:'$date' } }, revenue:{ $sum:'$price' } } }]),
      RefreshmentOrder.aggregate([{ $match:{ date:{ $gte:sevenDaysAgo } } },{ $group:{ _id:{ $dateToString:{ format:fmt, date:'$date' } }, revenue:{ $sum:'$total' } } }]),
    ]);
    const dailyRevenue = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getMonth()+1}/${d.getDate()}`;
      dailyRevenue.push({
        date:     label,
        revenue:  (tD.find(r=>r._id===label)?.revenue||0) + (pD.find(r=>r._id===label)?.revenue||0) + (sD.find(r=>r._id===label)?.revenue||0),
        bookings: tD.find(r=>r._id===label)?.bookings||0,
      });
    }

    // ✅ Popular movies: union of Ticket + AdminBooking collections
    let movieStats = [];
    try {
      movieStats = await Ticket.aggregate([
        { $project: { movieName:1, amount:1 } },
        { $unionWith: { coll:'adminbookings', pipeline:[{ $project:{ movieName:1, amount:1 } }] } },
        { $group:{ _id:'$movieName', count:{ $sum:1 }, revenue:{ $sum:'$amount' } } },
        { $sort:{ count:-1 } },
        { $limit:5 },
      ]);
    } catch(e) {
      // Fallback if $unionWith not supported (MongoDB < 4.4)
      movieStats = await Ticket.aggregate([
        { $group:{ _id:'$movieName', count:{ $sum:1 }, revenue:{ $sum:'$amount' } } },
        { $sort:{ count:-1 } }, { $limit:5 }
      ]);
    }

    const ticketRev   = tRev[0]?.total   || 0;
    const adminBkRev  = adminRev[0]?.total || 0;
    const parkRev     = pRev[0]?.total    || 0;
    const snackRev    = sRev[0]?.total    || 0;

    res.json({
      totalRevenue:       ticketRev + adminBkRev + parkRev + snackRev,
      ticketRevenue:      ticketRev + adminBkRev,  // ✅ includes admin bookings
      parkingRevenue:     parkRev,
      refreshmentRevenue: snackRev,
      totalBookings:      tb,
      totalAdminBookings: ab,
      totalUsers:         tu,
      coinsIssued:        coins[0]?.total || 0,
      dailyRevenue,
      movieStats,
    });
  } catch(e) { res.status(500).json({ error:'Analytics failed: '+e.message }); }
});

// ── CHATBOT ───────────────────────────────────────────────────────────────────
app.post('/api/chatbot', async (req,res) => {
  try {
    const { message } = req.body;
    const movies = await Movie.find({ isActive:true });
    const lower  = message.toLowerCase();
    let reply;
    if      (lower.includes('movie') || lower.includes('showing')) reply = `Now showing: ${movies.map(m=>m.title).join(', ')} 🎬`;
    else if (lower.includes('price') || lower.includes('ticket'))  reply = '🎟 Morning ₹120 · Afternoon ₹150 · Evening ₹180 · Night ₹200. Or 500 CineCoins!';
    else if (lower.includes('coin'))                               reply = '🪙 Earn 10 coins/ticket, 5/snack, 5/parking. 500 coins = free ticket!';
    else if (lower.includes('parking'))                            reply = '🅿️ Block A ₹30 · B ₹60 · C ₹80 · D Free. +5🪙 via Razorpay!';
    else if (lower.includes('snack') || lower.includes('food'))    reply = '🍿 Popcorn, Nachos, Combos and more!';
    else reply = "Thanks for asking! I'm CineBot 🎬 Ask about movies, prices or CineCoins!";
    res.json({ reply });
  } catch { res.json({ reply:"Having trouble 🤖" }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Cine Time v9.0 on port ${PORT}`);
  console.log(`🔑 Razorpay: ${razorpay ? 'LIVE — ' + RZP_KEY_ID : 'SIMULATED MODE'}`);
  console.log(`🍃 MongoDB:  ${mongoURI.includes('localhost') ? 'Local' : 'Atlas'}`);
});