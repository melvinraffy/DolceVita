# Dolce Vita Salon and Spa

A React single-page prototype for Dolce Vita Salon and Spa. It provides a public service catalogue, role-based workspaces, appointment-request flow, customer support conversations, and service management views.

## Technology

- React 18
- Vite 6
- Bootstrap 5 and Bootstrap Icons loaded from the application HTML
- Browser `localStorage` for demonstration data and session state

## Run locally

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
npm install
npm run dev
```

Vite will display the local development URL in the terminal.

### Production build

```bash
npm run build
npm run preview
```

## Application features

- Public landing page and service catalogue
- Individual service details with prices, durations, and service images
- Customer registration and sign-in
- Staff registration with administrator approval requirement
- Role-based redirects and protected pages for three user roles:
  - **Customer** — personal overview, appointment booking, appointment receipts, and support conversations
  - **Order / Business Personnel** — operations dashboard, workload analytics, appointment queue, and inquiry handling
  - **Administrator / Owner** — business overview, owner analytics, sales records, appointment records, service catalogue management, inquiry records, and staff approval
- Appointment request flow with selected services, date/time selection, estimated price, and printable receipt
- Service image library in `public/service-photos/`

## Demo data

This project stores its demonstration users, services, appointments, sales, and inquiries in browser `localStorage`. Data is specific to the browser profile in which the application runs.

To reset the demo data, clear the site storage in your browser's developer tools, then reload the app.

## Project structure

```text
src/
  main.jsx        Application routes, role access, views, and demo data
  app.css         Application-specific styles
public/
  css/            Shared interface styles
  service-photos/ Service images used by the catalogue
index.html         Vite entry page and external style links
```

## Notes

- This is a front-end demonstration application; it does not include a server, database, or production authentication system.
- Service photographs are illustrative assets supplied for the project and are not photographs of Dolce Vita Salon itself.

