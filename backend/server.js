const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── MONGODB ───────────────────────────────────────────────────────────────────
const mongoURI = process.env.MONGO_URI ||
  'mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0';
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 20000 })
  .then(() => { console.log('✅ MongoDB Connected'); seedDefaults(); })
  .catch(err => console.error('❌ MongoDB:', err.message));

// ── SCHEMAS ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  uuid:      { type: String, default: () => uuidv4(), unique: true },
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  email:     String,
  phone:     String,
  role:      { type: String, default: 'user' },
  cineCoins: { type: Number, default: 0 },
  wallet:    { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const screenSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  rows:        { type: Number, default: 8 },
  seatsPerRow: { type: Number, default: 10 },
  capacity:    { type: Number, default: 80 },
  screenType:  { type: String, default: 'Standard' },
  basePrice:   { type: Number, default: 150 },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

// Seat category zone: defines row ranges + price multiplier
const seatCategorySchema = new mongoose.Schema({
  name:        { type: String },  // 'Balcony', 'Upper', 'Middle', 'Lower'
  fromRow:     { type: Number },  // 1-based row number start
  toRow:       { type: Number },  // 1-based row number end
  price:       { type: Number },  // fixed price for this zone
  color:       { type: String, default: '#007AFF' },
}, { _id: false });

const movieSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  genre:          String,
  language:       { type: String, default: 'Tamil' },
  duration:       String,
  rating:         { type: Number, default: 8.0 },
  isUpcoming:     { type: Boolean, default: false },
  shows: [{
    time:        String,
    screenId:    String,
    screenName:  String,
    screenType:  { type: String, default: 'Standard' },
    rows:        { type: Number, default: 8 },
    seatsPerRow: { type: Number, default: 10 },
    capacity:    { type: Number, default: 80 },
  }],
  timings:     [String],
  pricing: {
    morning:   { type: Number, default: 120 },
    afternoon: { type: Number, default: 150 },
    evening:   { type: Number, default: 180 },
    night:     { type: Number, default: 200 },
  },
  // NEW: seat zone categories
  seatCategories: [seatCategorySchema],
  img:         String,
  description: String,
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

const pastMovieSchema = new mongoose.Schema({
  title:          String,
  genre:          String,
  language:       String,
  duration:       String,
  rating:         Number,
  pricing:        Object,
  seatCategories: Array,
  img:            String,
  description:    String,
  totalTickets:   { type: Number, default: 0 },
  totalRevenue:   { type: Number, default: 0 },
  archivedAt:     { type: Date, default: Date.now },
  originalId:     String,
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

const ticketSchema = new mongoose.Schema({
  userUUID:          { type: String, required: true },
  username:          String,
  movieName:         String,
  timing:            String,
  screenName:        { type: String, default: '' },
  rows:              { type: Number, default: 8 },
  seatsPerRow:       { type: Number, default: 10 },
  selectedSeats:     [Number],
  // NEW: per-seat category breakdown
  seatDetails: [{
    seat:     Number,
    category: String,
    price:    Number,
  }],
  amount:            { type: Number, default: 0 },
  coinsUsed:         { type: Number, default: 0 },
  coinsEarned:       { type: Number, default: 0 },
  paymentMethod:     { type: String, default: 'simulated' },
  simPaymentId:      String,
  isUpcoming:        { type: Boolean, default: false },
  status:            { type: String, default: 'confirmed', enum: ['confirmed','cancelled'] },
  cancelledAt:       Date,
  refundAmount:      { type: Number, default: 0 },
  eTicketQR:         String,
  date:              { type: Date, default: Date.now },
});

const refreshmentOrderSchema = new mongoose.Schema({
  userUUID:        { type: String, required: true },
  username:        String,
  movieName:       String,
  timing:          String,
  items:           [{ name: String, qty: Number, price: Number, coinPrice: Number }],
  total:           { type: Number, default: 0 },
  coinsUsed:       { type: Number, default: 0 },
  coinsEarned:     { type: Number, default: 0 },
  paymentMethod:   { type: String, default: 'simulated' },
  simPaymentId:    String,
  status:          { type: String, default: 'confirmed' },
  date:            { type: Date, default: Date.now },
});

const adminBookingSchema = new mongoose.Schema({
  userUUID:      String,
  username:      String,
  movieName:     String,
  timing:        String,
  screenName:    { type: String, default: '' },
  rows:          { type: Number, default: 8 },
  seatsPerRow:   { type: Number, default: 10 },
  selectedSeats: [Number],
  seatDetails:   [{ seat: Number, category: String, price: Number }],
  amount:        { type: Number, default: 0 },
  notes:         String,
  bookedBy:      { type: String, default: 'admin' },
  isUpcoming:    { type: Boolean, default: false },
  status:        { type: String, default: 'confirmed' },
  eTicketQR:     String,
  date:          { type: Date, default: Date.now },
});

const Screen           = mongoose.model('Screen',            screenSchema);
const User             = mongoose.model('User',              userSchema);
const Movie            = mongoose.model('Movie',             movieSchema);
const PastMovie        = mongoose.model('PastMovie',         pastMovieSchema);
const Snack            = mongoose.model('Snack',             snackSchema);
const Ticket           = mongoose.model('Ticket',            ticketSchema);
const RefreshmentOrder = mongoose.model('RefreshmentOrder',  refreshmentOrderSchema);
const AdminBooking     = mongoose.model('AdminBooking',      adminBookingSchema);

// ── HELPERS ───────────────────────────────────────────────────────────────────
function simPayId() {
  return `SIM_PAY_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}

// Given seatCategories array + rows, return category for a 0-based seat index
function getSeatCategory(seatIndex, seatsPerRow, seatCategories) {
  if (!seatCategories || !seatCategories.length) return null;
  const rowNum = Math.floor(seatIndex / seatsPerRow) + 1; // 1-based
  return seatCategories.find(c => rowNum >= c.fromRow && rowNum <= c.toRow) || null;
}

// Calculate total amount for selected seats using zone pricing
function calcSeatAmount(selectedSeats, seatsPerRow, seatCategories, fallbackPrice) {
  if (!seatCategories || !seatCategories.length) {
    return { total: selectedSeats.length * fallbackPrice, details: [] };
  }
  let total = 0;
  const details = selectedSeats.map(seat => {
    const cat = getSeatCategory(seat, seatsPerRow, seatCategories);
    const price = cat ? cat.price : fallbackPrice;
    total += price;
    return { seat, category: cat ? cat.name : 'Standard', price };
  });
  return { total, details };
}

// ── SEED ──────────────────────────────────────────────────────────────────────
async function seedDefaults() {
  try {
    let screens = await Screen.find({ isActive: true });
    if (!screens.length) {
      screens = await Screen.insertMany([
        { name:'Screen 1',  rows:8,  seatsPerRow:10, capacity:80,  screenType:'Standard', basePrice:150 },
        { name:'Screen 2',  rows:8,  seatsPerRow:10, capacity:80,  screenType:'Premium',  basePrice:180 },
        { name:'IMAX Hall', rows:10, seatsPerRow:12, capacity:120, screenType:'IMAX',     basePrice:220 },
      ]);
      console.log('🖥️  Screens seeded');
    }

    if (!await Movie.countDocuments()) {
      const [s1,s2,s3] = [screens[0], screens[1]||screens[0], screens[2]||screens[0]];
      const mk = (t,s) => ({ time:t, screenId:s._id.toString(), screenName:s.name, screenType:s.screenType, rows:s.rows, seatsPerRow:s.seatsPerRow, capacity:s.capacity });
      // Default seat categories for 8-row screen
      const defaultCats8 = [
        { name:'Balcony', fromRow:1, toRow:2, price:200, color:'#8B5CF6' },
        { name:'Upper',   fromRow:3, toRow:4, price:170, color:'#007AFF' },
        { name:'Middle',  fromRow:5, toRow:6, price:150, color:'#34C759' },
        { name:'Lower',   fromRow:7, toRow:8, price:120, color:'#FF9500' },
      ];
      const defaultCats10 = [
        { name:'Balcony', fromRow:1,  toRow:2,  price:250, color:'#8B5CF6' },
        { name:'Upper',   fromRow:3,  toRow:5,  price:220, color:'#007AFF' },
        { name:'Middle',  fromRow:6,  toRow:8,  price:180, color:'#34C759' },
        { name:'Lower',   fromRow:9,  toRow:10, price:150, color:'#FF9500' },
      ];
      await Movie.insertMany([
        { title:'Leo', genre:'Action/Thriller', language:'Tamil', duration:'2h 44m', rating:8.2,
          shows:[mk('10:00 AM',s1),mk('2:30 PM',s2),mk('6:00 PM',s1),mk('10:30 PM',s3)],
          timings:['10:00 AM','2:30 PM','6:00 PM','10:30 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          seatCategories: defaultCats8,
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Leo_2023_film_poster.jpg/220px-Leo_2023_film_poster.jpg',
          description:'A mild-mannered man who runs a food business has his past catch up with him.' },
        { title:'Vikram', genre:'Action', language:'Tamil', duration:'2h 55m', rating:8.4,
          shows:[mk('10:15 AM',s2),mk('2:15 PM',s1),mk('6:15 PM',s3),mk('10:15 PM',s2)],
          timings:['10:15 AM','2:15 PM','6:15 PM','10:15 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          seatCategories: defaultCats8,
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Vikram_2022_film_poster.jpg/220px-Vikram_2022_film_poster.jpg',
          description:'A special agent investigates a series of murders by masked men.' },
        { title:'Oppenheimer', genre:'Biography/Drama', language:'English', duration:'3h 0m', rating:8.9,
          shows:[mk('11:00 AM',s3),mk('3:00 PM',s1),mk('7:00 PM',s2)],
          timings:['11:00 AM','3:00 PM','7:00 PM'],
          pricing:{morning:130,afternoon:160,evening:190,night:210},
          seatCategories: defaultCats10,
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/220px-Oppenheimer_%28film%29.jpg',
          description:'The story of J. Robert Oppenheimer and the Manhattan Project.' },
        { title:'Jawan', genre:'Action/Drama', language:'Hindi', duration:'2h 49m', rating:7.5,
          shows:[mk('9:30 AM',s1),mk('1:00 PM',s3),mk('5:30 PM',s2),mk('9:30 PM',s1)],
          timings:['9:30 AM','1:00 PM','5:30 PM','9:30 PM'],
          pricing:{morning:120,afternoon:150,evening:180,night:200},
          seatCategories: defaultCats8,
          img:'https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Jawan_film_poster.jpg/220px-Jawan_film_poster.jpg',
          description:'A prison warden recruits women to fight injustice.' },
        { title:'KGF Chapter 3', genre:'Action', language:'Kannada', duration:'2h 40m', rating:0, isUpcoming:true,
          shows:[], timings:[],
          pricing:{morning:150,afternoon:180,evening:210,night:250},
          seatCategories: defaultCats8,
          img:'', description:'The saga of Rocky continues in an epic final chapter.' },
      ]);
      console.log('🎬 Movies seeded');
    }

    if (!await Snack.countDocuments()) {
      await Snack.insertMany([
        { name:'Popcorn (Large)',       emoji:'🍿', price:180, coinPrice:90,  category:'Snacks' },
        { name:'Popcorn (Medium)',      emoji:'🍿', price:120, coinPrice:60,  category:'Snacks' },
        { name:'Nachos + Cheese',       emoji:'🌮', price:150, coinPrice:75,  category:'Snacks' },
        { name:'Hot Dog',               emoji:'🌭', price:130, coinPrice:65,  category:'Snacks' },
        { name:'Veg Burger',            emoji:'🍔', price:110, coinPrice:55,  category:'Snacks' },
        { name:'Chocolate Bar',         emoji:'🍫', price:70,  coinPrice:35,  category:'Snacks' },
        { name:'Pepsi (Large)',         emoji:'🥤', price:90,  coinPrice:45,  category:'Drinks' },
        { name:'Pepsi (Medium)',        emoji:'🥤', price:60,  coinPrice:30,  category:'Drinks' },
        { name:'Water Bottle',          emoji:'💧', price:40,  coinPrice:20,  category:'Drinks' },
        { name:'Fresh Lime Soda',       emoji:'🍋', price:80,  coinPrice:40,  category:'Drinks' },
        { name:'Combo (Popcorn+Pepsi)', emoji:'🎉', price:230, coinPrice:115, category:'Combos' },
        { name:'Family Pack',           emoji:'🎊', price:450, coinPrice:225, category:'Combos' },
      ]);
      console.log('🍿 Snacks seeded');
    }
  } catch(e) { console.error('Seed error:', e.message); }
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/',    (req,res) => res.json({ status:'Cine Time API ✅', version:'10.0', payment:'simulated' }));
app.get('/api', (req,res) => res.json({ status:'Cine Time API ✅', version:'10.0', payment:'simulated' }));

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req,res) => {
  try {
    const { username, password, email, phone } = req.body;
    if (!username || !password) return res.status(400).json({ error:'Username and password required' });
    if (await User.findOne({ username })) return res.status(400).json({ error:'Username already exists' });
    const user = new User({ username, password, email, phone, uuid: uuidv4() });
    await user.save();
    res.status(201).json({ message:'Success', uuid: user.uuid });
  } catch { res.status(400).json({ error:'Username already exists' }); }
});

app.post('/api/login', async (req,res) => {
  try {
    const { username, password } = req.body;
    if (username==='admin' && password==='7777') return res.json({ user:'admin', role:'admin', uuid:'admin', cineCoins:0, wallet:0 });
    const user = await User.findOne({ username, password });
    if (user) return res.json({ user:user.username, role:'user', uuid:user.uuid, email:user.email||'', cineCoins:user.cineCoins||0, wallet:user.wallet||0 });
    res.status(401).json({ error:'Invalid credentials' });
  } catch { res.status(500).json({ error:'Server error' }); }
});

app.get('/api/user/coins/:uuid', async (req,res) => {
  try {
    const u = await User.findOne({ uuid: req.params.uuid });
    res.json({ cineCoins: u?.cineCoins||0, wallet: u?.wallet||0 });
  } catch { res.json({ cineCoins:0, wallet:0 }); }
});

// ── SCREENS ───────────────────────────────────────────────────────────────────
app.get('/api/screens', async (req,res) => {
  try { res.json(await Screen.find({ isActive:true }).sort({ name:1 })); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/screens', async (req,res) => {
  try {
    const { name, rows, seatsPerRow, screenType, basePrice } = req.body;
    if (!name?.trim()) return res.status(400).json({ error:'Screen name required' });
    const r   = parseInt(rows)        || 8;
    const spr = parseInt(seatsPerRow) || 10;
    const screen = await Screen.findOneAndUpdate(
      { name: name.trim() },
      { name:name.trim(), rows:r, seatsPerRow:spr, capacity:r*spr, screenType:screenType||'Standard', basePrice:parseFloat(basePrice)||150, isActive:true },
      { new:true, upsert:true }
    );
    res.status(201).json(screen);
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/screens/:id', async (req,res) => {
  try {
    const r   = parseInt(req.body.rows)        || 8;
    const spr = parseInt(req.body.seatsPerRow) || 10;
    const sc  = await Screen.findByIdAndUpdate(req.params.id,
      { name:req.body.name?.trim(), rows:r, seatsPerRow:spr, capacity:r*spr, screenType:req.body.screenType||'Standard', basePrice:parseFloat(req.body.basePrice)||150 },
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

// ── SIMULATED PAYMENT ─────────────────────────────────────────────────────────
app.post('/api/payment/simulate', async (req,res) => {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error:'Invalid amount' });
    const payId = simPayId();
    res.json({ success:true, simPaymentId: payId, amount: parseFloat(amount), message:'Simulated payment authorised' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MOVIES ────────────────────────────────────────────────────────────────────
app.get('/api/movies', async (req,res) => {
  try { res.json(await Movie.find({ isActive:true }).sort({ isUpcoming:1, createdAt:1 })); }
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

const parseSeatCategories = (cats) => {
  if (!Array.isArray(cats) || !cats.length) return [];
  return cats.map(c => ({
    name:     c.name    || 'Standard',
    fromRow:  parseInt(c.fromRow) || 1,
    toRow:    parseInt(c.toRow)   || 8,
    price:    parseFloat(c.price) || 150,
    color:    c.color   || '#007AFF',
  })).filter(c => c.fromRow > 0 && c.toRow >= c.fromRow && c.price > 0);
};

app.post('/api/admin/movies', async (req,res) => {
  try {
    const { title, genre, language, duration, rating, shows, timings, pricing, seatCategories, img, description, isUpcoming } = req.body;
    if (!title?.trim()) return res.status(400).json({ error:'Title required' });
    const showsArr = buildShows(shows, timings);
    const movie = await Movie.findOneAndUpdate({ title:title.trim() },
      { title:title.trim(), genre, language, duration, rating:parseFloat(rating)||8.0,
        shows:showsArr, timings:showsArr.map(s=>s.time),
        pricing: pricing || { morning:120, afternoon:150, evening:180, night:200 },
        seatCategories: parseSeatCategories(seatCategories),
        img:img||'', description:description||'', isActive:true, isUpcoming: isUpcoming||false },
      { new:true, upsert:true }
    );
    res.status(201).json(movie);
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.put('/api/admin/movies/:id', async (req,res) => {
  try {
    const { title, genre, language, duration, rating, shows, timings, pricing, seatCategories, img, description, isUpcoming } = req.body;
    const showsArr = buildShows(shows, timings);
    const upd = { genre, language, duration, rating:parseFloat(rating)||8.0,
      shows:showsArr, timings:showsArr.map(s=>s.time),
      pricing: pricing || { morning:120, afternoon:150, evening:180, night:200 },
      seatCategories: parseSeatCategories(seatCategories),
      img:img||'', description:description||'', isActive:true, isUpcoming: isUpcoming||false };
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

app.put('/api/admin/movies/:id/toggle-upcoming', async (req,res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error:'Movie not found' });
    movie.isUpcoming = !movie.isUpcoming;
    await movie.save();
    res.json({ isUpcoming: movie.isUpcoming });
  } catch(e) { res.status(400).json({ error:e.message }); }
});

app.delete('/api/admin/movies/:id', async (req,res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error:'Movie not found' });
    const [ticketAgg] = await Ticket.aggregate([
      { $match:{ movieName: movie.title, status:'confirmed' } },
      { $group:{ _id:null, totalRevenue:{ $sum:'$amount' }, totalTickets:{ $sum:{ $size:'$selectedSeats' } } } }
    ]);
    const [adminAgg] = await AdminBooking.aggregate([
      { $match:{ movieName: movie.title } },
      { $group:{ _id:null, totalRevenue:{ $sum:'$amount' }, totalTickets:{ $sum:{ $size:'$selectedSeats' } } } }
    ]);
    const totalRevenue = (ticketAgg?.totalRevenue||0) + (adminAgg?.totalRevenue||0);
    const totalTickets = (ticketAgg?.totalTickets||0) + (adminAgg?.totalTickets||0);
    await PastMovie.create({
      title:movie.title, genre:movie.genre, language:movie.language, duration:movie.duration,
      rating:movie.rating, pricing:movie.pricing, seatCategories:movie.seatCategories,
      img:movie.img, description:movie.description,
      totalTickets, totalRevenue, originalId:movie._id.toString(),
    });
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message:'Archived to vault', totalRevenue, totalTickets });
  } catch(e) { res.status(400).json({ error:e.message }); }
});

// ── MOVIE VAULT ───────────────────────────────────────────────────────────────
app.get('/api/admin/vault', async (req,res) => {
  try {
    const { search } = req.query;
    const query = search ? { title: { $regex: search, $options:'i' } } : {};
    res.json(await PastMovie.find(query).sort({ archivedAt:-1 }));
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/admin/vault/:id/restore', async (req,res) => {
  try {
    const past = await PastMovie.findById(req.params.id);
    if (!past) return res.status(404).json({ error:'Not found in vault' });
    const movie = await Movie.create({
      title:past.title, genre:past.genre, language:past.language, duration:past.duration,
      rating:past.rating, pricing:past.pricing, seatCategories:past.seatCategories||[],
      img:past.img, description:past.description, isActive:true,
    });
    await PastMovie.findByIdAndDelete(req.params.id);
    res.json({ message:'Restored', movie });
  } catch(e) { res.status(400).json({ error:e.message }); }
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

// ── BOOKED SEATS ──────────────────────────────────────────────────────────────
app.get('/api/booked-seats/:movieName/:timing', async (req,res) => {
  try {
    const { movieName, timing } = req.params;
    const screenName = req.query.screen || '';
    const q = { movieName, timing, status:'confirmed' };
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
    const { userUUID, username, movieName, timing, screenName, rows, seatsPerRow,
            selectedSeats, amount, coinsUsed, paymentMethod, simPaymentId, isUpcoming, seatCategories } = req.body;
    if (!userUUID || !username || !movieName || !timing || !selectedSeats?.length)
      return res.status(400).json({ error:'Missing required fields' });

    const spr = parseInt(seatsPerRow) || 10;
    const cats = parseSeatCategories(seatCategories||[]);

    // Verify seats still available
    const q = { movieName, timing, status:'confirmed' };
    if (screenName) q.screenName = screenName;
    const [exT, exA] = await Promise.all([Ticket.find(q,'selectedSeats'), AdminBooking.find(q,'selectedSeats')]);
    const allBooked = [...exT.flatMap(t=>t.selectedSeats), ...exA.flatMap(t=>t.selectedSeats)];
    const conflicts = selectedSeats.filter(s => allBooked.includes(s));
    if (conflicts.length) return res.status(409).json({ error:`Seats ${conflicts.map(s=>s+1).join(', ')} already booked` });

    let actualCoinsUsed = 0, coinsEarned = 0;
    let finalAmount = amount || 0;

    if (paymentMethod === 'coins') {
      const needed = 500 * selectedSeats.length;
      const user = await User.findOne({ uuid: userUUID });
      if (!user || user.cineCoins < needed)
        return res.status(400).json({ error:`Need ${needed} coins. You have ${user?.cineCoins||0}.` });
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins:-needed } });
      actualCoinsUsed = needed;
      finalAmount = 0;
    } else {
      // Recalculate server-side for integrity
      if (cats.length) {
        const { total, details } = calcSeatAmount(selectedSeats.map(s=>parseInt(s)), spr, cats, 150);
        finalAmount = total;
      }
      coinsEarned = selectedSeats.length * 10;
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins:coinsEarned } });
    }

    const { details: seatDetails } = cats.length
      ? calcSeatAmount(selectedSeats.map(s=>parseInt(s)), spr, cats, 150)
      : { details: [] };

    let eTicketQR = null;
    try {
      eTicketQR = await qrcode.toDataURL(JSON.stringify({
        app:'CINETIME', uuid:userUUID, user:username, movie:movieName, timing,
        screen:screenName||'', seats:selectedSeats.map(s=>s+1),
        upcoming:isUpcoming||false, txId:simPaymentId||Date.now()
      }), { width:300, margin:2 });
    } catch(e) { console.error('QR error:', e.message); }

    const ticket = new Ticket({
      userUUID, username, movieName, timing, screenName:screenName||'',
      rows:parseInt(rows)||8, seatsPerRow:spr,
      selectedSeats: selectedSeats.map(s => parseInt(s)),
      seatDetails,
      amount: finalAmount,
      coinsUsed:actualCoinsUsed, coinsEarned,
      paymentMethod:paymentMethod||'simulated',
      simPaymentId:simPaymentId||null,
      isUpcoming:isUpcoming||false,
      status:'confirmed', eTicketQR,
    });
    await ticket.save();
    const user = await User.findOne({ uuid: userUUID });
    res.status(201).json({ message:'Booked', coinsEarned, eTicketQR, ticketId:ticket._id, newCoinBalance:user?.cineCoins||0, wallet:user?.wallet||0, finalAmount });
  } catch(e) { console.error('Book ticket:', e); res.status(500).json({ error:'Booking failed: '+e.message }); }
});

// ── CANCEL TICKET ─────────────────────────────────────────────────────────────
app.post('/api/cancel-ticket/:ticketId', async (req,res) => {
  try {
    const { userUUID } = req.body;
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error:'Ticket not found' });
    if (ticket.userUUID !== userUUID) return res.status(403).json({ error:'Not authorized' });
    if (ticket.status === 'cancelled') return res.status(400).json({ error:'Already cancelled' });

    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date();

    let refundAmount = 0;
    if (ticket.paymentMethod === 'coins') {
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins: ticket.coinsUsed } });
    } else if (ticket.amount > 0) {
      refundAmount = ticket.amount;
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ wallet: refundAmount } });
    }
    if (ticket.coinsEarned > 0) {
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins: -ticket.coinsEarned } });
    }
    ticket.refundAmount = refundAmount;
    await ticket.save();

    const user = await User.findOne({ uuid: userUUID });
    res.json({ message:'Cancelled', refundAmount, refundCoins:ticket.paymentMethod==='coins'?ticket.coinsUsed:0, newCoinBalance:user?.cineCoins||0, wallet:user?.wallet||0 });
  } catch(e) { res.status(500).json({ error:'Cancellation failed: '+e.message }); }
});

// ── HISTORY ───────────────────────────────────────────────────────────────────
app.get('/api/history/:uuid', async (req,res) => {
  try {
    const uuid = req.params.uuid;
    const [tickets, adminBookings, refreshments] = await Promise.all([
      Ticket.find({ userUUID:uuid }).sort({ date:-1 }),
      AdminBooking.find({ userUUID:uuid }).sort({ date:-1 }),
      RefreshmentOrder.find({ userUUID:uuid }).sort({ date:-1 }),
    ]);
    res.json({ tickets, adminBookings, refreshments });
  } catch { res.json({ tickets:[], adminBookings:[], refreshments:[] }); }
});

// ── REFRESHMENTS ──────────────────────────────────────────────────────────────
app.post('/api/refreshments/order', async (req,res) => {
  try {
    const { userUUID, username, total, paymentMethod, coinsUsed, simPaymentId } = req.body;
    if (!userUUID) return res.status(400).json({ error:'userUUID required' });
    let actualCoinsUsed = 0, coinsEarned = 0;
    if (paymentMethod === 'coins') {
      const needed = coinsUsed || Math.ceil(total/2);
      const user = await User.findOne({ uuid: userUUID });
      if (!user || user.cineCoins < needed)
        return res.status(400).json({ error:`Need ${needed} coins. You have ${user?.cineCoins||0}.` });
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins:-needed } });
      actualCoinsUsed = needed;
    } else {
      coinsEarned = 5;
      await User.findOneAndUpdate({ uuid: userUUID }, { $inc:{ cineCoins:5 } });
    }
    const order = new RefreshmentOrder({
      ...req.body, userUUID, coinsUsed:actualCoinsUsed, coinsEarned,
      simPaymentId:simPaymentId||null, status:'confirmed'
    });
    await order.save();
    const user = await User.findOne({ uuid: userUUID });
    res.status(201).json({ message:'Order placed', coinsEarned, orderId:order._id, newCoinBalance:user?.cineCoins||0, wallet:user?.wallet||0 });
  } catch(e) { res.status(400).json({ error:'Order failed: '+e.message }); }
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/all-bookings', async (req,res) => {
  try {
    const [tickets, adminBookings, refreshments] = await Promise.all([
      Ticket.find({}).sort({ date:-1 }).limit(500),
      AdminBooking.find({}).sort({ date:-1 }).limit(200),
      RefreshmentOrder.find({}).sort({ date:-1 }).limit(500),
    ]);
    res.json({ tickets, adminBookings, refreshments });
  } catch { res.json({ tickets:[], adminBookings:[], refreshments:[] }); }
});

app.get('/api/admin/users', async (req,res) => {
  try { res.json(await User.find({}, 'uuid username email phone cineCoins wallet role').sort({ _id:-1 })); }
  catch { res.json([]); }
});

app.get('/api/admin/detailed-seats/:movieName/:timing', async (req,res) => {
  try {
    const { movieName, timing } = req.params;
    const screenName = req.query.screen || '';
    const q = { movieName, timing, status:'confirmed' };
    if (screenName) q.screenName = screenName;
    const [tickets, adminBks] = await Promise.all([Ticket.find(q), AdminBooking.find(q)]);
    const seatMap = {};
    tickets.forEach(t  => t.selectedSeats.forEach(s => {
      const det = t.seatDetails?.find(d=>d.seat===s);
      seatMap[s] = { user:t.username, type:'user', method:t.paymentMethod, category:det?.category||'', price:det?.price||t.amount/Math.max(t.selectedSeats.length,1) };
    }));
    adminBks.forEach(t => t.selectedSeats.forEach(s => {
      const det = t.seatDetails?.find(d=>d.seat===s);
      seatMap[s] = { user:t.username+' (Admin)', type:'admin', category:det?.category||'' };
    }));
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
    const { username, userUUID, movieName, timing, screenName, rows, seatsPerRow, selectedSeats, amount, notes, isUpcoming, seatCategories } = req.body;
    if (!username || !movieName || !timing || !selectedSeats?.length)
      return res.status(400).json({ error:'Missing fields' });
    const seats = selectedSeats.map(s => parseInt(s)-1).filter(n => !isNaN(n) && n >= 0);
    if (!seats.length) return res.status(400).json({ error:'No valid seats' });
    const spr = parseInt(seatsPerRow) || 10;
    const cats = parseSeatCategories(seatCategories||[]);
    const q = { movieName, timing, status:'confirmed' };
    if (screenName) q.screenName = screenName;
    const [ex, ax] = await Promise.all([Ticket.find(q,'selectedSeats'), AdminBooking.find(q,'selectedSeats')]);
    const allBooked = [...ex.flatMap(t=>t.selectedSeats), ...ax.flatMap(t=>t.selectedSeats)];
    const conflicts = seats.filter(s => allBooked.includes(s));
    if (conflicts.length) return res.status(400).json({ error:`Seats ${conflicts.map(s=>s+1).join(', ')} already booked` });

    const { details: seatDetails, total: calcAmount } = cats.length
      ? calcSeatAmount(seats, spr, cats, amount||0)
      : { details: [], total: amount||0 };

    let eTicketQR = null;
    try {
      eTicketQR = await qrcode.toDataURL(JSON.stringify({
        app:'CINETIME-ADMIN', user:username, movie:movieName, timing,
        screen:screenName||'', seats:seats.map(s=>s+1), txId:Date.now()
      }), { width:300, margin:2 });
    } catch(e) { console.error('QR:', e.message); }

    const booking = new AdminBooking({
      userUUID:userUUID||'admin', username, movieName, timing, screenName:screenName||'',
      rows:parseInt(rows)||8, seatsPerRow:spr,
      selectedSeats:seats, seatDetails,
      amount:cats.length?calcAmount:(amount||0),
      notes:notes||'', isUpcoming:isUpcoming||false, status:'confirmed', eTicketQR
    });
    await booking.save();
    res.status(201).json({ message:'Booking created', bookingId:booking._id, eTicketQR });
  } catch(e) { res.status(500).json({ error:'Direct booking failed: '+e.message }); }
});

app.get('/api/admin/analytics', async (req,res) => {
  try {
    const [tRev,sRev,tb,ab,tu] = await Promise.all([
      Ticket.aggregate([{ $match:{ status:'confirmed' } },{ $group:{ _id:null, total:{ $sum:'$amount' } } }]),
      RefreshmentOrder.aggregate([{ $group:{ _id:null, total:{ $sum:'$total' } } }]),
      Ticket.countDocuments({ status:'confirmed' }),
      AdminBooking.countDocuments(),
      User.countDocuments({ role:{ $ne:'admin' } }),
    ]);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);
    const fmt = '%m/%d';
    const [tD,sD] = await Promise.all([
      Ticket.aggregate([{ $match:{ date:{ $gte:sevenDaysAgo }, status:'confirmed' } },{ $group:{ _id:{ $dateToString:{ format:fmt, date:'$date' } }, revenue:{ $sum:'$amount' }, bookings:{ $sum:1 } } }]),
      RefreshmentOrder.aggregate([{ $match:{ date:{ $gte:sevenDaysAgo } } },{ $group:{ _id:{ $dateToString:{ format:fmt, date:'$date' } }, revenue:{ $sum:'$total' } } }]),
    ]);
    const dailyRevenue = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getMonth()+1}/${d.getDate()}`;
      dailyRevenue.push({
        date:     label,
        revenue:  (tD.find(r=>r._id===label)?.revenue||0) + (sD.find(r=>r._id===label)?.revenue||0),
        bookings: tD.find(r=>r._id===label)?.bookings||0,
      });
    }
    const movieStats = await Ticket.aggregate([
      { $match:{ status:'confirmed' } },
      { $group:{ _id:'$movieName', count:{ $sum:1 }, revenue:{ $sum:'$amount' } } },
      { $sort:{ count:-1 } }, { $limit:5 }
    ]);
    res.json({
      totalRevenue:       (tRev[0]?.total||0) + (sRev[0]?.total||0),
      ticketRevenue:      tRev[0]?.total||0,
      refreshmentRevenue: sRev[0]?.total||0,
      totalBookings:      tb,
      totalAdminBookings: ab,
      totalUsers:         tu,
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
    if      (lower.includes('upcoming'))                             reply = `🎬 Coming soon: ${movies.filter(m=>m.isUpcoming).map(m=>m.title).join(', ')||'Nothing announced yet!'}`;
    else if (lower.includes('movie') || lower.includes('showing'))  reply = `Now showing: ${movies.filter(m=>!m.isUpcoming).map(m=>m.title).join(', ')} 🎬`;
    else if (lower.includes('price') || lower.includes('ticket'))   reply = '🎟 Zone pricing: Balcony/Upper/Middle/Lower sections — prices vary per movie. Check the seat map!';
    else if (lower.includes('coin'))                                 reply = '🪙 Earn 10 coins/ticket, 5/snack. 500 coins = free ticket!';
    else if (lower.includes('cancel'))                               reply = '❌ Cancel tickets from "My Bookings". Refunds go to CineWallet instantly.';
    else if (lower.includes('wallet') || lower.includes('refund'))  reply = '💰 Refunds land in CineWallet instantly. Reuse for future bookings!';
    else if (lower.includes('snack') || lower.includes('food'))     reply = '🍿 Popcorn, Nachos, Combos and more at the Snack Bar!';
    else reply = "Hi! I'm CineBot 🎬 Ask about movies, seat zones, prices, CineCoins or cancellations!";
    res.json({ reply });
  } catch { res.json({ reply:"Having trouble 🤖" }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Cine Time v10.0 on port ${PORT}`);
  console.log(`💳 Payment: Simulated Mode`);
  console.log(`🪑 Seat Zones: Balcony / Upper / Middle / Lower per movie`);
  console.log(`🍃 MongoDB:  ${mongoURI.includes('localhost') ? 'Local' : 'Atlas'}`);
});