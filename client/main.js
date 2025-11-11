// Client: Vanilla JS + HTML Canvas + Yjs + y-websocket + awareness
import * as Y from 'https://cdn.jsdelivr.net/npm/yjs@13.6.18/dist/yjs.mjs';
import { WebsocketProvider } from 'https://cdn.jsdelivr.net/npm/y-websocket@2.0.3/dist/y-websocket.mjs';

// Wait for DOM to be ready
function init() {
  // Utilities
  const qs = new URLSearchParams(location.search);
  const ROOM = qs.get('room') || 'lobby';
  document.getElementById('room').textContent = `Room: ${ROOM}`;

  // Random name & color seed for presence
  const rand = (n=6)=> Array.from(crypto.getRandomValues(new Uint8Array(n))).map(v=>('0'+(v%36).toString(36)).slice(-1)).join('');
  const username = `user_${rand(4)}`;

  // Canvas setup
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  let w, h;
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // UI elements
  const sizeInput = document.getElementById('brush');
  const colorInput = document.getElementById('color');
  const clearBtn = document.getElementById('clear');
  const presenceLayer = document.getElementById('presence');

  // Yjs doc & provider
  const doc = new Y.Doc();
  const serverUrl = `ws://localhost:1234`; // y-websocket runs here
  console.log('Connecting to WebSocket at:', serverUrl);
  const provider = new WebsocketProvider(serverUrl, ROOM, doc);
  console.log('WebsocketProvider created:', provider);
  
  provider.on('status', (event) => {
    console.log('WebSocket status:', event.status);
  });
  
  provider.on('connection-error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  // Awareness for presence (cursors, usernames, colors)
  const awareness = provider.awareness;
  const myColor = colorInput.value;
  awareness.setLocalState({
    user: { name: username, color: myColor }
  });
  colorInput.addEventListener('input', () => {
    awareness.setLocalStateField('user', { name: username, color: colorInput.value });
  });

  // --- Strokes CRDT (Yjs-native) ---
  // strokes is a Y.Array of Y.Map
  // each stroke: Map { id, color, size, points: Y.Array<{x,y}> }
  const strokes = doc.getArray('strokes');

  function yStrokeToPlain(yStroke) {
    const pts = yStroke.get('points').toArray(); // array of {x,y}
    return {
      id: yStroke.get('id'),
      color: yStroke.get('color'),
      size: yStroke.get('size'),
      points: pts
    };
  }

  // Redraw entire canvas from CRDT - DEFINE BEFORE USING IN resize()
  function redrawAll() {
    ctx.clearRect(0, 0, w, h);
    for (const yStroke of strokes.toArray()) {
      drawStroke(yStrokeToPlain(yStroke));
    }
  }

  function drawStroke(s) {
    if (!s || !s.points || s.points.length < 1) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = s.size;
    ctx.strokeStyle = s.color;
    ctx.beginPath();
    const p0 = s.points[0];
    ctx.moveTo(p0.x * w, p0.y * h);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i];
      ctx.lineTo(p.x * w, p.y * h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // NOW define resize after redrawAll exists
  function resize() {
    w = canvas.clientWidth * dpr;
    h = canvas.clientHeight * dpr;
    canvas.width = w; 
    canvas.height = h;
    redrawAll(); // re-render after resize
  }
  
  window.addEventListener('resize', resize);
  resize();

  // Observe CRDT changes → re-render
  strokes.observeDeep(() => {
    redrawAll();
  });

  // --- Pointer drawing ---
  let drawing = false;
  let currentYStroke = null;

  function norm(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  canvas.addEventListener('pointerdown', ev => {
    console.log('Pointer down event triggered at:', ev.clientX, ev.clientY);
    drawing = true;
    canvas.setPointerCapture(ev.pointerId);

    // create Yjs-native stroke
    const yStroke = new Y.Map();
    yStroke.set('id', crypto.randomUUID());
    yStroke.set('color', colorInput.value);
    yStroke.set('size', parseInt(sizeInput.value, 10) * dpr);
    yStroke.set('points', new Y.Array());

    const p = norm(ev);
    console.log('Normalized position:', p);
    yStroke.get('points').push([p]);

    // insert into CRDT (shared)
    strokes.push([yStroke]);
    currentYStroke = yStroke;
    console.log('Stroke started, total strokes:', strokes.length);

    // local render
    redrawAll();
  });

  canvas.addEventListener('pointermove', ev => {
    const p = norm(ev);
    // presence cursor
    awareness.setLocalStateField('cursor', { x: p.x, y: p.y });

    if (!drawing || !currentYStroke) {
      if (!drawing) console.log('Not drawing');
      if (!currentYStroke) console.log('No current stroke');
      return;
    }
    // append point into Y.Array so it syncs live
    currentYStroke.get('points').push([p]);
    console.log('Point added, points count:', currentYStroke.get('points').length);
    // local render
    redrawAll();
  });

  canvas.addEventListener('pointerup', () => {
    drawing = false;
    currentYStroke = null;
  });

  canvas.addEventListener('pointerleave', () => {
    awareness.setLocalStateField('cursor', null);
  });

  // Clear board for everyone
  clearBtn.addEventListener('click', () => {
    doc.transact(() => {
      strokes.delete(0, strokes.length);
    });
  });

  // Presence UI (remote cursors)
  function updateCursors() {
    // Remove all then re-add (simple). For perf, diff by clientID.
    presenceLayer.innerHTML = '';
    const states = awareness.getStates();
    states.forEach((state, clientId) => {
      const cur = state.cursor;
      const user = state.user;
      if (!cur || !user) return;
      const el = document.createElement('div');
      el.className = 'cursor';
      el.style.left = `${cur.x * canvas.clientWidth}px`;
      el.style.top = `${cur.y * canvas.clientHeight}px`;
      el.style.background = '#cbd5e1';
      el.style.borderColor = '#475569';
      el.textContent = user.name;
      presenceLayer.appendChild(el);
    });
  }
  
  awareness.on('change', updateCursors);
  setInterval(updateCursors, 80); // throttle paint for smoothness

  console.log('Connected to room:', ROOM);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
