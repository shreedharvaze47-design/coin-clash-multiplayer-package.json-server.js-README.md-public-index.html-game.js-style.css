const socket = io();

const nameInput = document.getElementById("name");
const codeInput = document.getElementById("code");
const createBtn = document.getElementById("create");
const joinBtn = document.getElementById("join");

const menu = document.getElementById("menu");
const game = document.getElementById("game");

const roomCode = document.getElementById("roomCode");
const timeText = document.getElementById("time");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");
const gameMessage = document.getElementById("gameMessage");

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

let myId = null;
let state = null;

socket.on("connect", () => {
  myId = socket.id;
});

createBtn.onclick = () => {
  const name = nameInput.value.trim() || "Player 1";
  socket.emit("createRoom", { name });
};

joinBtn.onclick = () => {
  const name = nameInput.value.trim() || "Player 2";
  const code = codeInput.value.trim();

  if (!code) {
    message.textContent = "Enter the room code.";
    return;
  }

  socket.emit("joinRoom", { code, name });
};

socket.on("roomCreated", data => {
  roomCode.textContent = data.code;
  message.textContent = "Room created! Send this code to your friend.";
  showGame();
});

socket.on("state", data => {
  state = data;

  roomCode.textContent = data.code;
  timeText.textContent = data.timeLeft;

  if (data.scores && myId) {
    scoreText.textContent = data.scores[myId] || 0;
  }

  draw();
});

socket.on("started", () => {
  gameMessage.textContent = "GO! Collect the coins!";
});

socket.on("gameOver", data => {
  if (data.winner) {
    gameMessage.textContent = "🏆 Winner: " + data.winner.name;
  } else {
    gameMessage.textContent = "🤝 Match Draw!";
  }
});

socket.on("errorMessage", text => {
  message.textContent = text;
});

function showGame() {
  menu.classList.add("hidden");
  game.classList.remove("hidden");
}

function move(dx, dy) {
  socket.emit("move", { dx, dy });
}

document.getElementById("up").onclick = () => move(0, -1);
document.getElementById("down").onclick = () => move(0, 1);
document.getElementById("left").onclick = () => move(-1, 0);
document.getElementById("right").onclick = () => move(1, 0);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state) return;

  if (state.coin) {
    ctx.beginPath();
    ctx.arc(state.coin.x, state.coin.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = "gold";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("$", state.coin.x, state.coin.y + 6);
  }

  state.players.forEach(player => {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);

    ctx.fillStyle = player.color === "player1"
      ? "#3498db"
      : "#e74c3c";

    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.name, player.x, player.y - 32);
  });
}
