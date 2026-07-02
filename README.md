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
```

---

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

```bash
cd backend
npm install
npm start
```

### Frontend Setup

```bash
cd ..
npm install
npm run dev
```

---

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