# Dolce Vita Salon and Spa - Project Status

## Current implementation

The project now includes a React/Vite frontend, a Node.js/Express REST API, and a MariaDB schema/seed script. The role-based interface is being migrated from browser-only demonstration state to API-backed data.

## Completed backend foundation

- Express API under `backend/`
- MariaDB schema for users, service categories, services, appointments, appointment items, appointment history, sales, inquiries, and inquiry messages
- Bcrypt password hashing, JWT authentication, and server-side Customer, Staff, and Administrator authorization
- Customer/staff registration with administrator approval requirement for staff accounts
- Public catalogue and role-aware bootstrap endpoints
- Appointment creation with backend availability validation
- Staff appointment status processing and sales recording
- Customer and staff inquiry messaging endpoints
- Administrator staff approval, sales/appointment/inquiry records, and service management with image uploads
- MariaDB seed script with the service catalogue and three demo accounts

## Frontend integration completed

- API-backed catalogue loading
- API-backed sign-in, registration, token session restoration, and role-aware bootstrap loading
- API-backed customer appointment submission
- API-backed administrator service creation/editing and staff approval

## Local validation

- Backend JavaScript syntax validation passed
- Frontend production build passed

## Required local setup

1. Start MariaDB.
2. Copy `backend/.env.example` to `backend/.env` and enter database credentials plus a secure JWT secret.
3. Run `cd backend`, `npm install`, `npm run seed`, and `npm run dev`.
4. Run `npm run dev` from the repository root for the frontend.

MariaDB was not available through the command line in this workspace, so live database creation and seeding must be performed after MariaDB is started locally.

