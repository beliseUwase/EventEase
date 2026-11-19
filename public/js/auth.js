
// Handle organizer registration
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("registerMessage");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            message.textContent = result.message;

            if (response.ok) {
                message.style.color = "green";

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            } else {
                message.style.color = "red";
            }

        } catch (error) {
            message.textContent = "Unable to connect to the server.";
            message.style.color = "red";
        }
    });
}


// Handle organizer login
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            message.textContent = result.message;

            if (response.ok) {
                message.style.color = "green";

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            } else {
                message.style.color = "red";
            }

        } catch (error) {
            message.textContent = "Unable to connect to the server.";
            message.style.color = "red";
        }
    });
}
