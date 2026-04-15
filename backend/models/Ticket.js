const mongoose = require('mongoose');
const TicketSchema = new mongoose.Schema({
    username: String,
    movieName: String,
    selectedSeats: [Number], // Array of seat IDs (e.g., [1, 2, 5])
    amount: Number,
    date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Ticket', TicketSchema);