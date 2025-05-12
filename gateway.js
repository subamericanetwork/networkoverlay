require('dotenv').config();
const WebSocket = require('ws');
const { createClient } = require('redis');

const wss = new WebSocket.Server({ port: process.env.PORT || 10000 }, () => {
  console.log('✅ WebSocket Server running');
});

const redis = createClient({
    socket: {
      tls: true,  // this turns on actual TLS (rediss)
      rejectUnauthorized: false, // disables cert validation (safe for dev)
    },
    url: process.env.REDIS_URL
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

redis.subscribe('overlay_v1', (message) => {
  console.log('🔁 Overlay from Redis:', message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});
