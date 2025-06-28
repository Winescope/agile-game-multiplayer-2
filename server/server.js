import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// In-memory game rooms
const rooms = {};

// Helper: broadcast to all clients in a room
function broadcast(room, data) {
  (rooms[room]?.clients || []).forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection
wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerName = null;

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    if (data.type === 'join') {
      const { room, password, name } = data;
      if (!rooms[room]) {
        rooms[room] = { password, state: null, clients: [] };
      }
      if (rooms[room].password !== password) {
        ws.send(JSON.stringify({ type: 'error', message: 'Wrong password' }));
        return;
      }
      currentRoom = room;
      playerName = name;
      rooms[room].clients.push(ws);
      ws.send(JSON.stringify({ type: 'joined', state: rooms[room].state || null }));
      broadcast(room, { type: 'players', count: rooms[room].clients.length });
    }

    if (data.type === 'update' && currentRoom) {
      // Update game state and broadcast
      rooms[currentRoom].state = data.state;
      broadcast(currentRoom, { type: 'state', state: data.state });
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].clients = rooms[currentRoom].clients.filter(c => c !== ws);
      broadcast(currentRoom, { type: 'players', count: rooms[currentRoom].clients.length });
    }
  });
});

app.get('/', (req, res) => {
  res.send('Agile Game Server is running!');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 