const API_URL = 'http://localhost:3000/api';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = 'index.html';
}

document.getElementById('welcomeMsg').innerText = `Welcome, ${user.username}`;
document.getElementById('taskDate').valueAsDate = new Date(); // Default to today

// Load Tasks on start
loadTasks();

// Digital Clock
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString();
    checkReminders();
}, 1000);

// --- Event Listeners ---

document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDesc').value;
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;

    const newTask = {
        title,
        description,
        date,
        time,
        userId: user.id
    };

    try {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });

        if (res.ok) {
            document.getElementById('addTaskForm').reset();
            document.getElementById('taskDate').valueAsDate = new Date(); // Reset date to today
            loadTasks();
            showNotification(`Task "${title}" added!`);
        }
    } catch (err) {
        console.error(err);
    }
});

// --- Functions ---

async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks?userId=${user.id}`);
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        console.error(err);
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    if (tasks.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #aaa; padding: 2rem;">No tasks yet. Add one to get started!</div>`;
        return;
    }

    // Sort by Date/Time
    tasks.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    tasks.forEach(task => {
        const el = document.createElement('div');
        el.className = `task-item ${task.status === 'Done' ? 'completed' : ''}`;
        el.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-meta">
                    <span><i class="far fa-calendar"></i> ${task.date}</span>
                    <span><i class="far fa-clock"></i> ${task.time}</span>
                    ${task.description ? `<span><i class="fas fa-align-left"></i> ${task.description}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                ${task.status !== 'Done' ? `
                <button class="btn-icon btn-check" onclick="markDone('${task.id}')" title="Mark Done">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(el);
    });

    // Also render Timetable
    renderTimetable(tasks);
}

async function markDone(id) {
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Done' })
    });
    loadTasks();
}

async function deleteTask(id) {
    if (!confirm('Are you sure?')) return;
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
}

function renderTimetable(tasks) {
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';

    // Filter for TODAY only
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks.filter(t => t.date === today);

    // Sort by time
    todaysTasks.sort((a, b) => a.time.localeCompare(b.time));

    if (todaysTasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#999;">No tasks scheduled for today.</td></tr>`;
        return;
    }

    todaysTasks.forEach(t => {
        const row = document.createElement('tr');
        const statusClass = t.status === 'Done' ? 'status-done' : 'status-pending';
        row.innerHTML = `
            <td><strong>${t.time}</strong></td>
            <td>${t.title}</td>
            <td><span class="status-badge ${statusClass}">${t.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function printTimetable() {
    const printContent = document.querySelector('.timetable-container').innerHTML;
    const originalContent = document.body.innerHTML;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Daily Timetable</title>');
    printWindow.document.write('<style>body{font-family: sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px; text-align:left;} th{background:#eee;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Today\'s Timetable</h1>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// --- Reminders ---
let metrics = {
    lastCheck: 0
};

function checkReminders() {
    // Check every minute or so strictly, but for demo we check every second against the minute
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    // Prevent multiple alerts in the same minute
    if (metrics.lastCheck === currentTime) return;

    // We need to fetch tasks (or use cached ones). For simplicity let's peek at the DOM or re-fetch. 
    // Ideally we store tasks in a global variable.
    // Let's implement a global fetch for purity.
    fetch(`${API_URL}/tasks?userId=${user.id}`)
        .then(res => res.json())
        .then(tasks => {
            const dueTasks = tasks.filter(t =>
                t.date === currentDate &&
                t.time === currentTime &&
                t.status !== 'Done'
            );

            if (dueTasks.length > 0) {
                metrics.lastCheck = currentTime;
                dueTasks.forEach(t => {
                    const audio = document.getElementById('notifySound');
                    audio.play().catch(e => console.log('Audio play failed (interaction needed first)'));

                    // Simple Browser Notification
                    if (Notification.permission === "granted") {
                        new Notification(`Task Reminder: ${t.title}`, { body: t.description || "It's time!" });
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                                new Notification(`Task Reminder: ${t.title}`, { body: t.description || "It's time!" });
                            }
                        });
                    }

                    alert(`🔔 Reminder: ${t.title}\nTime to do this task!`);
                });
            }
        });
}

function showNotification(msg) {
    // Toast notification could go here. For now just log.
    console.log(msg);
}

// Request notification permission on load
if (Notification.permission !== "denied") {
    Notification.requestPermission();
}
