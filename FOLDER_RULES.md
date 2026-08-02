# Project Folder Rules & Guidelines

Welcome to the **Brain Stormers Attendance** codebase. To maintain code quality, scaling velocity, and clean separation of concerns, we enforce a strict modular architecture.

> [!IMPORTANT]
> All new features, additions, and refactoring MUST strictly follow this folder structure and the rules outlined below. Do not add ad-hoc root folders under `src/` or create modules outside of `src/modules/`.

---

## 📁 Directory Structure Diagram

```text
brain-stormers-attendance/
├── public/                     # Static assets accessible directly (manifest, icons, sw.js)
├── src/
│   ├── assets/                 # Global assets (images, logos, fonts, icons)
│   ├── config/                 # Core global configuration files (firebase.js, constants.js)
│   ├── contexts/               # Global state contexts (AuthContext, ThemeContext, etc.)
│   ├── hooks/                  # Global reusable React hooks (useLocalStorage, useOnlineStatus)
│   ├── pages/                  # Global/root pages (DashboardLayout, Login, PageNotFound)
│   ├── services/               # Global core API/Firebase backend adapters (authService, firestoreDb)
│   ├── styles/                 # Global styling rules, resets, CSS variables, and design tokens
│   ├── shared/                 # Shared widgets & logic reused across multiple modules
│   │   ├── components/         # Global shared components (Navbar, Sidebar, Button, Loader, Modal)
│   │   ├── utils/              # Reused utilities (formatters, basic validation helpers)
│   │   └── hooks/              # Shared helper hooks specific to layout or UI interactions
│   ├── modules/                # Feature Modules (Self-contained business domains)
│   │   ├── staff-attendance/   # Example Feature Module: Staff Attendance
│   │   │   ├── components/     # Widgets specific to this module (e.g. PunchInButton, AttendanceTable)
│   │   │   ├── pages/          # Screens specific to this module (e.g. StaffDashboard, HistoryScreen)
│   │   │   └── services/       # Module Firestore logic/calls (e.g. fetchRecords, punchTime)
│   │   └── [future-module]/    # Placeholders for future domains (student, teacher, etc.)
│   ├── App.jsx                 # App shell + root routing definition
│   └── main.jsx                # Web entrypoint (registers sw.js, mounts App)
├── FOLDER_RULES.md             # This rules guide
├── firebase.json               # Firebase SDK deployment configuration
├── package.json                # Project dependencies and script runner configurations
└── vite.config.js              # Vite compiler configuration
```

---

## 📜 Architectural Rules

### 1. Self-Containment of Modules
- Every feature domain (e.g. `staff-attendance`, `student-records`, `teacher-schedules`) must live inside a subfolder under `src/modules/`.
- A feature module **must** be modular and self-contained:
  - It maintains its own local `components/` for widgets exclusive to its domain.
  - It maintains its own local `pages/` for views belonging to its path.
  - It maintains its own local `services/` for direct domain logic (e.g., Firestore fetch/add queries).
- Modules should **never** import directly from the internal subfolders of other modules.
  - *Invalid:* `import PunchIn from '../staff-attendance/components/PunchIn'` inside `student-records`.
  - *Valid:* Move the common element to `src/shared/components/` and import from there.

### 2. The `shared` Directory
- The `src/shared/` directory is reserved for elements that are reused across **two or more** different modules.
- **`shared/components`** should contain atomic, presentation-heavy UI elements (e.g., custom Buttons, Modals, Loader animations) and global layouts (Navbar, Sidebar).
- **`shared/utils`** should house stateless helper utilities (e.g., date-time converters, string formatters, currency formatters).

### 3. Firebase Configuration & Services
- The global Firebase SDK app initialization lives in `src/config/firebase.js`.
- Core services like Authentication, global state watchers, and top-level databases reside in `src/services/`.
- Specific document query logic belongs to the respective `services/` folder inside the module requesting the data.

### 4. Style Guide
- All design system tokens (colors, margins, typography) are defined as CSS variables in `src/styles/variables.css` (or `src/styles/index.css`).
- Custom components should use CSS classes derived from these variables to maintain brand/UI consistency.
- Avoid styling directly inside JS/JSX code. Keep styles organized in `src/styles/` or scoped stylesheets.

---

## 🚀 How to Add a New Module (e.g., `student-attendance`)

1. Create a directory: `src/modules/student-attendance`.
2. Inside, create three standard subdirectories:
   - `components/`
   - `pages/`
   - `services/`
3. Add a module-level `README.md` explaining the domain's responsibility.
4. Mount the entry page(s) in `src/App.jsx` router tree.
