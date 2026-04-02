# 🚀 TaskFlow — Distributed Task Management System

> A production-grade, full-stack Jira-like task management platform with real-time collaboration, Kanban boards, team analytics, and secure role-based access.

---

## 🌐 Live Demo

| Service        | URL                                                                                |
| -------------- | ---------------------------------------------------------------------------------- |
| 🚀 Frontend    | [https://taskflow-app.vercel.app](https://taskflow-app.vercel.app)                 |
| ⚙️ Backend API | [https://taskflow-api.railway.app](https://taskflow-api.railway.app)               |
| 📄 API Health  | [https://taskflow-api.railway.app/health](https://taskflow-api.railway.app/health) |

---

## ✨ Key Highlights

* ⚡ Real-time collaboration using WebSockets (Socket.io)
* 🧠 Scalable MERN architecture (production-ready)
* 📊 Advanced analytics dashboard
* 🔐 Secure authentication (JWT + refresh tokens)
* 🏗️ Clean modular backend architecture
* 🎯 Optimized for performance & UX

---

## 🧩 Features

### 🔐 Authentication

* JWT access & refresh tokens
* Secure password hashing with bcrypt
* Token rotation & session management

### 👥 Team Management

* Create & manage teams
* Invite members via code
* Role-based access control:

  * Owner
  * Admin
  * Member
  * Viewer

### 📌 Task Management

* Full CRUD operations
* Subtasks, tags, priorities
* Story points & deadlines
* Task status tracking

### 📋 Kanban Board

* Drag & drop tasks
* Column-based workflow
* Real-time updates across users

### 🔄 Real-time Collaboration

* Live task updates
* Typing indicators
* Active user presence system

### 📊 Analytics Dashboard

* Task completion trends
* Priority & status breakdown
* Team productivity insights

### 🛡️ Security

* Rate limiting
* Helmet protection
* Input validation
* Secure API handling

---

## 🛠️ Tech Stack

### Backend

* Node.js + Express
* MongoDB + Mongoose
* Socket.io
* JWT Authentication
* Winston Logger
* Express Validator

### Frontend

* React 18 + Vite
* TailwindCSS
* Zustand (state management)
* TanStack Query
* Socket.io Client
* Axios
* React Router
* Framer Motion

---

## 📁 Project Structure

```
taskflow/
├── backend/
├── frontend/
└── docs/
```

---

## ⚡ Getting Started

### Prerequisites

* Node.js (v18+)
* MongoDB Atlas
* Git

### 🔧 Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Overview

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "timestamp": "..."
}
```

---

## 🔄 Real-time Events (Socket.io)

### Client → Server

* join:team
* typing:start
* typing:stop
* task:view

### Server → Client

* task:created
* task:updated
* task:deleted
* comment:added
* user:typing

---

## 🚀 Deployment

### Backend (Railway)

* Connect GitHub repo
* Add environment variables
* Auto deploy enabled

### Frontend (Vercel)

* Deploy via Vercel CLI
* Configure API & socket URLs

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: add feature"
git push origin feature/your-feature
```

---

## 📄 License

MIT License © 2026 TaskFlow

---

## 🌟 Show Your Support

If you like this project:

⭐ Star the repo
🍴 Fork it
📢 Share it

---

## 👩‍💻 Author

**Komatla Naga Lakshmi**
Final Year Engineering Student | MERN Developer | UI/UX Enthusiast

---

> Built with ❤️ for innovation, scalability, and real-world impact 🚀
