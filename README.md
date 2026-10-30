# Dolce Vita Salon and Spa

A full-stack salon appointment and operations system with a React/Vite client, Node.js/Express API, and MariaDB database.

## Technology

- React 18 and Vite 6
- Node.js and Express
- MariaDB
- JWT authentication and bcrypt password hashing
- Bootstrap 5 and Bootstrap Icons

## Local setup

### 1. Frontend

```bash
npm install
npm run dev
```

### 2. Database and API

1. Start MariaDB through XAMPP, MariaDB, or your preferred local database installation.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set your MariaDB credentials and replace `JWT_SECRET` with a long random value.
4. Install the API dependencies, create the database and tables, seed its starter data, then start the API:

```bash
cd backend
npm install
npm run seed
npm run dev
```

The API runs at `http://localhost:3001`. During development, Vite proxies `/api` and `/uploads` to the API.

## Demo accounts

`npm run seed` creates `dolcevia_db`, creates the MariaDB tables, adds the service catalogue, and creates the following accounts. All use password `password`.

- `admin@dolcevia.test` - Administrator / Owner
- `staff@dolcevia.test` - Order / Business Personnel
- `customer@dolcevia.test` - Customer

## Application features

- Public landing page and service catalogue
- Individual service details with prices, durations, and images
- Customer and staff registration
- Secure sign-in with role-aware redirects
- Role-based access control for Customer, Staff, and Administrator roles
- Customer appointment requests, appointment receipt, and support conversations
- Staff operations dashboard, appointment queue, and inquiry handling
- Administrator staff approval, service catalogue management, appointment records, sales records, and analytics views
- Service image uploads stored by the Express API

## Project structure

```text
src/
  main.jsx        React views, role-aware routing, and API-backed store
  api.js           API client and token handling
backend/
  src/             Express server, authentication, MariaDB queries, and seed script
  sql/schema.sql   MariaDB schema
  .env.example     API/database environment template
public/
  service-photos/  Service image library
```

## Security notes

- Never put MariaDB credentials in React source code or Vite environment variables.
- Keep `backend/.env` private; it is excluded from Git.
- The Express API enforces role permissions. Frontend route checks are only a user-interface convenience.
- For production, use HTTPS and move the JWT from browser storage to secure HTTP-only cookies.
