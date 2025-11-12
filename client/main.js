// Import Socket.IO from CDN
const socket = io();

// Get room from URL
const params = new URLSearchParams(window.location.search);
const ROOM = params.get('room') || 'lobby';

console.log('🔗 Connecting to room:', ROOM);

// Canvas setup
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX = 0;
let lastY = 0;

// UI elements
const sizeInput = document.getElementById('brush');
const colorInput = document.getElementById('color');
const clearBtn = document.getElementById('clear');

// Set room name in header
document.getElementById('room').textContent = `Room: ${ROOM}`;

// Resize canvas to fill available space
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
}

// Initial resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Fill canvas with white background
function fillWhiteBackground() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
fillWhiteBackground();

// Draw a stroke
function drawLine(fromX, fromY, toX, toY, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

// Mouse/Touch events
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
  console.log('✏ Drawing started');
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  
  const stroke = {
    fromX: lastX,
    fromY: lastY,
    toX: currentX,
    toY: currentY,
    color: colorInput.value,
    size: parseInt(sizeInput.value, 10)
  };
  
  // Draw locally
  drawLine(lastX, lastY, currentX, currentY, colorInput.value, parseInt(sizeInput.value, 10));
  
  // Send to server
  socket.emit('draw-stroke', { room: ROOM, stroke });
  
  lastX = currentX;
  lastY = currentY;
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  console.log('✓ Drawing finished');
});

canvas.addEventListener('mouseleave', () => {
  drawing = false;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  console.log('✏ Touch drawing started');
});

canvas.addEventListener('touchmove', (e) => {
  if (!drawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const currentX = touch.clientX - rect.left;
  const currentY = touch.clientY - rect.top;
  
  const stroke = {
    fromX: lastX,
    fromY: lastY,
    toX: currentX,
    toY: currentY,
    color: colorInput.value,
    size: parseInt(sizeInput.value, 10)
  };
  
  // Draw locally
  drawLine(lastX, lastY, currentX, currentY, colorInput.value, parseInt(sizeInput.value, 10));
  
  // Send to server
  socket.emit('draw-stroke', { room: ROOM, stroke });
  
  lastX = currentX;
  lastY = currentY;
  
  e.preventDefault();
});

canvas.addEventListener('touchend', () => {
  drawing = false;
  console.log('✓ Touch drawing finished');
});

// Clear button
clearBtn.addEventListener('click', () => {
  console.log('🗑 Clearing board');
  socket.emit('clear-board', { room: ROOM });
});

// Socket.IO events
socket.on('connect', () => {
  console.log('✓ Connected to server, socket ID:', socket.id);
  socket.emit('join-room', { room: ROOM });
});

socket.on('load-strokes', (data) => {
  console.log('📥 Loading', data.strokes.length, 'existing strokes');
  fillWhiteBackground();
  data.strokes.forEach(stroke => {
    drawLine(stroke.fromX, stroke.fromY, stroke.toX, stroke.toY, stroke.color, stroke.size);
  });
});

socket.on('draw-stroke', (data) => {
  const { stroke, userId } = data;
  drawLine(stroke.fromX, stroke.fromY, stroke.toX, stroke.toY, stroke.color, stroke.size);
  if (userId !== socket.id) {
    console.log('📨 Received stroke from', userId);
  }
});

socket.on('clear-board', () => {
  console.log('🗑 Board cleared by other user');
  fillWhiteBackground();
});

socket.on('user-joined', (data) => {
  console.log('👤 User joined. Users in room:', data.userCount);
});

socket.on('user-left', (data) => {
  console.log('👤 User left. Users in room:', data.userCount);
});

socket.on('disconnect', () => {
  console.log('✗ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

console.log('✓ Client initialized for room:', ROOM);
