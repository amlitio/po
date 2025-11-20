# PO Request System

Simple, self-hosted **Purchase Order (PO) request + approval** system.

- Frontend: Server-rendered HTML using **EJS + Bootstrap**
- Backend: **Node.js + Express**
- Database: **SQLite** (via `better-sqlite3`)
- Admin panel protected with a simple `ADMIN_KEY`

Perfect as a lightweight internal tool for teams that need
PO numbers on every vendor invoice.

---

## 1. Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Configure environment

Copy the example file and edit it:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `ADMIN_KEY` – a shared secret key for accessing `/admin`
- `PORT` – port to run the app on (default: 3000)

Example:

```env
ADMIN_KEY=SuperSecret123
PORT=3000
```

### Run the app

```bash
npm start
```

Then open:

- **New PO Request Form** – http://localhost:3000/request  
- **Admin Panel** – http://localhost:3000/admin?key=YOUR_ADMIN_KEY

Replace `YOUR_ADMIN_KEY` with the value you set in `.env`.

---

## 2. How It Works

### PO Number Format

New requests automatically get a PO number like:

```
ADL-YYYYMMDD-###
```

Example: `ADL-20251120-001`

- `YYYYMMDD` – date of request
- `###` – sequence for that day (001, 002, 003, ...)

### Request Fields

The request form collects:

- Requester Name (required)
- Requester Email (optional)
- Division (required) – FL, GA ROOF, OK, GA SAV, OTHER
- Vendor Name (required)
- Description of Purchase (required)
- Estimated Amount (required, numeric)

### Status Flow

Each PO request has a `status`:

- `PENDING` – newly created
- `APPROVED` – set from admin panel
- `REJECTED` – set from admin panel

---

## 3. Admin Panel

Go to:

```text
/admin?key=YOUR_ADMIN_KEY
```

You will see a table with:

- PO #  
- Requester name & email  
- Division  
- Vendor  
- Amount  
- Status  
- Created timestamp  

Buttons allow you to **Approve** or **Reject** requests.  
The status updates immediately in the database.

> You can share approved PO numbers with your AP team and vendors.

---

## 4. Deploying

You can run this:

- On a small Linux server (Ubuntu, etc.)
- On any Node-friendly PaaS (Render, Railway, etc.)

Basic steps for a typical server:

1. Copy project files to server
2. Run `npm install`
3. Set `.env` with secure `ADMIN_KEY`
4. Use `pm2` or similar to run `npm start` as a service
5. Put Nginx/Apache in front if you need HTTPS

---

## 5. Next Steps / Customization

- Hook up email notifications when new POs are created
- Restrict access to `/request` by IP range or SSO
- Add more divisions, custom PO prefix, or job numbers
- Add export to CSV for your AP / accounting system

You can also connect this app to Zapier, Make, or a custom script
to push approved POs into your accounting system (e.g., Xero, QuickBooks).
