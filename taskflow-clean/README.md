# TaskFlow — Distributed Task Management System

> A production-grade, full-stack Jira-like task management platform with real-time collaboration, Kanban boards, and team analytics.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-010101?logo=socket.io)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://taskflow-app.vercel.app |
| Backend API | https://taskflow-api.railway.app |
| API Docs | https://taskflow-api.railway.app/health |

---

## Features

- **Authentication** — JWT access + refresh token rotation, bcrypt password hashing
- **Team Management** — Create teams, invite via code, role-based access (Owner / Admin / Member / Viewer)
- **Kanban Board** — Drag-and-drop with `@hello-pangea/dnd`, real-time updates via Socket.io
- **Task Management** — Full CRUD, subtasks, story points, tags, due dates, priority levels
- **Real-time Collaboration** — Live task updates, typing indicators, presence system
- **Activity Feed** — Auto-expiring (90-day TTL) event log for every team action
- **Analytics Dashboard** — Status/priority breakdowns, 30-day completion trend
- **Security** — Helmet, rate limiting, input validation, CORS, parameterized queries

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database + ODM |
| Socket.io | Real-time WebSocket layer |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| express-validator | Input validation |
| Winston | Structured logging |
| Helmet + cors | Security headers |
| express-rate-limit | Brute-force protection |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| TailwindCSS | Utility-first styling |
| Zustand + persist | Global state + localStorage |
| TanStack Query v5 | Server state, caching, sync |
| @hello-pangea/dnd | Drag-and-drop Kanban |
| Socket.io-client | Real-time client |
| Axios | HTTP client with interceptors |
| React Router v6 | Client-side routing |
| Framer Motion | Animations |
| react-hot-toast | Toast notifications |

---

## Project Structure

```
taskflow/
├── backend/
│   └── src/
│       ├── config/         # DB connection, migrations
│       ├── controllers/    # Request handlers (auth, task, team, comment, activity)
│       ├── middleware/      # Auth guard, error handler, async wrapper
│       ├── models/         # Mongoose schemas (User, Team, Task, Comment, Activity)
│       ├── routes/         # Express routers
│       ├── services/       # Business logic layer
│       ├── sockets/        # Socket.io server + event handlers
│       ├── utils/          # JWT, logger, API response helpers
│       ├── validators/     # express-validator rule sets
│       ├── app.js          # Express app setup
│       └── server.js       # HTTP server + Socket.io init
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── auth/       # Login/Register forms
│       │   ├── common/     # AppLayout, Avatar, Modal base
│       │   ├── tasks/      # TaskCard, CreateTaskModal, TaskDetail
│       │   └── teams/      # CreateTeamModal, JoinTeamModal
│       ├── hooks/          # useSocket (persistent singleton)
│       ├── pages/          # Dashboard, Board, TaskDetail, Analytics, Settings
│       ├── services/       # Axios API client with interceptors
│       ├── store/          # Zustand auth store with persistence
│       └── styles/         # Tailwind globals + component classes
│
└── docs/
    └── API.md              # Full API documentation
```

---

## Database Schema

### User
```
_id, name, email, password (hashed), avatar, role,
teams[], isActive, lastSeen, refreshToken, timestamps
```

### Team
```
_id, name, description, slug (auto), owner,
members[{ user, role, joinedAt }],
inviteCode, inviteCodeExpires, settings, timestamps
```

### Task
```
_id, title, description, status, priority, team,
createdBy, assignees[], dueDate, completedAt,
tags[], subtasks[], order, storyPoints,
statusHistory[{ from, to, changedBy, changedAt }],
isArchived, timestamps
```

### Comment
```
_id, content, task, author, parentComment,
mentions[], isEdited, editedAt, isDeleted,
reactions[{ emoji, user }], timestamps
```

### Activity
```
_id, type, actor, team, task, meta{},
createdAt (TTL: 90 days)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Git

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, etc.

npm install
npm run dev
# API runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## API Overview

All endpoints return:
```json
{ "success": true, "message": "...", "data": {...}, "timestamp": "..." }
```

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register |
| POST | `/api/v1/auth/login` | — | Login |
| POST | `/api/v1/auth/refresh` | — | Refresh tokens |
| POST | `/api/v1/auth/logout` | ✓ | Logout |
| GET | `/api/v1/auth/me` | ✓ | Current user |
| GET | `/api/v1/teams` | ✓ | My teams |
| POST | `/api/v1/teams` | ✓ | Create team |
| POST | `/api/v1/teams/join` | ✓ | Join via invite |
| GET | `/api/v1/tasks?teamId=` | ✓ | Get tasks |
| POST | `/api/v1/tasks` | ✓ | Create task |
| PATCH | `/api/v1/tasks/:id` | ✓ | Update task |
| PATCH | `/api/v1/tasks/bulk-update` | ✓ | Drag-and-drop |
| GET | `/api/v1/tasks/analytics` | ✓ | Team analytics |
| GET | `/api/v1/comments?taskId=` | ✓ | Task comments |
| POST | `/api/v1/comments` | ✓ | Add comment |

---

## Socket.io Events

| Event (Client → Server) | Payload | Description |
|--------------------------|---------|-------------|
| `join:team` | `teamId` | Subscribe to team updates |
| `typing:start` | `{ taskId, teamId }` | Broadcast typing |
| `typing:stop` | `{ taskId, teamId }` | Stop typing |
| `task:view` | `{ taskId, teamId }` | Presence |

| Event (Server → Client) | Description |
|--------------------------|-------------|
| `task:created` | New task broadcast |
| `task:updated` | Task changed |
| `task:deleted` | Task removed |
| `comment:added` | New comment |
| `user:typing` | Typing indicator |
| `team:member_joined` | New member |

---

## Deployment

### Backend → Railway

```bash
# 1. Push to GitHub
# 2. Create new project on railway.app
# 3. Connect repo → select /backend
# 4. Add environment variables from .env.example
# 5. Railway auto-deploys on push
```

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel deploy --prod
# Set VITE_API_URL=https://your-railway-app.railway.app/api/v1
# Set VITE_SOCKET_URL=https://your-railway-app.railway.app
```

### MongoDB → Atlas (Free Tier)

1. Create cluster at cloud.mongodb.com
2. Create database user
3. Whitelist `0.0.0.0/0` for Railway IPs
4. Copy connection string to `MONGODB_URI`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

MIT © 2024 TaskFlow
