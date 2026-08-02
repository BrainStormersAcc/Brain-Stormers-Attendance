# Services Directory (`src/services/`)

This directory houses global API wrappers and interface logic interacting with Firebase services.

## Suggested Contents
- **`authService.js`**: Integrates Firebase Authentication methods (e.g. email/password logins, password resets, sign outs).
- **`notificationService.js`**: Connects with FCM (Firebase Cloud Messaging) for PWA push alerts.

## Guidelines
- Do not couple UI logic or component states with your service calls.
- Keep services as stateless utility adapters returning Promises.
- Domain-specific queries (such as retrieving student schedules or staff attendance tables) must live in their respective modules, not in this global directory.
