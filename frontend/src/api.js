import axios from 'axios';
const API = axios.create({ baseURL: "http://localhost:5000/api" });

export const registerUser = (data) => API.post('/register', data);
export const loginUser = (data) => API.post('/login', data);
export const bookTicket = (data) => API.post('/book', data);
export const getBookedSeats = (movie) => API.get(`/booked-seats/${movie}`);