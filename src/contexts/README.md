# Contexts Directory (`src/contexts/`)

This directory houses React Context providers that manage global application state.

## Suggested Contents

- **`AuthContext.jsx`**: (Future addition) Handles user sign-in session state, permissions, token expirations, and Firestore-based role lookups.
- **`ThemeContext.jsx`**: (Future addition) Manages dark/light toggles and layout preferences.

## Guidelines
- Contexts should be kept thin. Minimize expensive computations inside Context providers to prevent component re-render loops.
- Module-specific state should be handled inside module boundaries or hooks; do not pollute global contexts with single-module fields.
