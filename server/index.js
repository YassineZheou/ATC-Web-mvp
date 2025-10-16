// server/index.js
// Main server - handles authentication, WebSocket, and broadcasts aircraft data

const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const users = require('./users');
const Simulator = require('./simulator');

// Setup Express and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// Initialize simulator with 20 aircraft
const simulator = new Simulator(20);

// Store active connections and their user info
const connectedClients = new Map();

// ============ AUTHENTICATION ============

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  
  // Find user in database
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Login successful
  res.json({
    user: {
      username: user.username,
      role: user.role,
    },
  });
});

// ============ WEBSOCKET HANDLING ============

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Store client connection
  connectedClients.set(ws, {
    username: null,
    role: null,
    connectedAt: new Date(),
  });

  // Send initial state to new client
  const initialState = {
    type: 'tracks',
    tracks: simulator.getState(),
  };
  ws.send(JSON.stringify(initialState));

  // Handle incoming messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Handle different message types
      if (message.type === 'auth') {
        const client = connectedClients.get(ws);
        if (client) {
          client.username = message.username;
          client.role = message.role;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    connectedClients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============ BROADCAST UPDATES ============

function broadcastAircraftUpdate() {
  // Update aircraft positions
  simulator.updatePositions();

  // Get current aircraft state
  const state = simulator.getState();

  // Prepare tracks message
  const tracksMessage = {
    type: 'tracks',
    tracks: state,
  };

  // Send to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(tracksMessage));
    }
  });

  // Check for NEW conflicts only
  const newConflicts = simulator.detectConflicts();

  // Send only new conflict alerts
  if (newConflicts.length > 0) {
    newConflicts.forEach((conflict) => {
      const alertMessage = {
        type: 'alert',
        message: conflict.message,
        timestamp: Date.now(),
      };

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(alertMessage));
        }
      });
      
      console.log('New conflict alert:', conflict.message);
    });
  }
}

// Broadcast aircraft updates every 2 seconds
setInterval(broadcastAircraftUpdate, 2000);

// ============ START SERVER ============

server.listen(PORT, () => {
  console.log(`🛫 ATC Server running on http://localhost:${PORT}`);
  console.log(`📡 Simulator initialized with 20 aircraft`);
});