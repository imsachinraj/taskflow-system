# TaskFlow — Complete Build Guide, Resume Bullets & Interview Q&A

---

## PART 1: STEP-BY-STEP BUILD GUIDE

### Phase 1: Project Setup (Day 1)

```bash
# Clone / init
mkdir taskflow && cd taskflow
git init

# Backend
mkdir backend && cd backend
npm init -y
npm install express mongoose socket.io jsonwebtoken bcryptjs \
  cors helmet express-rate-limit express-validator \
  compression morgan dotenv winston uuid
npm install -D nodemon jest supertest eslint

# Frontend
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install axios @tanstack/react-query zustand socket.io-client \
  react-router-dom @hello-pangea/dnd framer-motion \
  react-hot-toast lucide-react date-fns clsx
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Phase 2: Backend Core (Days 2–4)

**Order of implementation:**
1. `src/config/database.js` — MongoDB connection
2. `src/utils/logger.js` — Winston logging
3. `src/utils/apiResponse.js` — Standard response shape
4. `src/models/User.js` — User schema with password hashing
5. `src/utils/jwt.js` — Token generation/verification
6. `src/middleware/authMiddleware.js` — JWT protection
7. `src/middleware/errorMiddleware.js` — Global error handler
8. `src/controllers/authController.js` + `src/routes/authRoutes.js`
9. `src/app.js` + `src/server.js`

**Test auth works:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test@1234"}'
```

### Phase 3: Team & Task APIs (Days 5–7)

1. `src/models/Team.js` — Team schema with role system
2. `src/models/Task.js` — Task schema with status history
3. `src/models/Comment.js` — Comment with reactions
4. `src/models/Activity.js` — Event log with TTL
5. `src/controllers/teamController.js`
6. `src/controllers/taskController.js`
7. `src/controllers/commentController.js`
8. All routes with validators

### Phase 4: Real-time (Day 8)

1. `src/sockets/index.js` — Socket.io server
2. Update `src/server.js` to use HTTP server + Socket.io
3. Emit events from task/comment controllers
4. Test with two browser tabs

### Phase 5: Frontend Core (Days 9–11)

**Order:**
1. `src/styles/globals.css` — Tailwind + CSS variables
2. `src/store/authStore.js` — Zustand with persist
3. `src/services/api.js` — Axios client with interceptors
4. `src/hooks/useSocket.js` — Singleton socket connection
5. `src/pages/LoginPage.jsx` + `RegisterPage.jsx`
6. `src/App.jsx` — Router setup
7. `src/components/common/AppLayout.jsx` — Sidebar
8. `src/pages/DashboardPage.jsx`

### Phase 6: Kanban Board (Days 12–13)

1. `src/components/common/Avatar.jsx`
2. `src/components/tasks/TaskCard.jsx`
3. `src/pages/BoardPage.jsx` — DnD + real-time
4. `src/components/tasks/CreateTaskModal.jsx`

### Phase 7: Remaining Pages (Days 14–15)

1. `src/pages/TaskDetailPage.jsx` — Comments + typing indicators
2. `src/pages/TeamPage.jsx` — Members + invite code
3. `src/pages/AnalyticsPage.jsx` — Charts
4. `src/pages/SettingsPage.jsx`

### Phase 8: Polish + Deploy (Days 16–17)

1. Add .gitignore, README.md
2. Test all flows end-to-end
3. Deploy backend to Railway
4. Deploy frontend to Vercel
5. Update CORS and env vars

---

## PART 2: RESUME DESCRIPTION

### Option A — Software Engineer (General)

**TaskFlow | Distributed Task Management System** *(Personal Project)*
`React.js · Node.js · MongoDB · Socket.io · JWT · REST API`

- Architected and shipped a full-stack Jira-like task management platform supporting real-time multi-user collaboration via Socket.io WebSockets, reducing perceived latency for status updates to < 100ms
- Designed a role-based access control system (Owner / Admin / Member / Viewer) with JWT + refresh token rotation, securing 15+ REST API endpoints against unauthorized access
- Engineered a Kanban board with drag-and-drop reordering using optimistic UI updates and bulk MongoDB writes, maintaining data consistency across concurrent users
- Built a MongoDB aggregation pipeline for team analytics, computing task completion trends, priority breakdowns, and overdue counts — results cached with TanStack Query (5-min stale time) to minimize DB load
- Implemented full-text search on tasks using MongoDB text indexes, and token auto-refresh with Axios interceptors and a queued retry mechanism for expired sessions

### Option B — Backend Focus

**TaskFlow | Node.js / MongoDB REST API** *(Personal Project)*

- Designed RESTful API with clean architecture (controllers → services → models), rate limiting, Helmet security headers, and structured Winston logging
- Built JWT authentication with refresh token rotation, bcrypt password hashing (salt rounds: 12), and automatic session invalidation on password change
- Modeled complex MongoDB schemas with virtual fields, compound indexes, text search, and TTL-based auto-expiry (Activity logs: 90-day retention)
- Implemented Socket.io server with JWT middleware for WebSocket authentication, room-based broadcasting for team isolation, and typing-indicator presence system

### Option C — Frontend Focus

**TaskFlow | React.js SPA** *(Personal Project)*

- Built a responsive single-page application with React 18, React Router v6, and TanStack Query v5 for server-state management with automatic background refetching
- Implemented real-time Kanban board with @hello-pangea/dnd drag-and-drop, optimistic UI updates, and Socket.io for live board synchronization across browser tabs
- Designed dark-themed component system using TailwindCSS custom layers, CSS variables, and reusable utility classes (card, btn-primary, input, badge)
- Built Axios interceptor chain for transparent JWT refresh — failed requests are queued, token is refreshed once, then all queued requests are replayed

---

## PART 3: INTERVIEW QUESTIONS & ANSWERS

### System Design Questions

**Q1: How would you scale TaskFlow to 1 million users?**

Answer breakdown:
- **Database:** Shard MongoDB by `teamId` (teams naturally isolate data). Add read replicas for analytics queries.
- **Socket.io:** Move from single-server to Redis Pub/Sub adapter — Socket.io supports this natively. Each server subscribes to Redis channels for team rooms.
- **API:** Horizontally scale Node.js behind a load balancer (Nginx or AWS ALB). Use PM2 cluster mode in the meantime.
- **Caching:** Add Redis for frequently-read data (team members list, user profiles). TTL = 5 minutes.
- **CDN:** Serve frontend assets from CloudFront/Vercel Edge.
- **Queue:** Use BullMQ (Redis-backed) for activity log writes — decouple from request lifecycle.

**Q2: Why MongoDB over PostgreSQL for this project?**

- Tasks have flexible schema (tags are arrays, meta is mixed type) — MongoDB handles this without migrations.
- The document model maps naturally: a Task embeds subtasks and statusHistory — no joins needed.
- However, for a banking-grade system I'd choose PostgreSQL for ACID transactions and foreign key integrity.
- TaskFlow uses Mongoose's schema validation to compensate for MongoDB's schemaless flexibility.

**Q3: Explain your authentication flow.**

1. User logs in → server returns `accessToken` (7d) + `refreshToken` (30d)
2. Both stored in Zustand with localStorage persistence
3. Every request attaches `Authorization: Bearer <accessToken>`
4. If 401 received: Axios interceptor pauses all in-flight requests, sends refresh token to `/auth/refresh`
5. New token pair returned → all queued requests replayed with new token
6. If refresh fails (expired/tampered): force logout, redirect to /login
7. On logout: refresh token nulled in DB so it can't be reused

**Q4: How does real-time work in TaskFlow?**

- Backend creates `http.createServer(app)` and passes it to `new Server(server)` (Socket.io)
- Socket.io authenticates via JWT in handshake `auth.token`
- Clients join `team:{teamId}` rooms after connecting
- When a task is updated via REST API, the controller calls `getIO().to('team:teamId').emit('task:updated', data)`
- All connected clients in that room receive the event and update TanStack Query cache directly — no refetch needed
- This means REST for writes, WebSocket for propagation = best of both worlds

---

### Technical Deep-Dive Questions

**Q5: What's the difference between `select: false` on the password field and manually excluding it?**

`select: false` means the field is never returned in query results unless you explicitly do `.select('+password')`. This is a defense-in-depth measure — even if you forget to exclude the password in a controller, it won't leak. We only select it in `login` and `changePassword`.

**Q6: How does your drag-and-drop maintain order consistency?**

Each task has an `order` field. On DnD end:
1. Optimistic update: React state immediately reorders the column array
2. Bulk update API call: `PATCH /tasks/bulk-update` with `[{ id, status, order }]` for affected tasks
3. MongoDB `bulkWrite` executes all updates in one round trip
4. If the bulk update fails, TanStack Query refetches and corrects the visual state

**Q7: Why use Zustand instead of Redux?**

- Zustand is ~1KB vs Redux Toolkit's ~11KB
- No boilerplate: no actions, reducers, or dispatchers
- The `persist` middleware handles localStorage in one line
- For a project this size, Zustand's simplicity is a better tradeoff
- Redux would be justified at 10+ engineers or highly complex state interactions

**Q8: Explain the asyncHandler wrapper pattern.**

```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```
Without it, every controller needs try/catch. With it, any thrown error or rejected promise automatically flows to the global `errorHandler` middleware. This keeps controllers clean and error handling centralized.

**Q9: What security vulnerabilities did you protect against?**

- **XSS**: React escapes JSX output by default; Helmet sets `X-XSS-Protection`
- **CSRF**: Not applicable for JWT (no cookies) — token must be explicitly sent in header
- **Brute force**: `express-rate-limit` on `/auth/login` — 10 attempts per 15 min
- **Injection**: Mongoose parameterizes all queries — no raw query strings
- **Sensitive data exposure**: `select: false` on password/refreshToken; `.env` never committed
- **Over-permissive CORS**: Explicit `origin` whitelist, not `*`

**Q10: How would you add notifications (email/push)?**

- Add a `Notification` model with `type, recipient, isRead, meta`
- On task assignment, due date approaching, or @mention: create a Notification document
- Emit `notification:new` via Socket.io to `user:{userId}` room
- For email: use a queue (BullMQ) + a worker that calls Resend/SendGrid API
- This decouples email sending from the request lifecycle — a slow SMTP server can't block API responses

---

## PART 4: 3 MORE STRONG PROJECT IDEAS

---

### Project 1: DevPulse — Real-time Code Review Platform
**Difficulty:** ⭐⭐⭐⭐ | **Impressiveness:** ⭐⭐⭐⭐⭐

**What it is:** A GitHub-integrated code review tool where teams can annotate pull requests, discuss inline, and track review velocity.

**Key technical challenges:**
- OAuth 2.0 with GitHub (real API integration — instantly impressive)
- Webhook consumer to receive GitHub PR events
- Real-time inline comment threads on diff hunks (collaborative like Google Docs)
- "Review velocity" analytics: time to first review, merge rate, reviewer workload

**Stack additions:** GitHub OAuth, webhooks, diff parsing, possibly a Monaco editor for syntax highlighting

**Why it stands out:** Shows API integration, OAuth, event-driven architecture, and domain knowledge of dev tools — exactly what companies like GitHub, GitLab, Atlassian, and every SaaS company want.

---

### Project 2: StreamSync — Collaborative Playlist & Watch Party App
**Difficulty:** ⭐⭐⭐⭐ | **Impressiveness:** ⭐⭐⭐⭐

**What it is:** A platform where groups create shared playlists (YouTube/Spotify via public APIs), watch/listen in sync, and chat live — like Discord Stage + Netflix Party.

**Key technical challenges:**
- Media sync algorithm: handle drift between clients using NTP-style offset calculation
- Leader election: who controls playback? (simple version: room creator; advanced: consensus)
- Rate-limited YouTube/Spotify API integration
- "Reactions" system (floating emoji animations, synchronized to timestamp)

**Stack additions:** YouTube/Spotify public APIs, WebRTC for P2P sync, Redis for room state

**Why it stands out:** Real-time sync problems are genuinely hard and interesting to explain in interviews. The media sync algorithm is a great whiteboard discussion.

---

### Project 3: VaultDocs — Encrypted Document Collaboration
**Difficulty:** ⭐⭐⭐⭐⭐ | **Impressiveness:** ⭐⭐⭐⭐⭐

**What it is:** An end-to-end encrypted document editor (like Notion + Notion's encryption) where documents are encrypted client-side — the server only stores ciphertext.

**Key technical challenges:**
- **Client-side encryption**: Web Crypto API (AES-256-GCM), key derived from user password (PBKDF2)
- **Key sharing**: Encrypt document key with each collaborator's public key (asymmetric, RSA-OAEP)
- **Operational Transform (OT) or CRDT** for real-time collaborative editing (simplified version: last-write-wins with version vectors)
- The server literally cannot read documents — demonstrate zero-trust architecture

**Stack additions:** Web Crypto API, possibly Y.js (CRDT library), subtle crypto, key management

**Why it stands out:** End-to-end encryption, cryptographic key management, and conflict-free collaborative editing are rare skills. This would genuinely impress senior engineers and is directly relevant to companies like 1Password, Notion, Linear, and any fintech.

---

## Summary Cheat Sheet

| Project | Core Wow Factor | Best For |
|---------|----------------|---------|
| TaskFlow (this) | Full-stack, real-time, RBAC, analytics | General SWE, backend, frontend roles |
| DevPulse | GitHub OAuth, webhooks, dev tooling | Developer tools companies |
| StreamSync | Media sync algorithm, real-time state | Gaming, media, social platforms |
| VaultDocs | E2E encryption, CRDT, zero-trust | Security-conscious companies, fintech |
