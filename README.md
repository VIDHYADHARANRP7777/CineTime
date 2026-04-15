# Cine Time | Premium Movie Booking System

**Cine Time** is a full-stack movie ticket booking application that delivers a seamless, visually rich user experience alongside a powerful administrative monitoring system. Built with a mobile-first approach and inspired by modern iOS design principles, the platform emphasizes usability, performance, and aesthetic precision.

## Overview

Cine Time bridges the gap between **intuitive ticket booking** and **real-time theater management**. Users can effortlessly browse movies, select seats, and manage bookings, while administrators gain a live visual overview of theater occupancy.

## Key Features

### User Experience

* **Dynamic Movie Gallery**
  Browse currently available movies with intelligently categorized showtimes (Morning, Afternoon, Evening, Night).

* **Interactive Seat Selection**
  A real-time, visual 30-seat grid that ensures accurate availability and prevents double bookings.

* **Booking History**
  Dedicated “My Bookings” section for users to track previous reservations, including seat and show details.

* **Modern Glassmorphic UI**
  Clean, responsive interface with smooth animations and an iOS-inspired design language using Figtree typography.


### Admin Capabilities

* **Visual Theater Monitor**
  Real-time, color-coded layout of the theater showing seat occupancy status.

* **Seat-Level Insights**
  Instantly view customer details (name and contact) by inspecting booked seats.

* **Theater Reset Functionality**
  Quickly clear and reset all bookings for new show schedules.


## 🧰 Tech Stack

 Layer       Technology                                             

 Frontend    React.js, Axios, CSS3 (Custom Properties & Animations) 
 Backend     Node.js, Express.js                                    
 Database    MongoDB (Mongoose ODM)                                 
 Versioning  Git & GitHub                                           


## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/VIDHYADHARANRP7777/CineTime.git
cd CineTime
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```


### 3. Environment Configuration

Create a `.env` file in the backend directory and configure the following:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

---

### 4. Run the Application

#### Start Backend Server

```bash
cd backend
npm start
```

#### Start Frontend

```bash
cd frontend
npm start
```

## Project Structure

```
CineTime/
│
├── backend/        # Express server & API routes
├── frontend/       # React application
├── README.md
└── .gitignore
```



##  Future Enhancements

* Online payment integration
* Multi-theater and multi-screen support
* User authentication and role-based access
* Seat reservation timeout system
* Deployment with CI/CD pipelines


## License

This project is licensed under the MIT License.

## Author

Developed by **Vidhyadharan RP**
Feel free to connect and provide feedback.


## ⭐ Acknowledgment

If you found this project useful or interesting, consider giving it a star ⭐ on GitHub!
