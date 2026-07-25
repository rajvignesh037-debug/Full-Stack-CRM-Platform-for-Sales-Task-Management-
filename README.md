<<<<<<< HEAD
# Health_Care_CRM Platform

![Version](https://img.shields.io/badge/version-2.1.0-indigo)
![Stack](https://img.shields.io/badge/stack-React--Node--PostgreSQL-blue)

DigiGoPartner is a comprehensive enterprise CRM and Operations Management platform designed to bridge the gap between sales lead management and technical execution. Originally developed as **HealthCRM**, the platform has evolved into a multi-functional system that handles healthcare lead conversion alongside specialized technical team workflows.

---

## ⚠️ Important: Naming Conventions & Legacy Context  hello manikanta

To maintain architectural integrity, developers must be aware of the following naming discrepancies between the frontend and backend:

| Context | Backend/Database Reference | Frontend/UI Branding |
| :--- | :--- | :--- |
| **Project Name** | `Health _care_CRM` / `healthcare_crm` |
| **User Role** | `intern` | `Employee` / `Intern` |
| **Groups** | `Group 1-5` (Legacy) | `Sales` & `Technical` |

> [!IMPORTANT]
> Do NOT rename `intern` references in the backend API or Database without a full system migration, as it will break core authentication and relational logic.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS (Modern, Responsive UI)
- **State Management**: React Context API (`AppContext`)
- **Routing**: React Router v6
- **Data Fetching**: Axios with global interceptors

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer (Local Storage)

---

## 🏗️ Architecture & Data Flow

DigiGoPartner uses a **Monolithic Backend + Decoupled Frontend** architecture.

1.  **Authentication Flow**: Users log in via `/api/auth/login`. A JWT is issued and stored in `localStorage`. Global interceptors in `api.js` automatically attach the token to all subsequent requests.
2.  **Real-Time Synchronization**: The system utilizes a **Polling Mechanism** (15-30 second intervals) managed via `useEffect` hooks in the frontend. This ensures that:
    -   Unread notification counts are always accurate.
    -   Dashboard statistics stay updated without manual refreshes.
    -   Technical task statuses and comments sync across admin and employee views.
3.  **State Management**: `AppContext.jsx` serves as the single source of truth for user sessions, unread counts, and global data arrays (leads, demos, activities).

---

## 📦 Module Breakdown

### 1. Admin Dashboard
The master control center providing high-level analytics for both Sales and Technical operations. Admins can manage users, oversee all leads, and track global performance.

### 2. Sales CRM (Employee View)
Designed for the sales team to manage the lead lifecycle:
-   **Lead Management**: Track and status leads (e.g., `Not Contacted`, `Demo Scheduled`).
-   **Demo Tracker**: Schedule and manage product demonstrations.
-   **Converted Leads**: View performance reports on successful conversions.

### 3. Technical Team (Operations)
A specialized task management system for non-sales employees:
-   **Task Assignment**: Admins assign technical tasks with priority levels and due dates.
-   **Resource Sharing**: Support for file attachments, image pasting, and external resource links.
-   **Review Queue**: A strict workflow where interns submit work for admin approval.

### 4. Global Inbox & Notification System
A centralized messaging hub that tracks:
-   New task assignments.
-   Demo scheduling alerts.
-   Feedback/Comments on technical tasks.
-   Per-notification "Read/Unread" tracking.

---

## 🛠️ Technical Team Workflow

The platform enforces a structured operations flow to ensure quality control:

1.  **Todo**: Newly assigned tasks.
2.  **Ongoing**: Tasks currently being worked on by the employee.
3.  **Review**: The "Locked" state. Once an intern submits a task for review, they can no longer edit it.
4.  **Completed**: Admins review the work and mark it as completed, or send it back to "Ongoing" with feedback.

---

## 📂 Folder Structure

```text
Health_care_crm/
├── backend/                # Express Server & API Logic
│   ├── config/             # DB (PostgreSQL) & App Configs
│   ├── middlewares/        # JWT Auth & Upload Middlewares
│   ├── repositories/       # Raw SQL Queries & Data Access
│   ├── routes/             # API Endpoints (Auth, Leads, Tech, etc.)
│   ├── services/           # Business Logic & Notifications
│   ├── uploads/            # Local storage for task attachments
│   └── server.js           # Entry Point
├── src/                    # React Frontend
│   ├── components/         # Reusable UI (Sidebar, ProtectedRoutes)
│   ├── context/            # Global State (AppContext)
│   ├── layouts/            # Page Wrappers (DashboardLayout)
│   ├── pages/              # Module-specific Views (Admin, MyTasks, etc.)
│   ├── services/           # API Client (api.js)
│   └── main.jsx            # Entry Point
└── package.json            # Dependencies & Scripts
=======
# DigiGoPartner CRM Platform

A full-stack Customer Relationship Management (CRM) and Operations Management platform built to streamline sales lead management, technical task execution, and team collaboration. The platform integrates secure authentication, lead tracking, role-based access control, real-time synchronization, and workflow automation into a single scalable application.

---

## 🚀 Features

### Sales CRM
- Lead creation and management
- Lead status tracking
- Demo scheduling and management
- Converted lead reporting
- Sales performance dashboard

### Technical Operations
- Task assignment and tracking
- Priority and deadline management
- File attachment support
- Review and approval workflow
- Employee progress monitoring

### Dashboard
- Role-based dashboards
- Real-time statistics
- Notification management
- Activity monitoring

### Authentication & Security
- JWT-based Authentication
- Role-Based Access Control (RBAC)
- Protected Routes
- Secure REST APIs

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router
- Context API
- Axios

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Multer

---

## 📌 Key Features

- Full-stack CRM platform with Sales and Technical modules
- Secure JWT authentication and RBAC implementation
- RESTful APIs for lead, task, notification, and user management
- PostgreSQL relational database integration
- Real-time dashboard synchronization using polling
- Responsive user interface with Tailwind CSS
- File upload and attachment support
- Notification and messaging system
- Modular and scalable project architecture

---

## 🏗️ System Architecture

```
React.js Frontend
        │
        ▼
Express.js REST APIs
        │
        ▼
Business Logic Layer
        │
        ▼
PostgreSQL Database
>>>>>>> 25c7421f1c5acada464569fb48778524458603dc
```

---

<<<<<<< HEAD
## 🗄️ Database Overview (PostgreSQL)

The system relies on a relational schema with the following core tables:
-   `users`: Stores all accounts (Admin/Intern), roles, and group associations.
-   `leads`: Primary sales data.
-   `demos`: Scheduled demonstrations linked to leads and interns.
-   `tech_tasks`: Operational tasks with status tracking and file arrays.
-   `notifications`: Per-user alerts for system activities.
-   `tech_task_comments`: Threaded discussions for technical tasks.

---

## ⚙️ Environment Setup

### Backend `.env` Requirements
```env
PORT=5000
PGUSER=your_user
PGHOST=your_host
PGDATABASE=healthcare_crm
PGPASSWORD=your_password
PGPORT=5432
JWT_SECRET=your_secure_random_string
```

### Frontend Environment
The frontend expects `VITE_API_URL` to point to the backend server (default: `http://localhost:5000/api`).

---

## 🚀 Installation & Running

### 1. Database Setup
Ensure PostgreSQL is running and create a database named `healthcare_crm`. The schema will auto-initialize on the first server run via `backend/config/db.js`.

### 2. Backend Setup
=======
## 📂 Project Structure

```
digigo-care-partner/
│
├── backend/
│   ├── config/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   └── server.js
│
├── src/
│   ├── components/
│   ├── context/
│   ├── layouts/
│   ├── pages/
│   ├── services/
│   └── main.jsx
│
├── package.json
└── README.md
```

---

## 🗄️ Database Modules

- Users
- Leads
- Demos
- Technical Tasks
- Notifications
- Task Comments

---

## 🔄 Workflow

### Sales Workflow

```
Lead Creation
      │
      ▼
Lead Assignment
      │
      ▼
Demo Scheduling
      │
      ▼
Lead Conversion
```

### Technical Workflow

```
Task Assignment
      │
      ▼
Ongoing
      │
      ▼
Review
      │
      ▼
Completed
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/DigiGoPartner.git
cd DigiGoPartner
```

### Backend Setup

>>>>>>> 25c7421f1c5acada464569fb48778524458603dc
```bash
cd backend
npm install
npm start
```

<<<<<<< HEAD
### 3. Frontend Setup
=======
### Frontend Setup

>>>>>>> 25c7421f1c5acada464569fb48778524458603dc
```bash
cd ..
npm install
npm run dev
```

---

<<<<<<< HEAD
## 📝 Future Developer Notes
-   **Optimistic UI**: When marking notifications as read, the UI decrements the count locally before the next poll to ensure a lag-free experience.
-   **Task Locking**: The `Review` status in `MyTasks.jsx` is intentionally restrictive to prevent data inconsistency during admin audits.
-   **Polling**: Be cautious when decreasing polling intervals, as it may increase server load significantly under high concurrent user counts.

---
© 2026 Health_care_crm. All rights reserved.
=======
## 🔑 Environment Variables

### Backend (.env)

```env
PORT=5000
PGUSER=your_username
PGHOST=localhost
PGDATABASE=healthcare_crm
PGPASSWORD=your_password
PGPORT=5432
JWT_SECRET=your_secret_key
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📊 Core Modules

- Authentication & Authorization
- Admin Dashboard
- Sales CRM
- Technical Task Management
- Lead Management
- Demo Scheduling
- Notification System
- Employee Management
- File Upload System
- Activity Tracking

---

## ✨ Highlights

- Built using React.js, Express.js, and PostgreSQL
- Implemented JWT Authentication with Role-Based Access Control (RBAC)
- Developed 25+ RESTful API endpoints
- Managed 500+ sales leads through an integrated CRM system
- Implemented real-time dashboard synchronization using polling
- Designed responsive and modern UI using Tailwind CSS
- Modular architecture supporting scalable enterprise applications

---

## 🔮 Future Enhancements

- WebSocket-based real-time communication
- Email notifications
- SMS integration
- Advanced analytics dashboard
- Cloud storage integration
- Docker deployment
- CI/CD pipeline
- Report generation

---

## 📄 License

This project is developed for educational and enterprise application purposes.

---

© 2026 DigiGoPartner CRM Platform. All Rights Reserved.
>>>>>>> 25c7421f1c5acada464569fb48778524458603dc
