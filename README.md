# X-Gym Web Platform

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/Status-Template%20%2F%20MVP-blue)
![License](https://img.shields.io/badge/License-MIT-green)

X-Gym is a front-end gym management platform template focused on modern UI, role-based user flows, and lightweight browser-side state management.

It includes a cinematic landing experience, auth and portal screens, trainer/client dashboard templates, and class management interactions powered by vanilla JavaScript.

## Overview

- **Purpose:** Foundation for a gym web product (client + trainer workflows)
- **Stack:** HTML, CSS, JavaScript (no framework)
- **Architecture:** Multi-page template with shared styling and browser-side state
- **Current state:** MVP / template stage, ready for backend integration

## Key Capabilities

- Cinematic landing page with particle layers and GSAP animations
- Role-based registration and login flow (client-side)
- Trainer/staff tools for:
   - Class creation
   - Trainer assignment
   - Trainer-hours tracking
- Client tools for:
   - Viewing available classes
   - Enrolling in classes
   - Viewing personal enrollments
- Reusable glassmorphism/3D visual system in shared stylesheet

## Repository Layout

| Path | Description |
|---|---|
| `XgymIndex.xxxx.html` | Cinematic index/hero landing page |
| `TemplateGymWeb.html` | Main portal page connected to `app.js` |
| `Client.html` | Client dashboard template |
| `DashboardClient.xxx.html` | Alternate client dashboard concept |
| `Trainer.html` | Trainer dashboard template |
| `styles.css` | Shared visual styles and components |
| `app.js` | Core app state, auth, classes, and UI controller logic |
| `LICENSE` | Project license |

## Quick Start

1. Clone this repository.
2. Open the project in VS Code (or any editor).
3. Launch one of the HTML entry points in your browser:
    - `TemplateGymWeb.html` (main app flow)
    - `XgymIndex.xxxx.html` (landing experience)

No package installation or build pipeline is required for the current version.

## State Management

The application currently stores runtime data in browser `localStorage` under the `gymState` key.

Stored data includes:
- Registered users
- Session (`currentUserId`)
- Classes, assignments, trainer hours, and enrollments

Clearing browser storage resets all app data.

## Security Notice

This project is currently **template/demo grade** and not production-ready for authentication:

- Credentials are handled client-side
- No backend token/session security
- No password hashing service

Do not use real user data until server-side auth is implemented.

## Roadmap

- Backend API integration (auth, users, classes, trainers, products)
- Secure authentication and authorization
- Unified cart/product/trainer booking flow across dashboards
- Standardized page naming and routing consistency
- Test coverage and CI workflow
- Deployment setup and environment configuration

## Contributing

Contributions are welcome. For clean collaboration:

1. Create a feature branch from `main`
2. Keep commits focused and descriptive
3. Open a pull request with summary, screenshots, and test notes

## License

Licensed under the terms of the [LICENSE](LICENSE) file.
