# Hooks Directory (`src/hooks/`)

This directory is reserved for global, reusable custom React hooks.

## Potential Hooks
- **`useAuth.js`**: Shortcut for consuming `AuthContext`.
- **`useLocalStorage.js`**: Key-value getter/setter bound to React state.
- **`useOnlineStatus.js`**: Watcher tracking PWA offline/online triggers.

## Guidelines
- Custom hooks should always prefix their name with `use` (e.g. `useMyHook`).
- Ensure hooks do not hold global singletons; if they rely on context providers, place the context definition in `src/contexts/`.
