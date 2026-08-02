# Modules Directory (`src/modules/`)

This directory is the core of our feature-based architecture. All business domains (e.g. staff attendance, student check-ins) live here as self-contained feature modules.

## Architecture

Each folder inside `modules/` represents a single business capability and must follow this folder pattern:

```text
[feature-name]/
├── components/    # Components exclusive to this feature
├── pages/         # View screens exclusive to this feature
├── services/      # Logic, API adapters, or Firestore calls exclusive to this feature
└── README.md      # Purpose and structural overview of this module
```

## Current Modules

- **`staff-attendance/`**: (Available) Module tracking clock-ins/outs for administrative and lecture staff.

## Adding Future Modules
To add a new feature domain (e.g. `student-records` or `teacher-schedules`), follow the template above and map its routes inside `src/App.jsx`. Refer to `FOLDER_RULES.md` for specific boundary rules.
