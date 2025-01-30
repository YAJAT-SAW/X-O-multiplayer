const express = require("express");
const fs = require('fs');
const path = require('path');
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
app.use(cors());

const server = http.createServer(app);


const rooms = {};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("create-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        player1: socket.id,
        player2: null,
        board: Array(9).fill(null),
        currentTurn: "X",
      };
      socket.emit('room-created');
      socket.join(roomId);
    } else {
      socket.emit("room-exists");
    }
  });

  socket.on("join", (roomId) => {
    if (!rooms[roomId]) {
      socket.emit("room-not-found");
    } else {
      if (!rooms[roomId].player2) {
        const room = rooms[roomId];
        room.player2 = socket.id;
        socket.to(room.player1).emit("opponent-joined");
        socket.emit("joined");
        socket.join(roomId);
      } else {
        socket.emit("room-full");
      }
    }
  });

  socket.on("turn", (data) => {
    const { turn, turnQ, roomId, winQ } = data;
    const room = rooms[roomId];

    if (!room) return;

    if (turnQ === room.currentTurn && room.player2 && room.board[turn] === null && !winQ) {
      room.board[turn] = room.currentTurn;
      room.currentTurn = room.currentTurn === "X" ? "O" : "X";
      io.to(roomId).emit('board-update', {
        board: room.board,
        turn: room.currentTurn,
      });
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      if (rooms[roomId].player1 === socket.id) {
        delete rooms[roomId];
      } else if (rooms[roomId].player2 === socket.id) {
        rooms[roomId].player2 = null;
      }
    }
  });
});



const indexPath = path.join(__dirname, '/dist', 'index.html');

// Middleware to serve static files
app.use(express.static(path.join(__dirname, '/dist')));

app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('⚠️ index.html not found, waiting for build...');
    res.status(500).send('Server is still setting up. Try again in a moment.');
  }
});


const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

