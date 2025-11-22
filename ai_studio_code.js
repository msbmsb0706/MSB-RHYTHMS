const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('JOIN_SESSION', ({ pin, userId, deviceType }) => {
    socket.join(pin);
    const roomSize = io.sockets.adapter.rooms.get(pin)?.size || 0;
    const isHost = roomSize === 1; // First person is host
    
    socket.emit('SESSION_JOINED', { success: true, isHost, serverTime: Date.now() });
    socket.to(pin).emit('DEVICE_JOINED', { id: userId, type: deviceType });
  });

  socket.on('TIME_SYNC', (payload) => {
    socket.emit('TIME_SYNC_RETURN', {
      clientSendTime: payload.clientSendTime,
      serverReceiveTime: Date.now()
    });
  });

  // Relay signals to everyone in the room
  const relay = (evt) => socket.on(evt, (p) => io.in(p.pin).emit(evt, p));
  relay('PLAY');
  relay('PAUSE');
  relay('SEEK');
  relay('TRACK_CHANGE');
  relay('EFFECTS_UPDATE');
});

server.listen(4000, () => console.log("MSB Server running on port 4000"));