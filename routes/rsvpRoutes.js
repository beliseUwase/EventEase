const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");
const requireAuth = require("../middleware/authMiddleware");
const router = express.Router();

const RSVPS_FILE = path.join(__dirname, "../data/rsvps.json");
const EVENTS_FILE = path.join(__dirname, "../data/events.json");

// Read RSVP records
async function readRSVPs() {
    const data = await fs.readFile(RSVPS_FILE, "utf8");
    return JSON.parse(data);
}

// Save RSVP records
async function saveRSVPs(rsvps) {
    await fs.writeFile(
        RSVPS_FILE,
        JSON.stringify(rsvps, null, 2)
    );
}

// Queue RSVP submissions to prevent simultaneous writes
let rsvpWriteQueue = Promise.resolve();

function withRSVPWriteLock(callback) {
    const operation = rsvpWriteQueue.then(callback);

    rsvpWriteQueue = operation.catch(() => {});

    return operation;
}

// Submit an RSVP for an event
router.post("/", async (req, res) => {
    try {
        await withRSVPWriteLock(async () => {
            const { eventId, name, email, numberOfGuests } = req.body;

            // Validate required information
            if (
                typeof eventId !== "string" || !eventId.trim() ||
                typeof name !== "string" || !name.trim() ||
                typeof email !== "string" || !email.trim() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                !Number.isInteger(Number(numberOfGuests)) ||
                Number(numberOfGuests) <= 0
            ) {
                return res.status(400).json({
                    message: "Please provide valid RSVP information."
                });
            }

            // Read existing events
            const events = JSON.parse(
                await fs.readFile(EVENTS_FILE, "utf8")
            );

            // Check whether the event exists
            const event = events.find(item => item.id === eventId);

            if (!event) {
                return res.status(404).json({
                    message: "Event not found."
                });
            }

            // Check whether the event date has passed
            const today = new Date();

            const todayString =
                today.getFullYear() + "-" +
                String(today.getMonth() + 1).padStart(2, "0") + "-" +
                String(today.getDate()).padStart(2, "0");

            if (event.date < todayString) {
                return res.status(400).json({
                    message: "This event has already ended. Registration is closed."
                });
            }

            // Read the latest RSVP list
            const rsvps = await readRSVPs();

            // Calculate the number of existing guests
            const currentAttendees = rsvps
                .filter(rsvp => rsvp.eventId === eventId)
                .reduce((total, rsvp) => total + rsvp.numberOfGuests, 0);

            // Check whether this email has already registered
            const normalizedEmail = email.trim().toLowerCase();

            const alreadyRegistered = rsvps.some(
                rsvp =>
                    rsvp.eventId === eventId &&
                    rsvp.email.toLowerCase() === normalizedEmail
            );

            if (alreadyRegistered) {
                return res.status(400).json({
                    message: "This email has already registered for this event."
                });
            }

            // Check whether the event has enough available spaces
            const guests = Number(numberOfGuests);

            if (currentAttendees + guests > event.maxAttendees) {
                return res.status(400).json({
                    message: "Sorry, this event does not have enough available spaces."
                });
            }

            // Create a new RSVP record
            const newRSVP = {
                id: randomUUID(),
                eventId: eventId,
                name: name.trim(),
                email: normalizedEmail,
                numberOfGuests: guests,
                createdAt: new Date().toISOString()
            };

            // Add the RSVP to the list
            rsvps.push(newRSVP);

            // Save the updated RSVP list
            await saveRSVPs(rsvps);

            // Send success response
            return res.status(201).json({
                message: "Your RSVP has been submitted successfully!",
                rsvp: newRSVP
            });
        });

    } catch (error) {
        console.error("RSVP submission error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                message: "Unable to submit RSVP."
            });
        }
    }
});

// Get all events for public visitors
router.get("/events", async (req, res) => {
    try {
        const events = JSON.parse(
            await fs.readFile(EVENTS_FILE, "utf8")
        );

        // Read existing RSVP records
        const rsvps = await readRSVPs();

        // Return only information visitors need
        const publicEvents = events.map(event => {

            // Calculate registered guests for this event
            const registeredGuests = rsvps
                .filter(rsvp => rsvp.eventId === event.id)
                .reduce(
                    (total, rsvp) => total + rsvp.numberOfGuests,
                    0
                );

            // Calculate remaining spaces
            const availableSpaces = event.maxAttendees - registeredGuests;

            return {
                id: event.id,
                title: event.title,
                description: event.description,
                date: event.date,
                time: event.time,
                location: event.location,
                maxAttendees: event.maxAttendees,
                registeredGuests: registeredGuests,
                availableSpaces: availableSpaces
            };
        });

        // Send the events to the frontend
        res.json(publicEvents);

    } catch (error) {
        console.error("Public event retrieval error:", error);

        res.status(500).json({
            message: "Unable to retrieve public events."
        });
    }
});

// Get RSVPs for an organizer's event
router.get("/:eventId", requireAuth, async (req, res) => {
    try {
        const events = JSON.parse(
            await fs.readFile(EVENTS_FILE, "utf8")
        );

        // Find the event belonging to the logged-in organizer
        const event = events.find(
            item =>
                item.id === req.params.eventId &&
                item.organizerId === req.session.userId
        );

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        // Retrieve RSVPs for this event
        const rsvps = await readRSVPs();

        const eventRSVPs = rsvps.filter(
            rsvp => rsvp.eventId === event.id
        );

        res.status(200).json(eventRSVPs);

    } catch (error) {
        console.error("RSVP retrieval error:", error);

        res.status(500).json({
            message: "Unable to retrieve RSVPs."
        });
    }
});

router.delete("/:eventId/:rsvpId", requireAuth, async (req, res) => {

    try {
        const events = JSON.parse(
            await fs.readFile(EVENTS_FILE, "utf8")
        );

        // Verify that the event belongs to the logged-in organizer
        const event = events.find(
            item =>
                item.id === req.params.eventId &&
                item.organizerId === req.session.userId
        );

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        // Retrieve all RSVPs
        const rsvps = await readRSVPs();

        // Find the RSVP belonging to this event
        const rsvp = rsvps.find(
            item =>
                item.id === req.params.rsvpId &&
                item.eventId === event.id
        );

        if (!rsvp) {
            return res.status(404).json({
                message: "RSVP not found."
            });
        }

        // Remove the selected RSVP
        const updatedRSVPs = rsvps.filter(
            item => item.id !== req.params.rsvpId
        );

        // Save the updated RSVP records
        await saveRSVPs(updatedRSVPs);

        res.status(200).json({
            message: "RSVP deleted successfully."
        });

    } catch (error) {
        console.error("RSVP deletion error:", error);

        res.status(500).json({
            message: "Unable to delete RSVP."
        });
    }
});

module.exports = router;