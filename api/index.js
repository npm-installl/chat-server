require('dotenv').config();
const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
app.use(bodyParser.json());

// Load environment variables from .env file
const env = process.env.NODE_ENV;
const port = process.env.PORT;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const origin = process.env.ORIGIN;
var pool
// PostgreSQL connection
if (process.env.POSTGRES_URL) {
    pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
    })
} else {
    console.log("comming to dev & pool2")
    pool = new Pool({
        user: dbUser,
        host: dbHost,
        database: dbName,
        password: dbPassword,
        port: 5432,
    });
}

// Create table for messages
pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const io = socketIo(server, {
    cors: {
        origin: origin, // Use the origin from the environment variable
        methods: ['GET', 'POST']
    }
});

app.use(cors({
    origin: origin, // Use the origin from the environment variable
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    // Join a room
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`Client joined room: ${room}`);

        // Load message history
        pool.query(`SELECT * FROM messages WHERE room = $1 ORDER BY timestamp ASC`, [room])
            .then(result => {
                socket.emit('loadMessages', result.rows);
            })
            .catch(err => console.error(err));
    });

    // Send message
    socket.on('sendMessage', (data) => {
        pool.query(`INSERT INTO messages (room, message) VALUES ($1, $2) RETURNING *`, [data.room, data.message])
            .then(result => {
                io.to(data.room).emit('receiveMessage', result.rows[0]);
            })
            .catch(err => console.error(err));
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Get all messages
app.get('/messages', (req, res) => {
    const room = req.query.room;
    pool.query(`SELECT * FROM messages WHERE room = $1 ORDER BY timestamp ASC`, [room])
        .then(result => {
            res.json(result.rows);
        })
        .catch(err => console.error(err));
});

server.listen(port, () => console.log(`Server running on port ${port}`));