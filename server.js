const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const BOARD = { width: 900, height: 520 };
const WIN_SCORE = 10;
const MATCH_SECONDS = 60;

function randomCoin() {
  return {
    x: Math.floor(60 + Math.random() * (BOARD.width - 120)),
    y: Math.floor(90 + Math.random() * (BOARD.height - 150))
  };
}

function makeRoom(code) {
  return {
    code,
    players: new Map(),
    coin: randomCoin(),
    scores: {},
    started: false,
    ended: false,
    timeLeft: MATCH_SECONDS,
    timer: null
  };
}

function publicState(room) {
  return {
    code: room.code,
    players: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      color: p.color
    })),
    scores: room.scores,
    coin: room.coin,
    started: room.started,
    ended: room.ended,
    timeLeft: room.timeLeft
  };
}

function emitState(room) {
  io.to(room.code).emit("state", publicState(room));
}

function endRoom(room, winnerId = null) {
  room.ended = true;
  room.started = false;
  if (room.timer) clearInterval(room.timer);
  room.timer = null;

  let winner = null;
  if (winnerId) {
    const p = room.players.get(winnerId);
    if (p) winner = { id: p.id, name: p.name };
  } else {
    const entries = [...room.players.values()];
    const a = entries[0], b = entries[1];
    if (a && b && room.scores[a.id] !== room.scores[b.id]) {
      const p = room.scores[a.id] > room.scores[b.id] ? a : b;
      winner = { id: p.id, name: p.name };
    }
  }

  io.to(room.code).emit("gameOver", {
    winner,
    scores: room.scores,
    reason: winnerId ? "score" : "time"
  });
  emitState(room);
}

function startRoom(room) {
  if (room.started || room.ended || room.players.size < 2) return;
  room.started = true;
  room.timeLeft = MATCH_SECONDS;
  room.coin = randomCoin();

  room.timer = setInterval(() => {
    room.timeLeft -= 1;
    if (room.timeLeft <= 0) {
      room.timeLeft = 0;
      endRoom(room);
    } else {
      emitState(room);
    }
  }, 1000);

  io.to(room.code).emit("started");
  emitState(room);
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name }) => {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const room = makeRoom(code);
    const player = {
      id: socket.id,
      name: String(name || "Player 1").slice(0, 18),
      x: 180,
      y: 300,
      color: "player1"
    };
    room.players.set(socket.id, player);
    room.scores[socket.id] = 0;
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;
    socket.emit("roomCreated", { code });
    emitState(room);
  });

  socket.on("joinRoom", ({ code, name }) => {
    const clean = String(code || "").trim().toUpperCase();
    const room = rooms.get(clean);

    if (!room) return socket.emit("errorMessage", "Room not found.");
    if (room.players.size >= 2) return socket.emit("errorMessage", "That room is full.");
    if (room.ended) return socket.emit("errorMessage", "That match has ended.");

    const player = {
      id: socket.id,
      name: String(name || "Player 2").slice(0, 18),
      x: 720,
      y: 300,
      color: "player2"
    };

    room.players.set(socket.id, player);
    room.scores[socket.id] = 0;
    socket.join(clean);
    socket.data.room = clean;

    emitState(room);
    startRoom(room);
  });

  socket.on("move", ({ dx, dy }) => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || room.ended) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    const step = 18;
    const x = Number(dx) || 0;
    const y = Number(dy) || 0;
    const len = Math.hypot(x, y) || 1;

    p.x = Math.max(35, Math.min(865, p.x + (x / len) * step));
    p.y = Math.max(100, Math.min(475, p.y + (y / len) * step));

    const dist = Math.hypot(p.x - room.coin.x, p.y - room.coin.y);
    if (dist < 34) {
      room.scores[p.id] += 1;
      room.coin = randomCoin();

      if (room.scores[p.id] >= WIN_SCORE) {
        endRoom(room, p.id);
        return;
      }
    }

    emitState(room);
  });

  socket.on("restart", () => {
    const room = rooms.get(socket.data.room);
    if (!room || room.players.size < 2) return;

    room.ended = false;
    room.started = false;
    room.timeLeft = MATCH_SECONDS;
    for (const id of room.scores) room.scores[id] = 0;

    const players = [...room.players.values()];
    if (players[0]) { players[0].x = 180; players[0].y = 300; }
    if (players[1]) { players[1].x = 720; players[1].y = 300; }

    room.coin = randomCoin();
    emitState(room);
    startRoom(room);
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;

    room.players.delete(socket.id);
    delete room.scores[socket.id];

    if (room.timer) clearInterval(room.timer);
    room.timer = null;
    room.started = false;

    if (room.players.size === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit("errorMessage", "The other player disconnected.");
      emitState(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Coin Clash running on port ${PORT}`);
});