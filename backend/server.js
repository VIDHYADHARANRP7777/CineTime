const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const qrcode = require('qrcode');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id:     process.env.rzp_test_SmNcizKVCBNmvb     || 'rzp_test_SmNcizKVCBNmvb',
  key_secret: process.env.ruaFEBMo5uGmHcrO0ARGWhBp || 'ruaFEBMo5uGmHcrO0ARGWhBp',
});

const app = express();

app.use(cors({
    origin: function(origin, callback) {
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(express.json());

const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 15000 })
    .then(() => { console.log("✅ Cine Time Database Connected"); seedDefaults(); })
    .catch(err => console.error("❌ Connection Error:", err.message));

// SCHEMAS
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: String,
    phone: String,
    role: { type: String, default: 'user' },
    cineCoins: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const movieSchema = new mongoose.Schema({
    title: { type: String, required: true },
    genre: String,
    language: { type: String, default: 'Tamil' },
    duration: String,
    rating: { type: Number, default: 8.0 },
    timings: [String],
    pricing: {
        morning: { type: Number, default: 120 },
        afternoon: { type: Number, default: 150 },
        evening: { type: Number, default: 180 },
        night: { type: Number, default: 200 }
    },
    img: String,
    description: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const snackSchema = new mongoose.Schema({
    name: { type: String, required: true },
    emoji: { type: String, default: '🍿' },
    price: { type: Number, required: true },
    coinPrice: { type: Number, default: 0 },
    category: { type: String, default: 'Snacks' },
    img: String,
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// FIXED: Parking schema with block field
const parkingSchema = new mongoose.Schema({
    slotNumber: { type: String, required: true, unique: true },
    block: { type: String, default: 'A' },
    slotType: { type: String, enum: ['Two-Wheeler', 'Four-Wheeler', 'Disabled'], default: 'Two-Wheeler' },
    price: { type: Number, default: 30 },
    coinPrice: { type: Number, default: 15 },
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: String, default: null },
    bookingDate: Date,
    showTiming: String,
    movieName: String
});

const ticketSchema = new mongoose.Schema({
    username: String,
    phone: String,
    movieName: String,
    timing: String,
    selectedSeats: [Number],
    amount: { type: Number, default: 0 },
    coinsUsed: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'razorpay' },
    paymentId: String,
    status: { type: String, default: 'confirmed' },
    eTicketQR: String,
    parkingSlot: String,
    date: { type: Date, default: Date.now }
});

const refreshmentOrderSchema = new mongoose.Schema({
    username: String,
    movieName: String,
    timing: String,
    items: [{ name: String, qty: Number, price: Number, coinPrice: Number }],
    total: { type: Number, default: 0 },
    coinsUsed: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'razorpay' },
    paymentId: String,
    status: { type: String, default: 'confirmed' },
    date: { type: Date, default: Date.now }
});

const adminBookingSchema = new mongoose.Schema({
    username: String,
    movieName: String,
    timing: String,
    selectedSeats: [Number],
    amount: { type: Number, default: 0 },
    notes: String,
    bookedBy: { type: String, default: 'admin' },
    status: { type: String, default: 'confirmed' },
    eTicketQR: String,
    date: { type: Date, default: Date.now }
});

// NEW: Parking booking history schema
const parkingBookingSchema = new mongoose.Schema({
    username: String,
    slotNumber: String,
    block: String,
    slotType: String,
    price: { type: Number, default: 0 },
    coinPrice: { type: Number, default: 0 },
    coinsUsed: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    movieName: String,
    showTiming: String,
    status: { type: String, default: 'confirmed' },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Movie = mongoose.model('Movie', movieSchema);
const Snack = mongoose.model('Snack', snackSchema);
const ParkingSlot = mongoose.model('ParkingSlot', parkingSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const RefreshmentOrder = mongoose.model('RefreshmentOrder', refreshmentOrderSchema);
const AdminBooking = mongoose.model('AdminBooking', adminBookingSchema);
const ParkingBooking = mongoose.model('ParkingBooking', parkingBookingSchema);

// SEED DEFAULTS
async function seedDefaults() {
    try {
        const movieCount = await Movie.countDocuments();
        if (movieCount === 0) {
            await Movie.insertMany([
                { title: 'Leo', genre: 'Action/Thriller', language: 'Tamil', duration: '2h 44m', rating: 8.2, timings: ['10:00 AM', '2:30 PM', '6:00 PM', '10:30 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Leo_2023_film_poster.jpg/220px-Leo_2023_film_poster.jpg', description: 'A seemingly mild-mannered man runs a food business, but his past comes back to haunt him.' },
                { title: 'Sarvam Maya', genre: 'Drama/Music', language: 'Tamil', duration: '2h 20m', rating: 7.8, timings: ['11:00 AM', '4:30 PM', '9:30 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Sarvam_Thaala_Mayam_poster.jpg/220px-Sarvam_Thaala_Mayam_poster.jpg', description: "A musician's journey through Mridangam." },
                { title: 'Vikram', genre: 'Action', language: 'Tamil', duration: '2h 55m', rating: 8.4, timings: ['10:15 AM', '2:15 PM', '6:15 PM', '10:15 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Vikram_2022_film_poster.jpg/220px-Vikram_2022_film_poster.jpg', description: 'A special agent investigates murders.' },
                { title: 'The Batman', genre: 'Action/Superhero', language: 'English', duration: '2h 56m', rating: 8.0, timings: ['12:00 PM', '7:00 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/The_Batman_poster.jpg/220px-The_Batman_poster.jpg', description: "Batman ventures into Gotham's underworld." },
                { title: 'Jawan', genre: 'Action/Drama', language: 'Hindi', duration: '2h 49m', rating: 7.5, timings: ['9:30 AM', '1:00 PM', '5:30 PM', '9:30 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Jawan_film_poster.jpg/220px-Jawan_film_poster.jpg', description: 'A prison warden recruits women to fight injustice.' },
                { title: 'Oppenheimer', genre: 'Biography/Drama', language: 'English', duration: '3h 0m', rating: 8.9, timings: ['11:00 AM', '3:00 PM', '7:00 PM'], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/220px-Oppenheimer_%28film%29.jpg', description: 'The story of J. Robert Oppenheimer and the Manhattan Project.' }
            ]);
            console.log('🎬 Default movies seeded');
        }

        const snackCount = await Snack.countDocuments();
        if (snackCount === 0) {
            await Snack.insertMany([
                { name: 'Popcorn (Large)', emoji: '🍿', price: 180, coinPrice: 90, category: 'Snacks' },
                { name: 'Popcorn (Medium)', emoji: '🍿', price: 120, coinPrice: 60, category: 'Snacks' },
                { name: 'Nachos + Cheese', emoji: '🌮', price: 150, coinPrice: 75, category: 'Snacks' },
                { name: 'Hot Dog', emoji: '🌭', price: 130, coinPrice: 65, category: 'Snacks' },
                { name: 'Chocolate Bar', emoji: '🍫', price: 70, coinPrice: 35, category: 'Snacks' },
                { name: 'Pepsi (Large)', emoji: '🥤', price: 90, coinPrice: 45, category: 'Drinks' },
                { name: 'Pepsi (Medium)', emoji: '🥤', price: 60, coinPrice: 30, category: 'Drinks' },
                { name: 'Water Bottle', emoji: '💧', price: 40, coinPrice: 20, category: 'Drinks' },
                { name: 'Fresh Lime Soda', emoji: '🍋', price: 80, coinPrice: 40, category: 'Drinks' },
                { name: 'Combo (Popcorn+Pepsi)', emoji: '🎉', price: 230, coinPrice: 115, category: 'Combos' },
                { name: 'Family Pack', emoji: '🎊', price: 450, coinPrice: 225, category: 'Combos' },
                { name: 'Veg Burger', emoji: '🍔', price: 110, coinPrice: 55, category: 'Snacks' }
            ]);
            console.log('🍿 Default snacks seeded');
        }

        // FIXED: Seed parking with block-based naming (A1-A15, B1-B12, C1-C8, D1-D5)
        const parkCount = await ParkingSlot.countDocuments();
        if (parkCount === 0) {
            const slots = [];
            for (let i = 1; i <= 15; i++) slots.push({ slotNumber: `A${i}`, block: 'A', slotType: 'Two-Wheeler', price: 30, coinPrice: 15 });
            for (let i = 1; i <= 12; i++) slots.push({ slotNumber: `B${i}`, block: 'B', slotType: 'Four-Wheeler', price: 60, coinPrice: 30 });
            for (let i = 1; i <= 8; i++) slots.push({ slotNumber: `C${i}`, block: 'C', slotType: 'Four-Wheeler', price: 80, coinPrice: 40 });
            for (let i = 1; i <= 5; i++) slots.push({ slotNumber: `D${i}`, block: 'D', slotType: 'Disabled', price: 0, coinPrice: 0 });
            await ParkingSlot.insertMany(slots);
            console.log('🅿️ Default parking slots seeded (A/B/C/D blocks)');
        } else {
            // Migrate existing slots if they don't have block field
            await ParkingSlot.updateMany({ block: { $exists: false } }, { $set: { block: 'A' } });
        }
    } catch (err) {
        console.error('Seed error:', err.message);
    }
}

// HEALTH CHECK
app.get('/', (req, res) => res.json({ status: 'Cine Time API Running ✅', version: '2.0' }));
app.get('/api', (req, res) => res.json({ status: 'Cine Time API Running ✅' }));

// AUTH ROUTES
app.post('/api/register', async (req, res) => {
    try {
        if (!req.body.username || !req.body.password) return res.status(400).json({ error: 'Username and password required' });
        if (await User.findOne({ username: req.body.username })) return res.status(400).json({ error: 'Username already exists' });
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ message: "Success" });
    } catch (err) {
        res.status(400).json({ error: "Username already exists" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username === "admin" && password === "7777") {
            return res.json({ user: "admin", role: "admin", cineCoins: 0 });
        }
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ user: user.username, role: "user", email: user.email || '', cineCoins: user.cineCoins || 0 });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── RAZORPAY: Create order (Step 1) ─────────────────────────────────────
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // convert to paise
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {},
        });
        res.json({
            orderId:   order.id,
            amount:    order.amount,
            amountINR: amount,
            currency:  order.currency,
            keyId:     process.env.RAZORPAY_KEY_ID || 'rzp_test_REPLACE_ME',
        });
    } catch (err) {
        console.error('Razorpay create-order error:', err);
        res.status(500).json({ error: 'Could not create Razorpay order: ' + (err.description || err.message) });
    }
});

// ── RAZORPAY: Verify signature (Step 2) ──────────────────────────────────
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment fields' });
        }
        const secret   = process.env.RAZORPAY_KEY_SECRET || 'REPLACE_ME_SECRET';
        const expected = crypto.createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Signature mismatch — payment not genuine' });
        }
        res.json({ success: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
    } catch (err) {
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    }
});

// MOVIES
app.get('/api/movies', async (req, res) => {
    try { res.json(await Movie.find({ isActive: true })); }
    catch { res.json([]); }
});

app.post('/api/admin/movies', async (req, res) => {
    try {
        const movie = new Movie(req.body);
        res.status(201).json(await movie.save());
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/admin/movies/:id', async (req, res) => {
    try {
        const updated = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            // Try by title if ID not found (for local IDs)
            const byTitle = await Movie.findOneAndUpdate({ title: req.body.title }, req.body, { new: true, upsert: true });
            return res.json(byTitle);
        }
        res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/movies/:id', async (req, res) => {
    try {
        const deleted = await Movie.findByIdAndDelete(req.params.id);
        if (!deleted) await Movie.findOneAndDelete({ _id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Delete failed' }); }
});

// SNACKS
app.get('/api/snacks', async (req, res) => {
    try { res.json(await Snack.find({ isAvailable: true })); }
    catch { res.json([]); }
});

app.post('/api/admin/snacks', async (req, res) => {
    try {
        const snack = new Snack(req.body);
        res.status(201).json(await snack.save());
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/admin/snacks/:id', async (req, res) => {
    try {
        const updated = await Snack.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            const byName = await Snack.findOneAndUpdate({ name: req.body.name }, req.body, { new: true, upsert: true });
            return res.json(byName);
        }
        res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/snacks/:id', async (req, res) => {
    try { await Snack.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
    catch { res.status(400).json({ error: 'Delete failed' }); }
});

// PARKING - FIXED: All routes working, proper block-based seeding
app.get('/api/parking', async (req, res) => {
    try {
        let slots = await ParkingSlot.find().sort({ slotNumber: 1 });
        // If no slots with proper block naming, recreate
        if (slots.length === 0 || !slots.some(s => s.slotNumber.startsWith('A'))) {
            await ParkingSlot.deleteMany({});
            const newSlots = [];
            for (let i = 1; i <= 15; i++) newSlots.push({ slotNumber: `A${i}`, block: 'A', slotType: 'Two-Wheeler', price: 30, coinPrice: 15 });
            for (let i = 1; i <= 12; i++) newSlots.push({ slotNumber: `B${i}`, block: 'B', slotType: 'Four-Wheeler', price: 60, coinPrice: 30 });
            for (let i = 1; i <= 8; i++) newSlots.push({ slotNumber: `C${i}`, block: 'C', slotType: 'Four-Wheeler', price: 80, coinPrice: 40 });
            for (let i = 1; i <= 5; i++) newSlots.push({ slotNumber: `D${i}`, block: 'D', slotType: 'Disabled', price: 0, coinPrice: 0 });
            await ParkingSlot.insertMany(newSlots);
            slots = await ParkingSlot.find().sort({ slotNumber: 1 });
        }
        res.json(slots);
    } catch (err) {
        console.error('Parking fetch error:', err);
        res.json([]);
    }
});

// FIXED: Parking book - properly handles coins AND upi, saves booking history
app.post('/api/parking/book', async (req, res) => {
    try {
        const { slotNumber, username, showTiming, movieName, paymentMethod, coinsUsed } = req.body;

        if (!slotNumber || !username) {
            return res.status(400).json({ error: 'slotNumber and username are required' });
        }

        const slot = await ParkingSlot.findOne({ slotNumber });
        if (!slot) {
            return res.status(404).json({ error: `Slot ${slotNumber} not found` });
        }
        if (slot.isBooked) {
            return res.status(400).json({ error: `Slot ${slotNumber} is already booked` });
        }

        let actualCoinsUsed = 0;
        let coinsEarned = 0;

        if (paymentMethod === 'coins') {
            const coinsNeeded = coinsUsed || slot.coinPrice;
            const user = await User.findOne({ username });
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.cineCoins < coinsNeeded) {
                return res.status(400).json({ error: `Need ${coinsNeeded} coins. You have ${user.cineCoins}.` });
            }
            await User.findOneAndUpdate({ username }, { $inc: { cineCoins: -coinsNeeded } });
            actualCoinsUsed = coinsNeeded;
        } else {
            // Razorpay: earn 5 coins
            coinsEarned = slot.slotType !== 'Disabled' ? 5 : 0;
            if (coinsEarned > 0) {
                await User.findOneAndUpdate({ username }, { $inc: { cineCoins: coinsEarned } });
            }
        }

        // Update slot
        slot.isBooked = true;
        slot.bookedBy = username;
        slot.bookingDate = new Date();
        slot.showTiming = showTiming || '';
        slot.movieName = movieName || 'General';
        await slot.save();

        // Save parking booking to history
        const bookingRecord = new ParkingBooking({
            username,
            slotNumber: slot.slotNumber,
            block: slot.block || slot.slotNumber.charAt(0),
            slotType: slot.slotType,
            price: paymentMethod === 'coins' ? 0 : slot.price,
            coinPrice: slot.coinPrice,
            coinsUsed: actualCoinsUsed,
            coinsEarned,
            paymentMethod: paymentMethod || 'razorpay',
            razorpayOrderId: req.body.razorpayOrderId || null,
            razorpayPaymentId: req.body.razorpayPaymentId || null,
            movieName: movieName || 'General',
            showTiming: showTiming || '',
            status: 'confirmed'
        });
        await bookingRecord.save();

        res.json({ message: 'Parking booked successfully', slot, coinsEarned, bookingId: bookingRecord._id });
    } catch (err) {
        console.error('Parking booking error:', err);
        res.status(500).json({ error: 'Parking booking failed: ' + err.message });
    }
});

app.post('/api/parking/release/:slotNumber', async (req, res) => {
    try {
        const slot = await ParkingSlot.findOne({ slotNumber: req.params.slotNumber });
        if (!slot) return res.status(404).json({ error: 'Slot not found' });
        slot.isBooked = false;
        slot.bookedBy = null;
        slot.bookingDate = null;
        slot.showTiming = null;
        slot.movieName = null;
        await slot.save();
        res.json({ message: 'Parking released' });
    } catch (err) {
        res.status(500).json({ error: 'Release failed' });
    }
});

app.delete('/api/admin/parking/reset', async (req, res) => {
    try {
        await ParkingSlot.updateMany({}, { isBooked: false, bookedBy: null, bookingDate: null, showTiming: null, movieName: null });
        res.json({ message: 'All parking slots released' });
    } catch (err) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// BOOKING ROUTES
app.get('/api/booked-seats/:movieName/:timing', async (req, res) => {
    try {
        const { movieName, timing } = req.params;
        const tickets = await Ticket.find({ movieName, timing });
        const adminBookings = await AdminBooking.find({ movieName, timing });
        let booked = [];
        tickets.forEach(t => booked = [...booked, ...t.selectedSeats]);
        adminBookings.forEach(t => booked = [...booked, ...t.selectedSeats]);
        res.json([...new Set(booked)]);
    } catch { res.json([]); }
});

app.post('/api/book', async (req, res) => {
    try {
        const { username, movieName, timing, selectedSeats, amount, coinsUsed, paymentMethod, paymentId, parkingSlot } = req.body;

        if (!username || !movieName || !timing || !selectedSeats || selectedSeats.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let actualCoinsUsed = 0;
        let coinsEarned = 0;

        if (paymentMethod === 'coins') {
            const coinsNeeded = 500 * selectedSeats.length;
            const user = await User.findOne({ username });
            if (!user || user.cineCoins < coinsNeeded) {
                return res.status(400).json({ error: `Need ${coinsNeeded} coins. You have ${user?.cineCoins || 0}.` });
            }
            await User.findOneAndUpdate({ username }, { $inc: { cineCoins: -coinsNeeded } });
            actualCoinsUsed = coinsNeeded;
        } else {
            // UPI: earn 10 coins per ticket
            coinsEarned = selectedSeats.length * 10;
        }

        let eTicketQR = null;
        try {
            const qrData = `CINETIME|${username}|${movieName}|${timing}|${selectedSeats.join(',')}|${Date.now()}`;
            eTicketQR = await qrcode.toDataURL(qrData);
        } catch (e) { console.error('QR gen error:', e.message); }

        const ticket = new Ticket({
            username, movieName, timing,
            selectedSeats: selectedSeats.map(s => parseInt(s)),
            amount: paymentMethod === 'coins' ? 0 : (amount || 0),
            coinsUsed: actualCoinsUsed,
            coinsEarned,
            paymentMethod: paymentMethod || 'razorpay',
            paymentId: paymentId || `${paymentMethod === 'coins' ? 'COINS' : 'UPI'}_${Date.now()}`,
            status: 'confirmed',
            eTicketQR,
            parkingSlot: parkingSlot || null
        });
        await ticket.save();

        // Credit earned coins
        if (coinsEarned > 0) {
            await User.findOneAndUpdate({ username }, { $inc: { cineCoins: coinsEarned } });
        }

        const updatedUser = await User.findOne({ username });
        res.status(201).json({
            message: "Booked",
            coinsEarned,
            eTicketQR,
            ticketId: ticket._id,
            newCoinBalance: updatedUser?.cineCoins || 0
        });
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ error: "Booking failed: " + err.message });
    }
});

// FIXED: History now returns ALL booking types
app.get('/api/history/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const [tickets, adminBookings, refreshments, parking] = await Promise.all([
            Ticket.find({ username }).sort({ date: -1 }),
            AdminBooking.find({ username }).sort({ date: -1 }),
            RefreshmentOrder.find({ username }).sort({ date: -1 }),
            ParkingBooking.find({ username }).sort({ date: -1 })
        ]);
        res.json({ tickets, adminBookings, refreshments, parking });
    } catch (err) {
        res.json({ tickets: [], adminBookings: [], refreshments: [], parking: [] });
    }
});

// REFRESHMENT ORDERS
app.post('/api/refreshments/order', async (req, res) => {
    try {
        const { username, items, total, paymentMethod, coinsUsed } = req.body;

        let actualCoinsUsed = 0;
        let coinsEarned = 0;

        if (paymentMethod === 'coins') {
            const coinsNeeded = coinsUsed || Math.ceil(total / 2);
            const user = await User.findOne({ username });
            if (!user || user.cineCoins < coinsNeeded) {
                return res.status(400).json({ error: `Need ${coinsNeeded} coins. You have ${user?.cineCoins || 0}.` });
            }
            await User.findOneAndUpdate({ username }, { $inc: { cineCoins: -coinsNeeded } });
            actualCoinsUsed = coinsNeeded;
        } else {
            coinsEarned = 5;
        }

        const order = new RefreshmentOrder({
            ...req.body,
            coinsUsed: actualCoinsUsed,
            coinsEarned,
            paymentId: paymentMethod === 'coins' ? 'COINS_PAID' : (req.body.paymentId || 'UPI_PAID'),
            status: 'confirmed'
        });
        await order.save();

        if (coinsEarned > 0 && username) {
            await User.findOneAndUpdate({ username }, { $inc: { cineCoins: coinsEarned } });
        }

        const updatedUser = await User.findOne({ username });
        res.status(201).json({
            message: 'Order placed',
            coinsEarned,
            orderId: order._id,
            newCoinBalance: updatedUser?.cineCoins || 0
        });
    } catch (err) {
        res.status(400).json({ error: 'Order failed: ' + err.message });
    }
});

// ADMIN ROUTES
// FIXED: all-bookings now includes refreshments and parking
app.get('/api/admin/all-bookings', async (req, res) => {
    try {
        const [tickets, adminBookings, refreshments, parking] = await Promise.all([
            Ticket.find({}).sort({ date: -1 }).limit(500),
            AdminBooking.find({}).sort({ date: -1 }).limit(100),
            RefreshmentOrder.find({}).sort({ date: -1 }).limit(500),
            ParkingBooking.find({}).sort({ date: -1 }).limit(200)
        ]);
        res.json({ tickets, adminBookings, refreshments, parking });
    } catch (err) {
        res.json({ tickets: [], adminBookings: [], refreshments: [], parking: [] });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try { res.json(await User.find({}, '-password').sort({ _id: -1 })); }
    catch { res.json([]); }
});

app.get('/api/admin/detailed-seats/:movieName/:timing', async (req, res) => {
    try {
        const { movieName, timing } = req.params;
        const tickets = await Ticket.find({ movieName, timing });
        const adminBookings = await AdminBooking.find({ movieName, timing });
        let seatMap = {};
        tickets.forEach(t => t.selectedSeats.forEach(s => { seatMap[s] = { user: t.username }; }));
        adminBookings.forEach(t => t.selectedSeats.forEach(s => { seatMap[s] = { user: t.username + ' (Admin)' }; }));
        res.json(seatMap);
    } catch { res.json({}); }
});

app.delete('/api/admin/refresh/:movieName/:timing', async (req, res) => {
    try {
        await Ticket.deleteMany({ movieName: req.params.movieName, timing: req.params.timing });
        await AdminBooking.deleteMany({ movieName: req.params.movieName, timing: req.params.timing });
        res.json({ message: "Show reset successfully" });
    } catch { res.status(500).json({ error: 'Reset failed' }); }
});

// FIXED: Admin direct booking - properly converts 1-based to 0-based seats
app.post('/api/admin/book-direct', async (req, res) => {
    try {
        const { username, movieName, timing, selectedSeats, amount, notes } = req.body;
        if (!username || !movieName || !timing || !selectedSeats || selectedSeats.length === 0) {
            return res.status(400).json({ error: 'username, movieName, timing and selectedSeats are required' });
        }

        // Convert from 1-based (UI) to 0-based (storage)
        const seats = selectedSeats.map(s => parseInt(s) - 1).filter(n => !isNaN(n) && n >= 0 && n < 30);
        if (seats.length === 0) return res.status(400).json({ error: 'No valid seat numbers (enter 1-30)' });

        // Check conflicts
        const existing = await Ticket.find({ movieName, timing });
        const adminExisting = await AdminBooking.find({ movieName, timing });
        let allBooked = [];
        existing.forEach(t => allBooked.push(...t.selectedSeats));
        adminExisting.forEach(t => allBooked.push(...t.selectedSeats));
        const conflicts = seats.filter(s => allBooked.includes(s));
        if (conflicts.length > 0) {
            return res.status(400).json({ error: `Seats ${conflicts.map(s => s + 1).join(', ')} already booked` });
        }

        let eTicketQR = null;
        try {
            const qrData = `CINETIME-ADMIN|${username}|${movieName}|${timing}|${seats.join(',')}|${Date.now()}`;
            eTicketQR = await qrcode.toDataURL(qrData);
        } catch (e) { console.error('QR error:', e.message); }

        const booking = new AdminBooking({
            username, movieName, timing,
            selectedSeats: seats,
            amount: amount || 0,
            notes: notes || '',
            status: 'confirmed',
            eTicketQR
        });
        await booking.save();
        res.status(201).json({ message: "Direct booking created", bookingId: booking._id, eTicketQR });
    } catch (err) {
        console.error("Admin booking error:", err);
        res.status(500).json({ error: "Direct booking failed: " + err.message });
    }
});

// FIXED: Analytics - includes ALL revenue sources
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const [ticketRevResult, parkingRevResult, snackRevResult] = await Promise.all([
            Ticket.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
            ParkingBooking.aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }]),
            RefreshmentOrder.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
        ]);

        const ticketRevenue = ticketRevResult[0]?.total || 0;
        const parkingRevenue = parkingRevResult[0]?.total || 0;
        const refreshmentRevenue = snackRevResult[0]?.total || 0;
        const totalRevenue = ticketRevenue + parkingRevenue + refreshmentRevenue;

        const [totalBookings, totalAdminBookings, totalUsers] = await Promise.all([
            Ticket.countDocuments(),
            AdminBooking.countDocuments(),
            User.countDocuments({ role: { $ne: 'admin' } })
        ]);

        const coinsResult = await Ticket.aggregate([{ $group: { _id: null, total: { $sum: '$coinsEarned' } } }]);
        const coinsIssued = coinsResult[0]?.total || 0;

        // 7-day revenue from ALL sources
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [ticketDaily, parkingDaily, snackDaily] = await Promise.all([
            Ticket.aggregate([
                { $match: { date: { $gte: sevenDaysAgo } } },
                { $group: { _id: { $dateToString: { format: "%m/%d", date: "$date" } }, revenue: { $sum: '$amount' } } }
            ]),
            ParkingBooking.aggregate([
                { $match: { date: { $gte: sevenDaysAgo } } },
                { $group: { _id: { $dateToString: { format: "%m/%d", date: "$date" } }, revenue: { $sum: '$price' } } }
            ]),
            RefreshmentOrder.aggregate([
                { $match: { date: { $gte: sevenDaysAgo } } },
                { $group: { _id: { $dateToString: { format: "%m/%d", date: "$date" } }, revenue: { $sum: '$total' } } }
            ])
        ]);

        const dailyRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const label = `${d.getMonth() + 1}/${d.getDate()}`;
            const t = ticketDaily.find(r => r._id === label)?.revenue || 0;
            const p = parkingDaily.find(r => r._id === label)?.revenue || 0;
            const s = snackDaily.find(r => r._id === label)?.revenue || 0;
            dailyRevenue.push({ date: label, revenue: t + p + s, tickets: t, parking: p, snacks: s });
        }

        const movieStats = await Ticket.aggregate([
            { $group: { _id: '$movieName', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
            { $sort: { count: -1 } }, { $limit: 5 }
        ]);

        res.json({
            totalRevenue, ticketRevenue, parkingRevenue, refreshmentRevenue,
            totalBookings, totalAdminBookings, totalUsers, coinsIssued,
            dailyRevenue, movieStats
        });
    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).json({ error: "Analytics failed: " + err.message });
    }
});

// CHATBOT
app.post('/api/chatbot', async (req, res) => {
    try {
        const { message } = req.body;
        const movies = await Movie.find({ isActive: true });
        const lower = message.toLowerCase();
        let reply;
        if (lower.includes('movie') || lower.includes('showing')) reply = `Now showing: ${movies.map(m => m.title).join(', ')} 🎬`;
        else if (lower.includes('price') || lower.includes('ticket')) reply = '🎟 Morning ₹120 · Afternoon ₹150 · Evening ₹180 · Night ₹200. Or 500 CineCoins!';
        else if (lower.includes('coin')) reply = '🪙 Earn 10 coins/ticket (UPI), 5/snack, 5/parking. 500 coins = free ticket!';
        else if (lower.includes('parking')) reply = '🅿️ Block A (2-Wheeler) ₹30 · Block B ₹60 · Block C ₹80 · Block D Free. +5🪙 on UPI!';
        else if (lower.includes('food') || lower.includes('snack')) reply = '🍿 Popcorn, Nachos, Combos and more in our Snack Bar!';
        else reply = `Thanks for asking! We're Cine Time — your best movie experience! 🎬`;
        res.json({ reply });
    } catch {
        res.json({ reply: "I'm having trouble. Please try again! 🤖" });
    }
});

// User coins
app.get('/api/user/coins/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        res.json({ cineCoins: user?.cineCoins || 0 });
    } catch { res.json({ cineCoins: 0 }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Cine Time server running on port ${PORT}`));