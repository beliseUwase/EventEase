const requireAuth = require("../middleware/authMiddleware");
const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");

const router = express.Router();

const EVENTS_FILE = path.join(__dirname, "../data/events.json");
const RSVPS_FILE = path.join(__dirname, "../data/rsvps.json");

// Read all events from the JSON file
async function readEvents() {
    const data = await fs.readFile(EVENTS_FILE, "utf8");
    return JSON.parse(data);
}

// Read RSVP records
async function readRSVPs() {
    const data = await fs.readFile(RSVPS_FILE, "utf8");
    return JSON.parse(data);
}

// Save events to the JSON file
async function saveEvents(events) {
    await fs.writeFile(
        EVENTS_FILE,
        JSON.stringify(events, null, 2)
    );
}

router.post("/", requireAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            time,
            location,
            maxAttendees
        } = req.body;

        // Validate required fields
        if (
            !title?.trim() ||
            !description.trim() ||
            !date ||
            !time ||
            !location?.trim() ||
            !maxAttendees
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }
        
        /// Validate that the event date and time are in the future
        const now = new Date();
        const eventDateTime = new Date(`${date}T${time}`);

        if (
            isNaN(eventDateTime.getTime()) ||
            eventDateTime <= now
        ) {
            return res.status(400).json({
                message: "Event date and time must be in the future."
            });
        }

        const events = await readEvents();

        const newEvent = {
            id: randomUUID(),
            organizerId: req.session.userId,
            title: title.trim(),
            description: description.trim(),
            date,
            time,
            location: location.trim(),
            maxAttendees: Number(maxAttendees),
            createdAt: new Date().toISOString()
        };

        events.push(newEvent);

        await saveEvents(events);

        res.status(201).json({
            message: "Event created successfully.",
            event: newEvent
        });

    } catch (error) {
        console.error("Event creation error:", error);

        res.status(500).json({
            message: "Unable to create event."
        });
    }
});

// Get events belonging to the logged-in organizer
router.get("/", requireAuth, async (req, res) => {
    try {
        const events = await readEvents();
        const rsvps = await readRSVPs();

        const organizerEvents = events
            .filter(event => event.organizerId === req.session.userId)
            .map(event => {

                // Get RSVPs for this event
                const eventRSVPs = rsvps.filter(
                    rsvp => rsvp.eventId === event.id
                );

                // Calculate registered guests
                const registeredGuests = eventRSVPs.reduce(
                    (total, rsvp) => total + rsvp.numberOfGuests,
                    0
                );

                // Calculate available spaces
                const availableSpaces =
                    event.maxAttendees - registeredGuests;

                return {
                    ...event,
                    registeredGuests: registeredGuests,
                    availableSpaces: availableSpaces,
                    totalRSVPs: eventRSVPs.length
                };
            });

        res.status(200).json(organizerEvents);

    } catch (error) {
        console.error("Event retrieval error:", error);

        res.status(500).json({
            message: "Unable to retrieve events."
        });
    }
});

// Update an existing event
router.put("/:id", requireAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            time,
            location,
            maxAttendees
        } = req.body;

        // Validate required fields
        if (
            typeof title !== "string" || !title.trim() ||
            typeof description !== "string" || !description.trim() ||
            !date ||
            !time ||
            typeof location !== "string" || !location.trim() ||
            !Number.isInteger(Number(maxAttendees)) ||
            Number(maxAttendees) <= 0
        ) {
            return res.status(400).json({
                message: "Please provide valid event information."
            });
        }

        const events = await readEvents();

        // Find the event belonging to this organizer
        const eventIndex = events.findIndex(
            event =>
                event.id === req.params.id &&
                event.organizerId === req.session.userId
        );

        if (eventIndex === -1) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        // Read existing RSVP records
        const rsvps = await readRSVPs();

        // Calculate the number of guests already registered
        const registeredGuests = rsvps
            .filter(rsvp => rsvp.eventId === req.params.id)
            .reduce(
                (total, rsvp) => total + rsvp.numberOfGuests,
                0
            );

        // Prevent reducing capacity below registered guests
        if (Number(maxAttendees) < registeredGuests) {
            return res.status(400).json({
                message: `Maximum attendees cannot be lower than the ${registeredGuests} guests already registered.`
            });
        }

        // Update the event information
        events[eventIndex].title = title.trim();
        events[eventIndex].description = description.trim();
        events[eventIndex].date = date;
        events[eventIndex].time = time;
        events[eventIndex].location = location.trim();
        events[eventIndex].maxAttendees = Number(maxAttendees);
        events[eventIndex].updatedAt = new Date().toISOString();

        await saveEvents(events);

        res.status(200).json({
            message: "Event updated successfully.",
            event: events[eventIndex]
        });

    } catch (error) {
        console.error("Event update error:", error);

        res.status(500).json({
            message: "Unable to update event."
        });
    }
});

// Delete an existing event
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const events = await readEvents();

        // Find the event belonging to this organizer
        const eventIndex = events.findIndex(
            event =>
                event.id === req.params.id &&
                event.organizerId === req.session.userId
        );

        if (eventIndex === -1) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        // Remove the event
        const deletedEvent = events.splice(eventIndex, 1)[0];

        await saveEvents(events);

        // Read all RSVP records
        const rsvps = JSON.parse(
            await fs.readFile(RSVPS_FILE, "utf8")
        );

        // Remove RSVPs associated with the deleted event
        const remainingRSVPs = rsvps.filter(
            rsvp => rsvp.eventId !== deletedEvent.id
        );

        // Save the remaining RSVP records
        await fs.writeFile(
            RSVPS_FILE,
            JSON.stringify(remainingRSVPs, null, 2)
        );

        res.status(200).json({
            message: "Event and associated RSVPs deleted successfully."
        });

    } catch (error) {
        console.error("Event deletion error:", error);

        res.status(500).json({
            message: "Unable to delete event."
        });
    }
});

module.exports = router;