const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const QRCode = require('qrcode');
require('dotenv').config(); // 1. Load environment variables

const app = express();

// 2. CONSOLIDATED CORS (Keep only this one)
app.use(cors({
  origin: ["https://cine-time-r48yog7u8-vidhyadharanrp7777s-projects.vercel.app", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// 3. SECURE DATABASE CONNECTION
// Use the Key 'MONGO_URI' that you set in Render's Environment Variables
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0"; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Cine Time Database Connected"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- SCHEMAS ---
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

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ message: "Success" });
    } catch (err) { res.status(400).json({ error: "Username already exists" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "7777") {
        return res.json({ user: "admin", role: "admin" });
    }
    const user = await User.findOne({ username, password });
    if (user) res.json({ user: user.username, role: "user" });
    else res.status(401).json({ error: "Invalid credentials" });
});

// --- PAYMENT INTEGRATION ---
app.post('/api/payment/generate-qr', async (req, res) => {
    const { amount, movieName } = req.body;
    try {
        const upiId = "yourname@upi"; // Change to your real UPI ID for actual testing
        const transactionNote = `CineTime Booking - ${movieName}`;
        const upiUrl = `upi://pay?pa=${upiId}&pn=CineTime&am=${amount}&tn=${transactionNote}&cu=INR`;

        const qrCodeDataUrl = await QRCode.toDataURL(upiUrl);
        res.json({ qrCode: qrCodeDataUrl, message: "Scan with any UPI App to pay" });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate QR code" });
    }
});

// --- BOOKING & SYNC ROUTES ---
app.get('/api/booked-seats/:movieName/:timing', async (req, res) => {
    const { movieName, timing } = req.params;
    const tickets = await Ticket.find({ movieName, timing });
    let booked = [];
    tickets.forEach(t => booked = [...booked, ...t.selectedSeats]);
    res.json(booked);
});

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

app.post('/api/book', async (req, res) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.status(201).json({ message: "Booked" });
    } catch (err) { res.status(500).json({ error: "Booking failed" }); }
});

app.get('/api/history/:username', async (req, res) => {
    const history = await Ticket.find({ username: req.params.username }).sort({ date: -1 });
    res.json(history);
});

// --- ADMIN CONTROL ROUTES ---
app.delete('/api/admin/refresh/:movieName/:timing', async (req, res) => {
    await Ticket.deleteMany({ movieName: req.params.movieName, timing: req.params.timing });
    res.json({ message: "Show reset successfully" });
});

// 4. DYNAMIC PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));