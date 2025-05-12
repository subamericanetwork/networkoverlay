require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestOverlay = { text: "Subamerica Network" }; // Default overlay

// HTTP endpoint for overlay
app.get('/api/overlay', (req, res) => {
  res.json(latestOverlay);
});

// WebSocket logic
wss.on('connection', (ws) => {
  console.log('📡 New client connected');
});

const redis = createClient({ url: process.env.REDIS_URL });

redis.on('connect', () => {
  console.log('✅ Connected to Redis!');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// Wrap async logic in an IIFE
(async () => {
  await redis.connect();
  await redis.subscribe('overlay_v1', (message) => {
    console.log('🔁 Overlay from Redis:', message);
    // Update latest overlay for HTTP endpoint
    try {
      latestOverlay = JSON.parse(message);
    } catch (e) {
      latestOverlay = { text: "Invalid overlay data" };
    }
    // Broadcast to all WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  console.log('✅ Subscribed to overlay_v1');
})();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
