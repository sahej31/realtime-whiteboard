# Realtime Whiteboard (Yjs + y-websocket, free & open-source)

A from-scratch, interview-ready realtime whiteboard showcasing **CRDT-based sync (Yjs)**, **presence/awareness**, and **WebSockets**. Everything here is free/open-source (MIT). No vendor lock-in, tiny footprint, and easy to deploy.

## Features
- **CRDT sync** with [Yjs]
- **WebSocket transport** via [y-websocket]
- **Presence** (cursor + username) using Yjs Awareness
- **Live drawing** with per-user color
- **Room-based** collaboration (URL param `?room=demo`)
- **Single-process deployment** (Node.js) with static hosting of the client
- **Docker** and **docker-compose** included

> Why CRDT? Conflict-free replicated data types let clients apply operations locally (low latency) and converge automatically without a central lock. Great talking point for SDE/system-design interviews.

## Tech Stack
- **Client:** Vanilla JS + HTML Canvas, [Yjs], [y-websocket] client, [y-protocols/awareness]
- **Server:** Node.js + Express static hosting + [y-websocket] (WebSocket server)
- **Infra:** Docker + docker-compose (optional)

## Quickstart (Local)

### 1) Node.js install
- Install **Node 18+** and **npm**

### 2) Install & run server
```bash
cd server
npm install
npm run start
```
Server starts at **http://localhost:3000** and WebSocket endpoint at `ws://localhost:3000/ws`.

### 3) Open the client
Open **http://localhost:3000** in 2+ tabs. You should see each other's cursors and drawings.
- Rooms: `http://localhost:3000/?room=demo`
- Default room: `lobby`

### 4) Docker (optional)
```bash
docker compose up --build
# open http://localhost:3000
```

## Repo Layout
```
realtime-whiteboard/
├── README.md
├── LICENSE (MIT)
├── docker-compose.yml
├── server/
│   ├── package.json
│   └── index.js
└── client/
    ├── index.html
    ├── main.js
    └── styles.css
```

## Design Notes (useful for interviews)
- **CRDT (Yjs Doc)**: We store drawing **strokes** in a `Y.Array('strokes')`. Each stroke is an object `{ id, color, size, points }`.
- **Transport**: `y-websocket` handles message relay & awareness. We run it alongside an Express app that serves static files.
- **Presence/Awareness**: Each client shares a username/color and cursor coords; awareness is kept out of the CRDT so it doesn't pollute the doc's persistent state.
- **Durability**: This demo keeps data in-memory (easy to run). For persistence, swap in y-leveldb or periodically snapshot the Yjs state.
- **Scaling**: Shard by **room key** across ws instances; add a pub/sub backbone (e.g., Redis) to fan out awareness and updates across instances. Sticky sessions help keep a user in the same shard. Terminate TLS at a reverse proxy. For multi-region, consider region-pinned rooms; CRDT will still converge across regions, but you’ll want geo-affinity for latency and cost.

## MIT License?
MIT is a very permissive license that: 
- Allows usage, modification, distribution, even commercially
- Requires preserving the license & copyright notice
- Provides software **as-is** without warranty

This repo is MIT. See `LICENSE`.

---

**Attribution:** This app uses the excellent open-source packages [Yjs] and [y-websocket].

[Yjs]: https://github.com/yjs/yjs
[y-websocket]: https://github.com/yjs/y-websocket
