# Frontend Application

## Overview

This project is a React + Vite frontend application designed for a scalable multi-developer environment.

The application follows a feature-based architecture where every module owns its own pages, components, and service layer.

---

## Technology Stack

* React
* Vite
* React Router DOM
* Axios
* ESLint
* Prettier

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the project:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

## Environment Configuration

Create a `.env` file using `.env.example`.

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Application

Development:

```bash
npm run dev
```

Production Build:

```bash
npm run build
```

Preview Production Build:

```bash
npm run preview
```

---

## Project Structure

```text
src/
├── assets/
├── pages/
├── components/
├── services/
├── routes/
├── hooks/
├── utils/
├── constants/
├── layouts/
└── App.jsx
```

---

## Development Guidelines

### Pages

Pages represent routes.

Example:

```text
pages/submissions/SubmissionsPage.jsx
```

---

### Components

Components are grouped by module.

Example:

```text
components/submissions/GetSubmission
components/users/UserTable
components/common/Button
```

---

### Services

All API requests must be placed inside the services directory.

Example:

```text
services/submissions.service.js
services/users.service.js
```

Do not perform direct API calls inside React components.

---

### Environment Variables

All server URLs must be configured through environment variables.

Never hardcode API URLs.

---

### Branching Strategy

Main branch:

```text
main
```

Feature branches:

```text
feature/submissions
feature/users
feature/dashboard
```

Example:

```bash
git checkout -b feature/submissions
```

Developers should create Pull Requests into the main branch.

---

## Code Standards

* Use functional components.
* Use hooks instead of class components.
* Keep business logic in services.
* Keep components focused on UI.
* Use reusable components from components/common whenever possible.
* Follow ESLint and Prettier formatting rules.

---

## Build

Generate production assets:

```bash
npm run build
```

Generated files will be placed inside:

```text
dist/
```
