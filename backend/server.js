const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://admin:Vidhya123@cluster0.g2i679h.mongodb.net/?appName=Cluster0"; 

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

// --- BOOKING & SYNC ROUTES ---
app.get('/api/booked-seats/:movieName/:timing', async (req, res) => {
    const { movieName, timing } = req.params;
    const tickets = await Ticket.find({ movieName, timing });
    let booked = [];
    tickets.forEach(t => booked = [...booked, ...t.selectedSeats]);
    res.json(booked);
});

// NEW: ADMIN VISUAL DATA ROUTE
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
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json({ message: "Booked" });
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

app.listen(5000, () => console.log("🚀 Server running on port 5000"));