# Config Directory (`src/config/`)

This directory houses static configuration assets, global constants, client initializers, and theme configuration parameters.

## Directory Elements

- **`firebase.js`**: Initializes the Firebase Web SDK for the app by pulling values from environment variables (`.env`).
- **`constants.js`**: (Create when needed) Global configuration rules, paging limits, and system variables.

## Guidelines
- Do not store user details or volatile application state here.
- Any secrets/keys must be declared in `.env` variables and referenced through `import.meta.env`.
