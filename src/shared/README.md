# Shared Directory (`src/shared/`)

This directory is reserved for reusable widgets, utilities, and components used across **multiple** modules in the application.

## Directory Structure

- **`components/`**: House global presentational components.
  - **`DashboardLayout.jsx`**: Responsive framework displaying sidebar, header, dynamic connection watchers, and portal outlets.
  - **`Button.jsx`**, **`Modal.jsx`**, **`Loader.jsx`**: Shared elements for standard UI interactions.
- **`utils/`**: Shared helper libraries (e.g. date formatters).
- **`hooks/`**: Shared hooks.

## Guidelines
- Components here should rely primarily on props. Do not couple them directly to specific feature states.
- If a component is only used within a single module (e.g. `PunchInButton` inside staff attendance), it belongs inside that module's `components/` directory.
