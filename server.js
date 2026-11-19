
require("dotenv").config();

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from the environment variables.");
}

const requireAuth = require('./middleware/authMiddleware');
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");

const app = express();
const PORT = 3000;


// Parse incoming data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure sessions
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000
    }
}));

app.get('/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/rsvps", rsvpRoutes);

// Server status
app.get("/api/status", (req, res) => {
    res.json({
        message: "EventEase server is running!",
        status: "success"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`EventEase is running at http://localhost:${PORT}`);
});
