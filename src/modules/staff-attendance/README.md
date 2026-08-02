# Staff Attendance Module (`src/modules/staff-attendance/`)

This module manages daily check-ins, check-outs, leave applications, and logs for coaching center staff members.

## Directory Elements

- **`components/`**: Widgets specific to staff dashboard cards, clock interfaces, or filters.
- **`pages/`**:
  - `StaffDashboard.jsx`: Base entry-point page for logging attendance logs.
- **`services/`**: (Future addition) Functions querying the `/staff_attendance` and `/staff_profiles` Firestore collections.

## Guidelines
- Do not import components or files from other feature modules (such as `student-portal`).
- Reuse elements like layouts, buttons, and notifications from `src/shared/`.
