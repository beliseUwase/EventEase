
const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");

const router = express.Router();

const USERS_FILE = path.join(__dirname, "../data/users.json");

async function readUsers() {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
}

async function saveUsers(users) {
    await fs.writeFile(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

// Organizer registration
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Please provide a valid name, email, and password."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const users = await readUsers();

        const existingUser = users.find(
            user => user.email === normalizedEmail
        );

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = {
            id: randomUUID(),
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        };

        users.push(newUser);
        await saveUsers(users);

        req.session.regenerate(error => {
            if (error) {
                return res.status(500).json({
                    message: "Account created, but session setup failed."
                });
            }

            req.session.userId = newUser.id;

            res.status(201).json({
                message: "Account created successfully.",
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email
                }
            });
        });

        
    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "An error occurred during registration."
        });
    }
});

// Organizer login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Please provide a valid email and password."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            });
        }

        const users = await readUsers();

        const user = users.find(
            account => account.email === normalizedEmail
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        req.session.regenerate(error => {
            if (error) {
                return res.status(500).json({
                    message: "Login successful, but session setup failed."
                });
            }

            req.session.userId = user.id;

            res.json({
                message: "Login successful.",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "An error occurred during login."
        });
    }
});

// Organizer logout
router.post("/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({
                message: "Could not log out."
            });
        }

        res.clearCookie("connect.sid", {
            path: "/"
        });
        res.json({
            message: "Logout successful."
        });
    });
});


// Get the currently logged-in organizer
router.get("/me", async (req, res) => {
    try {
        // Check whether the organizer is logged in
        if (!req.session.userId) {
            return res.status(401).json({
                message: "You must be logged in."
            });
        }

        // Retrieve all registered users
        const users = await readUsers();

        // Find the currently logged-in organizer
        const user = users.find(
            u => u.id === req.session.userId
        );

        if (!user) {
            return res.status(404).json({
                message: "Organizer not found."
            });
        }

        // Return only public organizer information
        res.json({
            id: user.id,
            name: user.name,
            email: user.email
        });

    } catch (error) {
        console.error("Profile retrieval error:", error);

        res.status(500).json({
            message: "Unable to retrieve organizer information."
        });
    }
});

module.exports = router;