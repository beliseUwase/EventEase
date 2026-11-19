# EventEase

EventEase is an event RSVP management web application that allows organizers to create and manage events while allowing visitors to browse events and register as attendees.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- Express Session
- bcryptjs
- dotenv
- JSON file storage

## Features

### Visitor Features
- Browse available events.
- Search and filter events.
- View event details and available capacity.
- Register for events without creating an account.
- Receive feedback when submitting an RSVP.

### Organizer Features
- Create an organizer account and log in securely.
- Access a protected organizer dashboard.
- Create, view, update, and delete events.
- Monitor registered guests and available spaces.
- View and manage event registrations.

### Validation and Security
- Password hashing using bcryptjs.
- Session-based authentication.
- Protected organizer routes.
- Organizer ownership checks.
- Server-side input validation.
- Duplicate RSVP prevention.
- Event capacity enforcement.
- Session cookie security settings.

## Project Structure

```text
EventEase/
├── data/
│   ├── users.example.json
│   ├── events.example.json
│   └── rsvps.example.json
├── middleware/
├── public/
│   ├── css/
│   └── js/
├── routes/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd EventEase
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a template.

Set your own session secret:

```env
SESSION_SECRET=kigaliconventioncenter2020!
```

### 4. Initialize the data files

Create the following files inside the `data` directory, each containing an empty JSON array (`[]`):

- `users.json`
- `events.json`
- `rsvps.json`

### 5. Start the application

```bash
npm start
```

Open the application in your browser:

```text
http://localhost:3000
```

## Project Purpose

EventEase aims to simplify event registration and management by providing organizers with tools to manage events and attendees while helping prevent duplicate registrations and registrations beyond event capacity.