const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    serveClient: true
});

const PORT = process.env.PORT || 3000;

// FIFO Queue for duel players
const duelQueue = [];
const activeDuels = new Map(); // Map to store active duel sessions

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for indicator.html
app.get('/indicator', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'indicator.html'));
});

// Route for quiz.html
app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

// Route for duel.html
app.get('/duel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'duel.html'));
});

// Route for gameover.html
app.get('/gameover', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gameover.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle joining duel queue
    socket.on('join-duel-queue', (playerData) => {
        console.log(`Player ${playerData.name} joining queue`);
        
        // Add player to FIFO queue
        const player = {
            id: socket.id,
            name: playerData.name,
            email: playerData.email,
            whatsapp: playerData.whatsapp,
            gender: playerData.gender,
            joinTime: new Date()
        };
        
        duelQueue.push(player);
        
        // Notify player they're in queue
        socket.emit('queue-status', {
            position: duelQueue.length,
            message: `Anda berada di posisi ${duelQueue.length} dalam antrian`
        });
        
        // Try to match players
        tryMatchPlayers();
    });

    // Handle leaving queue
    socket.on('leave-duel-queue', () => {
        const playerIndex = duelQueue.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            duelQueue.splice(playerIndex, 1);
            console.log(`Player ${socket.id} left the queue`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // Remove from queue if present
        const playerIndex = duelQueue.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            duelQueue.splice(playerIndex, 1);
            console.log(`Player ${socket.id} removed from queue due to disconnect`);
        }
        
        // Handle active duel cleanup
        for (let [duelId, duel] of activeDuels) {
            if (duel.player1.id === socket.id || duel.player2.id === socket.id) {
                // Notify other player about disconnection
                const otherPlayerId = duel.player1.id === socket.id ? duel.player2.id : duel.player1.id;
                io.to(otherPlayerId).emit('opponent-disconnected');
                activeDuels.delete(duelId);
                console.log(`Duel ${duelId} ended due to player disconnect`);
            }
        }
    });
});

// Function to match players from queue
function tryMatchPlayers() {
    while (duelQueue.length >= 2) {
        // Get first two players (FIFO)
        const player1 = duelQueue.shift();
        const player2 = duelQueue.shift();
        
        // Create duel session
        const duelId = `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const duel = {
            id: duelId,
            player1: player1,
            player2: player2,
            startTime: new Date(),
            status: 'waiting'
        };
        
        activeDuels.set(duelId, duel);
        
        // Notify both players they're matched
        io.to(player1.id).emit('duel-matched', {
            duelId: duelId,
            opponent: player2,
            playerNumber: 1
        });
        
        io.to(player2.id).emit('duel-matched', {
            duelId: duelId,
            opponent: player1,
            playerNumber: 2
        });
        
        console.log(`Matched players: ${player1.name} vs ${player2.name} in duel ${duelId}`);
    }
    
    // Update remaining players' queue positions
    duelQueue.forEach((player, index) => {
        io.to(player.id).emit('queue-status', {
            position: index + 1,
            message: `Anda berada di posisi ${index + 1} dalam antrian`
        });
    });
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`Access index.html at: http://localhost:${PORT}/`);
    console.log(`Access indicator.html at: http://localhost:${PORT}/indicator`);
    console.log(`Access quiz.html at: http://localhost:${PORT}/quiz`);
    console.log(`Access duel.html at: http://localhost:${PORT}/duel`);
    console.log(`Access gameover.html at: http://localhost:${PORT}/gameover`);
});

