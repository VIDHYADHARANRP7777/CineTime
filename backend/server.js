const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARE (MUST BE FIRST — BEFORE ALL ROUTES) ---
app.use(cors({
    origin: function(origin, callback) {
        // Allow all vercel.app domains + localhost
        if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json()); // ✅ CRITICAL: Must be here before any route

// --- 2. DATABASE CONNECTION ---
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Cine Time Database Connected"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- 3. SCHEMAS ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: String,
    phone: String,
    role: { type: String, default: 'user' }
});

const ticketSchema = new mongoose.Schema({
    username: String,
    phone: String,
    movieName: String,
    timing: String,
    selectedSeats: [Number],
    amount: Number,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

// --- 4. QR GENERATION ROUTE ---
// ✅ Now placed AFTER express.json() so req.body is always parsed
app.post('/api/payment/generate-qr', async (req, res) => {
    try {
        const { amount, movieName } = req.body;

        console.log("QR API HIT — amount:", amount, "| movieName:", movieName);

        if (!amount || !movieName) {
            return res.status(400).json({ error: "Missing amount or movieName" });
        }

        const upiId = process.env.UPI_ID || "9876543210@ybl"; // Use env var for safety
        const upiLink = `upi://pay?pa=${upiId}&pn=CineTime&am=${amount}&tn=${encodeURIComponent(`Booking-${movieName}`)}`;

        const qrCodeImage = await qrcode.toDataURL(upiLink);

        res.json({ qrCode: qrCodeImage }); // ✅ matches frontend res.data.qrCode

    } catch (err) {
        console.error("QR Generation Error:", err);
        res.status(500).json({ error: "Failed to generate QR code" });
    }
});

// --- 5. AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ message: "Success" });
    } catch (err) {
        res.status(400).json({ error: "Username already exists" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Admin hardcoded check
    if (username === "admin" && password === "7777") {
        return res.json({ user: "admin", role: "admin" });
    }

    const user = await User.findOne({ username, password });
    if (user) {
        res.json({ user: user.username, role: "user" });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// --- 6. BOOKING & HISTORY ROUTES ---
app.get('/api/booked-seats/:movieName/:timing', async (req, res) => {
    const { movieName, timing } = req.params;
    const tickets = await Ticket.find({ movieName, timing });
    let booked = [];
    tickets.forEach(t => booked = [...booked, ...t.selectedSeats]);
    res.json(booked);
});

app.post('/api/book', async (req, res) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.status(201).json({ message: "Booked" });
    } catch (err) {
        res.status(500).json({ error: "Booking failed" });
    }
});

app.get('/api/history/:username', async (req, res) => {
    const history = await Ticket.find({ username: req.params.username }).sort({ date: -1 });
    res.json(history);
});

// --- 7. ADMIN ROUTES ---
app.get('/api/admin/detailed-seats/:movieName/:timing', async (req, res) => {
    const { movieName, timing } = req.params;
    const tickets = await Ticket.find({ movieName, timing });
    let seatMap = {};
    tickets.forEach(t => {
        t.selectedSeats.forEach(s => {
            seatMap[s] = { user: t.username, phone: t.phone };
        });
    });
    res.json(seatMap);
});

app.delete('/api/admin/refresh/:movieName/:timing', async (req, res) => {
    await Ticket.deleteMany({
        movieName: req.params.movieName,
        timing: req.params.timing
    });
    res.json({ message: "Show reset successfully" });
});

// --- 8. SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));