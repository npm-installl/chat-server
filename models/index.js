const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');
const Message =require('./message')
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
app.use(bodyParser.json());


// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/chat_app').then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200', // Replace with your Angular app URL
        methods: ['GET', 'POST']
    }
});

app.use(cors({
    origin: 'http://localhost:4200', // Replace with the URL where your Angular app is running
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));




// Socket.io connection
// io.on('connection', (socket) => {
//     console.log('New client connected');

//     socket.on('sendMessage', (data) => {
//         console.log("calling send ---------", data)
//         const message = new Message(data);
//         message.save().then(() => {
//             console.log("done....")
//             io.emit('receiveMessage', data);
//         });
//     });

//     socket.on('disconnect', () => {
//         console.log('Client disconnected');
//     });
// });

// Get all messages
// app.get('/messages', (req, res) => {
//   Message.find().then(messages => res.json(messages));
// });


// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    // Join a room
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`Client joined room: ${room}`);

        // Load message history
        Message.find({ room }).sort({ timestamp: 1 }).then(messages => {
            socket.emit('loadMessages', messages);
        });
    });

    // Send message
    socket.on('sendMessage', (data) => {
        const message = new Message(data);
        message.save().then(() => {
            io.to(data.room).emit('receiveMessage', data);
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});



app.get('/messages', (req, res) => {
    Message.find(req.query).sort({ timestamp: 1 }).then(messages => res.json(messages));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
