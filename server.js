const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    let user = db.find('users', u => u.username === username);

    if (user) {
        if (user.password === password) {
            res.json({ success: true, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } else {
        res.status(404).json({ success: false, message: 'User not found. Please sign up.' });
    }
});

// Signup
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = db.find('users', u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const newUser = db.add('users', { username, password });
    res.json({ success: true, user: { id: newUser.id, username: newUser.username }, message: 'Account created successfully!' });
});

// Get Tasks
app.get('/api/tasks', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const allTasks = db.get('tasks');
    const userTasks = allTasks.filter(t => t.userId === userId);
    res.json(userTasks);
});

// Add Task
app.post('/api/tasks', (req, res) => {
    const { title, description, date, time, userId } = req.body;
    if (!title || !date || !time || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newTask = {
        title,
        description,
        date,
        time,
        userId,
        status: 'Pending',
        createdAt: new Date().toISOString()
    };

    const added = db.add('tasks', newTask);
    res.json(added);
});

// Update Task Status
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const updated = db.update('tasks', id, { status });
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Delete Task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const deleted = db.delete('tasks', id);
    if (deleted) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Teacher Task Scheduler is ready!`);
});
