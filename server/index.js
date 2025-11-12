import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

// Serve static files
app.use(express.static(CLIENT_DIR));
app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Store active rooms with their drawing data
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  socket.on('join-room', (data) => {
    const { room } = data;
    socket.join(room);
    
    if (!rooms.has(room)) {
      rooms.set(room, {
        strokes: [],
        users: new Set()
      });
    }
    
    const roomData = rooms.get(room);
    roomData.users.add(socket.id);
    
    console.log(`✓ User ${socket.id} joined room: ${room}`);
    
    // Send existing strokes to the new user
    socket.emit('load-strokes', { strokes: roomData.strokes });
    
    // Notify others that a user joined
    socket.broadcast.to(room).emit('user-joined', { 
      userId: socket.id,
      userCount: roomData.users.size 
    });
  });

  socket.on('draw-stroke', (data) => {
    const { room, stroke } = data;
    
    if (rooms.has(room)) {
      const roomData = rooms.get(room);
      roomData.strokes.push(stroke);
    }
    
    // Broadcast to all users in the room (including sender for confirmation)
    io.to(room).emit('draw-stroke', { stroke, userId: socket.id });
  });

  socket.on('clear-board', (data) => {
    const { room } = data;
    
    if (rooms.has(room)) {
      rooms.get(room).strokes = [];
    }
    
    io.to(room).emit('clear-board', {});
    console.log(`🗑 Board cleared in room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('✗ Client disconnected:', socket.id);
    
    // Clean up rooms
    for (const [roomName, roomData] of rooms.entries()) {
      if (roomData.users.has(socket.id)) {
        roomData.users.delete(socket.id);
        io.to(roomName).emit('user-left', { 
          userId: socket.id,
          userCount: roomData.users.size 
        });
        
        // Delete empty rooms
        if (roomData.users.size === 0) {
          rooms.delete(roomName);
          console.log(`🗑 Deleted empty room: ${roomName}`);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${CLIENT_DIR}`);
});
