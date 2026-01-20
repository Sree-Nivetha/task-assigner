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
            res.json({ success: true, user: { id: user.id, username: user.username, role: user.role} });
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

app.get('/api/users', (req, res) => {
    const users = db.get('users');
    res.json(users);
});


// Add Task
/*app.post('/api/tasks', (req, res) => {
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
});*/
// Admin Assign Task
app.post('/api/admin/assign-task', (req, res) => {
    const { title, description, date, time, assignedTo, adminId } = req.body;

    // 1. Verify admin
    const admin = db.find('users', u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can assign tasks' });
    }

    // 2. Create task with activity log
    const newTask = {
        title,
        description,
        date,
        time,
        userId: assignedTo,            // assigned user
        assignedBy: adminId,            // admin ID
        status: 'Pending',
        createdAt: new Date().toISOString(),
        activityLog: [
            {
                action: 'Task assigned',
                by: admin.username,
                time: new Date().toISOString()
            }
        ]
    };

    const added = db.add('tasks', newTask);
    res.json(added);
});

// Update Task Status
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const task = db.find('tasks', t => t.id === id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    task.status = status;
    task.activityLog = task.activityLog || [];
    task.activityLog.push({
        action: `Status changed to ${status}`,
        by: req.body.username,
        time: new Date().toISOString()
    });

    const updated = db.update('tasks', id, task);
    res.json(updated);

});

// Admin View All Task Activities
app.get('/api/admin/tasks', (req, res) => {
    const adminId = req.query.adminId;

    const admin = db.find('users', u => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = db.get('tasks');
    res.json(tasks);
});

// Admin: Assign Task
app.post('/api/admin/assign-task', (req, res) => {
    const { title, userId } = req.body;

    if (!title || !userId) {
        return res.status(400).json({ error: 'Title and User required' });
    }

    const task = {
        title,
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        userId,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        activity: ['Task assigned']
    };

    const added = db.add('tasks', task);
    res.json(added);
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

app.get('/api/admin/tasks', (req, res) => {
    const tasks = db.get('tasks');
    const users = db.get('users');

    const enriched = tasks.map(t => {
        const user = users.find(u => u.id === t.userId);
        return {
            ...t,
            username: user ? user.username : 'Unknown',
            activity: t.activity || []
        };
    });

    res.json(enriched);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Teacher Task Scheduler is ready!`);
});
