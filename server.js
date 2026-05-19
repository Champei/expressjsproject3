const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, PORT } = require('./config');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));// Serve the frontend files as static assets (HTML, CSS, JS)

app.use((req, res, next) => {
  console.log('Received request:', req.method, req.url);
  next();
});// Middleware to log incoming requests

app.use('/auth', authRoutes);

app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ message: 'Route not found.' });
    }
});// The frontend JS reads window.location.pathname and renders the correct screen.

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({message: 'Internal Server Error'});
});// Global error handling middleware

const rooms = new Map();

wss.on('connection', (ws, req) => {
    const token=parseCookies(req.headers.cookie).token;
    if (!token) {
        ws.send(JSON.stringify({type: 'error', message: 'Unauthorized. Please login again.'}));
        return ws.close();
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ws.user = decoded; // {id, email, role}
    } catch (error) {
        ws.send(JSON.stringify({type: 'error', message: 'Invalid token. Please login again.'}));
        return ws.close(1008, 'Unauthorized');
    }
    ws.roomId = null;

    ws.on('message', (message) => {
        let msg;
        try {
            msg = JSON.parse(message);
            console.log(` Received message from ${ws.user.name}:`, msg);
        } catch (error) {
            return ws.send(JSON.stringify({type: 'error', message: 'Invalid message format.'}));
        }
        if (msg.type === 'join') {
            handleJoinRoom(ws, msg.roomId);
        }   
        else if (msg.type === 'message') {
            handleMessage(ws, msg.content);
        }
    });
    ws.on('close', () => {
         console.log(`User ${ws.user.name} disconnected`);
        if (ws.roomId) {
            leaveRoom(ws);
        }
    }   
    );
});

function parseCookies(cookieHeader) {
if (!cookieHeader) return null;
  const match = cookieHeader.split(';') // token1=asdlkfjdsfasldff;auth=asdfasdfasdfasdff;para ['token', 'asdfasdff']]
    .map(pair => pair.trim().split('='))
    .find(([key]) => key === 'token');
  return match ? match[1] : null;
}

function handleJoin(ws, roomId) {
    if (ws.roomId && ws.roomId !== roomId) {
        leaveRoom(ws);
    }

    ws.roomId = roomId;
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(ws);

    broadcastToRoom(roomId, {
        type: 'system',
        message: `${ws.user.name} joined the room`,
        timestamp: new Date().toISOString()
    });

    broadcastRoomInfo(roomId);
    console.log(`${ws.user.email} joined room ${roomId} (${rooms.get(roomId).size} users)`);
}

function handleMessage(ws, text) {
    if (!ws.roomId || !text || typeof text !== 'string') return;
    const clean = text.trim().slice(0, 1000); // limit message length
    if (!clean) return;

    broadcastToRoom(ws.roomId, {
        type: 'message',
        from: ws.user.name,
        fromEmail: ws.user.email,
        message: clean,
        timestamp: new Date().toISOString()
    });
}

function leaveRoom(ws) {
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.delete(ws);
    ws.roomId = null;

    if (room.size === 0) {
        rooms.delete(roomId);
    } else {
        broadcastToRoom(roomId, {
            type: 'system',
            message: `${ws.user.name} left the room`,
            timestamp: new Date().toISOString()
        });
        broadcastRoomInfo(roomId);
    }
}

function broadcastToRoom(roomId, data) {
    const room = rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(data);
    room.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function broadcastRoomInfo(roomId) {
    const room = rooms.get(roomId);
    broadcastToRoom(roomId, {
        type: 'room_info',
        userCount: room ? room.size : 0
    });
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

