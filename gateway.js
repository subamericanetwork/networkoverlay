require('dotenv').config();
const WebSocket = require('ws');
const { createClient } = require('redis');
const express = require('express');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 3000; // Separate port for HTTP API (can be same as WS if Render allows)
let latestOverlay = { text: "Subamerica Network" }; // Default overlay

const wss = new WebSocket.Server({ port: process.env.PORT || 10000 }, () => {
  console.log('✅ WebSocket Server running');
});

const redis = createClient({
  url: process.env.REDIS_URL
  // DO NOT include socket/tls here!
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis!');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

wss.on('connection', (ws) => {
  console.log('📡 New client connected');
});

// HTTP endpoint for Roku polling
app.get('/api/overlay', (req, res) => {
  res.json(latestOverlay);
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP API server running on port ${HTTP_PORT}`);
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
