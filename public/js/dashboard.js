
// Listen for updates from other EventEase pages
const eventEaseChannel = new BroadcastChannel("eventease-updates");

eventEaseChannel.addEventListener("message", function(event) {
    if (event.data && event.data.type === "DATA_UPDATED") {
        loadEvents();
    }
});

// Retrieve the logged-in organizer's profile
async function loadOrganizerProfile() {
    try {
        const response = await fetch("/api/auth/me");

        // Check whether the organizer is authenticated
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to retrieve organizer profile.");
        }

        // Convert the server response into JavaScript data
        const organizer = await response.json();

        // Display organizer information
        document.getElementById("organizerName").textContent =
            organizer.name;

        document.getElementById("organizerEmail").textContent =
            organizer.email;

    } catch (error) {
        console.error("Profile loading error:", error);

        alert("Could not load your profile. Please try again.");
    }
}

// Load profile when the dashboard opens
loadOrganizerProfile();


// Handle organizer logout
async function logoutOrganizer() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Logout failed.");
        }

        // Redirect to login page after successful logout
        window.location.href = "/login.html";

    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");
    }
}

// Connect logout button to logout function
document.getElementById("logoutBtn").addEventListener("click", function(event) {
    event.preventDefault();
    logoutOrganizer();
});

// Handle event creation form submission
document.getElementById("eventForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const eventData = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        location: document.getElementById("location").value,
        maxAttendees: document.getElementById("maxAttendees").value
    };

    try {
        const response = await fetch("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(eventData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Event creation failed.");
        }

        document.getElementById("eventMessage").textContent =
            result.message;

        document.getElementById("eventForm").reset();
        
        loadEvents();

        // Notify other open EventEase pages about the new event
        eventEaseChannel.postMessage({
            type: "DATA_UPDATED"
        });

        console.log("Created event:", result.event);

    } catch (error) {
        document.getElementById("eventMessage").textContent =
            error.message;

        console.error("Event creation error:", error);
    }
});

// Load and display the organizer's events
async function loadEvents() {
    try {
        const response = await fetch("/api/events");

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to retrieve events.");
        }

        const events = await response.json();

        const eventList = document.getElementById("eventList");

        eventList.innerHTML = "";

        if (events.length === 0) {
            eventList.textContent = "You have not created any events yet.";
            return;
        }

        events.forEach(function(event) {
            const eventCard = document.createElement("div");

            const title = document.createElement("h4");
            title.textContent = event.title;

            const description = document.createElement("p");
            description.textContent = event.description;

            const date = document.createElement("p");
            date.textContent = "Date: " + event.date;

            const time = document.createElement("p");
            time.textContent = "Time: " + event.time;

            const location = document.createElement("p");
            location.textContent = "Location: " + event.location;

            const attendees = document.createElement("p");
            attendees.textContent =
                "Maximum attendees: " + event.maxAttendees;

            // Display RSVP statistics
            const registered = document.createElement("p");
            registered.textContent =
                "Registered guests: " + event.registeredGuests;

            const available = document.createElement("p");
            available.textContent =
                "Available spaces: " + event.availableSpaces;

            const totalRSVPs = document.createElement("p");
            totalRSVPs.textContent =
                "Total RSVP submissions: " + event.totalRSVPs;

            // Create View RSVPs button
            const rsvpButton = document.createElement("button");
            rsvpButton.textContent = "View RSVPs";

            // Create a section to display RSVP records
            const rsvpList = document.createElement("div");

            rsvpList.className = "rsvp-list";

            rsvpButton.addEventListener("click", async function() {
                try {
                    const response = await fetch("/api/rsvps/" + event.id);

                    const rsvps = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            rsvps.message || "Unable to retrieve RSVPs."
                        );
                    }

                    rsvpList.innerHTML = "";

                    if (rsvps.length === 0) {
                        rsvpList.textContent = "No RSVPs for this event yet.";
                        return;
                    }

                    rsvps.forEach(function(rsvp) {
                        const attendee = document.createElement("p");

                        const attendeeCard = document.createElement("div");
                        attendeeCard.className = "rsvp-attendee-card";

                        attendee.className = "rsvp-attendee-details";

                        attendee.textContent =
                            "Name: " + rsvp.name +
                            " | Email: " + rsvp.email +
                            " | Guests: " + rsvp.numberOfGuests;

                        const deleteRSVPButton = document.createElement("button");
                        deleteRSVPButton.textContent = "Delete RSVP";
                        deleteRSVPButton.className = "rsvp-delete-button";

                        deleteRSVPButton.addEventListener("click", async function() {
                            const confirmDelete = confirm(
                                "Are you sure you want to delete this RSVP?"
                            );

                            if (!confirmDelete) {
                                return;
                            }

                            try {
                                const response = await fetch(
                                    "/api/rsvps/" + event.id + "/" + rsvp.id,
                                    {
                                        method: "DELETE"
                                    }
                                );

                                const result = await response.json();

                                if (!response.ok) {
                                    throw new Error(result.message || "Unable to delete RSVP.");
                                }

                                // Notify other open EventEase pages
                                eventEaseChannel.postMessage({
                                    type: "DATA_UPDATED"
                                });

                                // Update the statistics immediately
                                event.registeredGuests -= rsvp.numberOfGuests;
                                event.availableSpaces += rsvp.numberOfGuests;
                                event.totalRSVPs -= 1;

                                registered.textContent =
                                    "Registered guests: " + event.registeredGuests;

                                available.textContent =
                                    "Available spaces: " + event.availableSpaces;

                                totalRSVPs.textContent =
                                    "Total RSVP submissions: " + event.totalRSVPs;

                                // Refresh the attendee list
                                rsvpButton.click();

                            } catch (error) {
                                console.error("RSVP deletion error:", error);
                                alert(error.message);
                            }
                        });

                        attendeeCard.appendChild(attendee);
                        attendeeCard.appendChild(deleteRSVPButton);

                        rsvpList.appendChild(attendeeCard);
                    });

                } catch (error) {
                    console.error("RSVP retrieval error:", error);
                    rsvpList.textContent = error.message;
                }
            });

            // Create Edit button
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";

            editButton.addEventListener("click", async function() {
                const updatedTitle = prompt("Enter the new event title:", event.title);

                if (updatedTitle === null) {
                    return;
                }

                const updatedDescription = prompt(
                    "Enter the new description:",
                    event.description
                );

                if (updatedDescription === null) {
                    return;
                }

                const updatedDate = prompt("Enter the new date:", event.date);

                if (updatedDate === null) {
                    return;
                }

                const updatedTime = prompt("Enter the new time:", event.time);

                if (updatedTime === null) {
                    return;
                }

                const updatedLocation = prompt(
                    "Enter the new location:",
                    event.location
                );

                if (updatedLocation === null) {
                    return;
                }

                const updatedMaxAttendees = prompt(
                    "Enter the new maximum attendees:",
                    event.maxAttendees
                );

                if (updatedMaxAttendees === null) {
                    return;
                }

                const updatedEvent = {
                    title: updatedTitle,
                    description: updatedDescription,
                    date: updatedDate,
                    time: updatedTime,
                    location: updatedLocation,
                    maxAttendees: updatedMaxAttendees
                };

                try {
                    const response = await fetch("/api/events/" + event.id, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(updatedEvent)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || "Unable to update event.");
                    }

                    alert(result.message);

                    loadEvents();

                    // Notify other open EventEase pages about the updated event
                    eventEaseChannel.postMessage({
                        type: "DATA_UPDATED"
                    });

                } catch (error) {
                    console.error("Event update error:", error);
                    alert(error.message);
                }
            });

            // Create Delete button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async function() {
                const confirmDelete = confirm(
                    "Are you sure you want to delete this event?"
                );

                if (!confirmDelete) {
                    return;
                }

                try {
                    const response = await fetch("/api/events/" + event.id, {
                        method: "DELETE"
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || "Unable to delete event.");
                    }

                    alert(result.message);

                    // Refresh the displayed events
                    loadEvents();

                    // Notify other open EventEase pages about the deleted event
                    eventEaseChannel.postMessage({
                        type: "DATA_UPDATED"
                    });

                } catch (error) {
                    console.error("Event deletion error:", error);
                    alert(error.message);
                }
            });

            eventCard.appendChild(title);
            eventCard.appendChild(description);
            eventCard.appendChild(date);
            eventCard.appendChild(time);
            eventCard.appendChild(location);
            eventCard.appendChild(attendees);
            eventCard.appendChild(registered);
            eventCard.appendChild(available);
            eventCard.appendChild(totalRSVPs);
            eventCard.appendChild(rsvpButton);
            eventCard.appendChild(rsvpList);
            eventCard.appendChild(editButton);
            eventCard.appendChild(deleteButton);

            eventList.appendChild(eventCard);

        });

    } catch (error) {
        console.error("Event loading error:", error);

        document.getElementById("eventList").textContent =
            "Unable to load your events.";
    }
}

// Prevent organizers from selecting a past event date
const eventDateInput = document.getElementById("date");
const today = new Date();

const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

eventDateInput.min = localToday;

// Load events when the dashboard opens
loadEvents();