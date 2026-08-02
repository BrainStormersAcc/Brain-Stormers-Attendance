# Pages Directory (`src/pages/`)

This directory houses global views and entry-points that represent standard pages/routes in the app.

## Active Files
- **`Login.jsx`**: Portal sign-in authentication page.
- **`DashboardHome.jsx`**: Default landing view showcasing today's stats counters and active coaching badges.
- **`NotFound.jsx`**: Rendered for 404 URL matches.

## Guidelines
- Pages here serve as shell containers.
- If a route belongs to a specific business feature (such as `/staff-attendance`), it should live under its module (`src/modules/staff-attendance/pages/`) and be imported into `src/App.jsx`.
