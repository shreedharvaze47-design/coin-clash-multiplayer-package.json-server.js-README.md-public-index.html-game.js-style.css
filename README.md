# Coin Clash — Real-Time Multiplayer Game

A simple two-player browser game built with Node.js, Express and Socket.IO.

## Requirements

- Node.js 18+
- A hosting service that supports a long-running Node.js server and WebSockets

## Run locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

For local testing, open the same URL in two browser tabs/windows and use the same room code.

## Game rules

- Two players join from separate devices.
- The host creates a room and shares the 4-character room code.
- Both players move with WASD/arrow keys or the on-screen controls.
- Collect the gold coin for 1 point.
- First to 10 points wins.
- If 60 seconds expire first, the player with more points wins.
- The game server is authoritative for movement, scoring, room state and the timer.

## Deploy

This is deployment-ready for a Node-compatible host such as Render, Railway, Fly.io, or a VPS.

Use:

```text
Build command: npm install
Start command: npm start
```

The server reads the host's `PORT` environment variable.

After deployment, share the HTTPS URL with a friend. They can open it on another phone/computer and join using the room code.

## Important

Do not put the game behind a static-only hosting service unless it also provides a WebSocket-capable backend. The Socket.IO server must remain reachable for real-time multiplayer.
