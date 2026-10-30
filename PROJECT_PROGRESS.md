# Dolce Vita Salon and Spa — Project Status

## Current implementation

This repository contains a React/Vite front-end prototype for a salon appointment and operations system. It uses browser `localStorage` to demonstrate application data, authentication state, role access, appointments, support inquiries, sales records, and service management.

## Completed

- Public landing page and service catalogue
- Service detail pages with pricing, duration, and images
- Customer, staff, and administrator role-based navigation and route protection
- Customer and staff registration flows
- Administrator approval flow for staff registrations
- Customer appointment booking, appointment history, and printable receipt
- Customer support conversation workspace
- Staff operations dashboard, analytics, appointment queue, and inquiry workspace
- Administrator business dashboard, analytics, sales records, appointment records, service catalogue, inquiry records, and staff approval list
- 47 service images placed in `public/service-photos/`
- Production build verified with `npm run build`

## Important limitation

The project is a client-side demonstration. It does not currently connect to an API, database, payment gateway, or production authentication provider. Resetting browser storage resets the demonstration data.

