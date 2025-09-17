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
let countdownInterval = null;
let countdownValue = 10;
let isPlaying = false;
let gameInterval = null;
let gameTimeLeft = 45;

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

// Route for admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Handle game state requests (for indicator)
    socket.on('request-game-state', () => {
        console.log(`Sending game state to ${socket.id}: isPlaying=${isPlaying}`);
        socket.emit('game-state-update', { isPlaying: isPlaying });
    });

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
        
        // Print current queue
        console.log('Current queue:', duelQueue.map(p => p.name));
        console.log(`Queue length: ${duelQueue.length}`);
        
        // Notify player they're in queue
        socket.emit('queue-status', {
            position: duelQueue.length,
            message: `Anda berada di posisi ${duelQueue.length} dalam antrian`
        });
        
        // Broadcast queue update to all players
        broadcastQueueUpdate();
        
        // Try to match players - DISABLED FOR NOW
        // tryMatchPlayers();
    });

    // Handle leaving queue
    socket.on('leave-duel-queue', () => {
        const playerIndex = duelQueue.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const playerName = duelQueue[playerIndex].name;
            duelQueue.splice(playerIndex, 1);
            console.log(`Player ${playerName} left the queue`);
            console.log('Current queue:', duelQueue.map(p => p.name));
            console.log(`Queue length: ${duelQueue.length}`);
            
            // Broadcast queue update to all players
            broadcastQueueUpdate();
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
            // Broadcast queue update to all players
            broadcastQueueUpdate();
        }
        
        // Active duel cleanup removed since matching is disabled
    });
});

// Function to start countdown
function startCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownValue = 10;
    console.log('Starting countdown for first 2 players');
    
    // Notify first 2 players that countdown is starting
    if (duelQueue.length >= 1) {
        io.to(duelQueue[0].id).emit('countdown-start');
    }
    if (duelQueue.length >= 2) {
        io.to(duelQueue[1].id).emit('countdown-start');
    }
    
    countdownInterval = setInterval(() => {
        countdownValue--;
        console.log(`Countdown: ${countdownValue}`);
        
        // Send countdown update to first 2 players
        if (duelQueue.length >= 1) {
            io.to(duelQueue[0].id).emit('countdown-update', countdownValue);
        }
        if (duelQueue.length >= 2) {
            io.to(duelQueue[1].id).emit('countdown-update', countdownValue);
        }
        
        if (countdownValue <= 0) {
            stopCountdown();
            startDuel();
        }
    }, 1000);
}

// Function to stop countdown
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Notify all players that countdown stopped
    io.emit('countdown-stop');
    console.log('Countdown stopped');
}

// Function to start duel
function startDuel() {
    if (duelQueue.length < 2) {
        console.log('Not enough players to start duel');
        return;
    }
    
    isPlaying = true;
    gameTimeLeft = 45;
    console.log('Starting duel between', duelQueue[0].name, 'and', duelQueue[1].name);
    
    // Broadcast game state change to all connected clients
    io.emit('game-state-update', { isPlaying: isPlaying });
    
    // Notify first 2 players that duel is starting
    io.to(duelQueue[0].id).emit('duel-start', {
        player1: duelQueue[0],
        player2: duelQueue[1]
    });
    io.to(duelQueue[1].id).emit('duel-start', {
        player1: duelQueue[0],
        player2: duelQueue[1]
    });
    
    // Players 3+ don't need special notification - they continue seeing queue position
    
    // Start game timer
    gameInterval = setInterval(() => {
        gameTimeLeft--;
        console.log(`Game time remaining: ${gameTimeLeft}s`);
        
        // Send time update to first 2 players
        io.to(duelQueue[0].id).emit('game-time-update', gameTimeLeft);
        io.to(duelQueue[1].id).emit('game-time-update', gameTimeLeft);
        
        if (gameTimeLeft <= 0) {
            endDuel();
        }
    }, 1000);
}

// Function to end duel
function endDuel() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    
    isPlaying = false;
    console.log('Duel ended');
    
    // Broadcast game state change to all connected clients
    io.emit('game-state-update', { isPlaying: isPlaying });
    
    // Notify first 2 players that game is finished
    if (duelQueue.length >= 1) {
        io.to(duelQueue[0].id).emit('duel-end');
    }
    if (duelQueue.length >= 2) {
        io.to(duelQueue[1].id).emit('duel-end');
    }
    
    // Remove first 2 players from queue
    if (duelQueue.length >= 2) {
        duelQueue.splice(0, 2);
        console.log('Removed first 2 players from queue');
        
        // Update remaining players
        broadcastQueueUpdate();
    }
}

// Function to broadcast queue update to all players
function broadcastQueueUpdate() {
    const player1 = duelQueue.length >= 1 ? duelQueue[0].name : null;
    const player2 = duelQueue.length >= 2 ? duelQueue[1].name : null;
    
    io.emit('queue-update', {
        player1: player1,
        player2: player2,
        queueLength: duelQueue.length
    });
    
    // Handle countdown logic (only if not playing)
    if (!isPlaying) {
        if (duelQueue.length === 2) {
            // Exactly 2 players - start countdown
            startCountdown();
        } else if (duelQueue.length < 2) {
            // Less than 2 players - stop countdown
            stopCountdown();
        }
    }
    
    // Send individual position updates to each player
    duelQueue.forEach((player, index) => {
        let message, subtitle;
        
        if (index < 2) {
            // Position 1 & 2: Show "Menunggu Lawan" only once
            message = 'Menunggu Lawan';
            subtitle = '';
        } else {
            // Position 3+: Show queue position (3rd position = queue position 1)
            const queuePosition = index - 1; // 3rd position (index 2) = queue position 1
            message = 'Menunggu Permainan Selesai';
            subtitle = `Anda ada di posisi ${queuePosition} dalam antrian`;
        }
        
        io.to(player.id).emit('position-update', {
            position: index + 1,
            isWaiting: index < 2,
            message: message,
            subtitle: subtitle
        });
    });
}

// Function to match players from queue - REMOVED FOR NOW
// function tryMatchPlayers() {
//     // Matching functionality removed
// }

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`Access index.html at: http://localhost:${PORT}/`);
    console.log(`Access indicator.html at: http://localhost:${PORT}/indicator`);
    console.log(`Access quiz.html at: http://localhost:${PORT}/quiz`);
    console.log(`Access duel.html at: http://localhost:${PORT}/duel`);
    console.log(`Access gameover.html at: http://localhost:${PORT}/gameover`);
    console.log(`Access admin.html at: http://localhost:${PORT}/admin`);
});

