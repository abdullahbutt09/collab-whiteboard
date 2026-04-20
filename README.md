# CollabBoard - Realtime Collaborative Whiteboard

CollabBoard is a full-stack collaborative whiteboard app with room-based realtime drawing.

## Stack
- Frontend: React + Vite + Zustand + Tailwind CSS + Canvas API
- Backend: Node.js + Express + Socket.io + Mongoose
- Database: MongoDB (with in-memory fallback when Mongo is unavailable)

## Features Implemented
- Create and join rooms
- Realtime drawing sync (pencil, rectangle, line)
- Eraser and element move interactions
- Live cursor tracking
- Undo / Redo with sync
- Clear canvas
- Save / load canvas state via REST API
- Room and canvas APIs

## Project Structure
- `client/` React app
- `server/` Express + Socket.io server

## Run Locally
### 1) Install dependencies
```bash
cd client && npm install
cd ../server && npm install
```

### 2) Configure environment
- Client: copy `.env.example` to `.env`
- Server: copy `.env.example` to `.env`
- Set `MONGO_URI` in `server/.env` (optional if running in-memory mode)

### 3) Start backend
```bash
cd server
npm run dev
```

### 4) Start frontend
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in multiple browser tabs to test collaboration.

## API Endpoints
- `POST /api/room/create`
- `GET /api/room/:roomId`
- `POST /api/canvas/save`
- `GET /api/canvas/:roomId`

## Socket Events
Client to server:
- `JOIN_ROOM`
- `DRAW`
- `UPDATE_ELEMENT`
- `DELETE_ELEMENT`
- `CURSOR_MOVE`
- `CLEAR_CANVAS`
- `UNDO`
- `REDO`

Server to client:
- `USER_JOINED`
- `USER_LEFT`
- `SYNC_DRAW`
- `SYNC_UPDATE`
- `SYNC_DELETE`
- `SYNC_CURSOR`
- `SYNC_CLEAR`
