const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Access index.html at: http://localhost:${PORT}/`);
    console.log(`Access indicator.html at: http://localhost:${PORT}/indicator`);
    console.log(`Access quiz.html at: http://localhost:${PORT}/quiz`);
    console.log(`Access duel.html at: http://localhost:${PORT}/duel`);
    console.log(`Access gameover.html at: http://localhost:${PORT}/gameover`);
});

