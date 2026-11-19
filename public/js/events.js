// Listen for updates from the organizer dashboard
const eventEaseChannel = new BroadcastChannel("eventease-updates");

eventEaseChannel.addEventListener("message", function(event) {
    if (event.data && event.data.type === "DATA_UPDATED") {
        loadPublicEvents();
    }
});

// Load events for public visitors
async function loadPublicEvents() {
    try {
        const response = await fetch("/api/rsvps/events");

        if (!response.ok) {
            throw new Error("Unable to retrieve available events.");
        }

        const events = await response.json();

        // Read the current filter values
        const searchTerm = document
            .getElementById("eventSearch")
            .value.trim().toLowerCase();

        const selectedDate = document
            .getElementById("eventDateFilter")
            .value;

        const locationTerm = document
            .getElementById("eventLocationFilter")
            .value.trim().toLowerCase();

        // Filter events based on the selected criteria
        const filteredEvents = events.filter(function(event) {

            const matchesTitle = event.title
                .toLowerCase()
                .includes(searchTerm);

            const matchesDate =
                selectedDate === "" || event.date === selectedDate;

            const matchesLocation = event.location
                .toLowerCase()
                .includes(locationTerm);

            return matchesTitle && matchesDate && matchesLocation;
        });

        // Sort events by date
        const sortOrder = document.getElementById("eventSort").value;

        filteredEvents.sort(function(a, b) {
            if (sortOrder === "earliest") {
                return a.date.localeCompare(b.date);
            }

            return b.date.localeCompare(a.date);
        });

        const eventList = document.getElementById("publicEventList");

        eventList.innerHTML = "";

        if (filteredEvents.length === 0) {
            eventList.textContent = "There are currently no available events.";
            return;
        }

        filteredEvents.forEach(function(event) {
            const eventCard = document.createElement("div");

            // Get today's date in YYYY-MM-DD format
            const today = new Date();

            const todayString =
                today.getFullYear() + "-" +
                String(today.getMonth() + 1).padStart(2, "0") + "-" +
                String(today.getDate()).padStart(2, "0");

            // Check whether the event date has passed
            const isPastEvent = event.date < todayString;

            const title = document.createElement("h3");
            title.textContent = event.title;

            const description = document.createElement("p");
            description.textContent = event.description;

            const date = document.createElement("p");
            date.textContent = "Date: " + event.date;

            const time = document.createElement("p");
            time.textContent = "Time: " + event.time;

            const location = document.createElement("p");
            location.textContent = "Location: " + event.location;

            const capacity = document.createElement("p");
            capacity.textContent =
                "Maximum attendees: " + event.maxAttendees;

            const registered = document.createElement("p");
            registered.textContent =
                "Registered guests: " + event.registeredGuests;

            const available = document.createElement("p");
            available.textContent =
                "Available spaces: " + event.availableSpaces;

            eventCard.appendChild(title);
            eventCard.appendChild(description);
            eventCard.appendChild(date);
            eventCard.appendChild(time);
            eventCard.appendChild(location);
            eventCard.appendChild(capacity);
            eventCard.appendChild(registered);
            eventCard.appendChild(available);

            const rsvpButton = document.createElement("button");

            // Create RSVP button
            if (isPastEvent) {
                rsvpButton.textContent = "Event Ended";
                rsvpButton.disabled = true;
            } else if (event.availableSpaces <= 0) {
                rsvpButton.textContent = "Event Full";
                rsvpButton.disabled = true;
            } else {
                rsvpButton.textContent = "Register / RSVP";
            }

            rsvpButton.addEventListener("click", function() {
                document.getElementById("eventId").value = event.id;

                document.getElementById("rsvpSection").style.display = "block";

                document.getElementById("rsvpSection").scrollIntoView({
                    behavior: "smooth"
                });
            });
            eventCard.appendChild(rsvpButton);

            eventList.appendChild(eventCard);
        });

    } catch (error) {
        console.error("Public event loading error:", error);

        document.getElementById("publicEventList").textContent =
            "Unable to load events. Please try again later.";
    }
}

// Automatically apply filters when visitors change them
document.getElementById("eventSearch").addEventListener("input", loadPublicEvents);

document.getElementById("eventDateFilter").addEventListener("change", loadPublicEvents);

document.getElementById("eventLocationFilter").addEventListener("input", loadPublicEvents);

// Automatically sort events when the selection changes
document.getElementById("eventSort").addEventListener("change", loadPublicEvents);

// Clear all filters
document.getElementById("clearFilters").addEventListener("click", function() {
    document.getElementById("eventSearch").value = "";
    document.getElementById("eventDateFilter").value = "";
    document.getElementById("eventLocationFilter").value = "";

    loadPublicEvents();
});

// Load events when the page opens
loadPublicEvents();

// Handle RSVP form submission
document.getElementById("rsvpForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const rsvpData = {
        eventId: document.getElementById("eventId").value,
        name: document.getElementById("visitorName").value,
        email: document.getElementById("visitorEmail").value,
        numberOfGuests: document.getElementById("numberOfGuests").value
    };

    try {
        const response = await fetch("/api/rsvps", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(rsvpData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "RSVP submission failed.");
        }

        document.getElementById("rsvpMessage").textContent =
            result.message;

        // Clear the RSVP form
        document.getElementById("rsvpForm").reset();

        // Notify the organizer dashboard that an RSVP was added
        const eventEaseChannel = new BroadcastChannel("eventease-updates");

        eventEaseChannel.postMessage({
            type: "DATA_UPDATED"
        });

        eventEaseChannel.close();
        // Automatically reload the event cards
        await loadPublicEvents();

        document.getElementById("rsvpSection").style.display = "block";

    } catch (error) {
        const rsvpMessage = document.getElementById("rsvpMessage");

        if (error instanceof TypeError) {
            rsvpMessage.textContent =
                "Unable to connect to the server. Please check your connection and try again.";
        } else {
            rsvpMessage.textContent = error.message;
        }

        console.error("RSVP submission error:", error);
    }
});