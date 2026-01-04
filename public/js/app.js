const API_URL = 'http://localhost:3000/api';
const user = JSON.parse(localStorage.getItem('user'));
window.APP = { user: { name: user ? user.username : 'Teacher' } };

if (!user) {
    window.location.href = 'index.html';
}

if (window.TeacherUI) {
    window.TeacherUI.initGreeting({ selector: '#welcomeMsg', name: user.username });
} else {
    document.getElementById('welcomeMsg').innerText = `Welcome, ${user.username}`;
}
document.getElementById('taskDate').valueAsDate = new Date(); // Default to today

// Load Tasks on start
loadTasks();

// Digital Clock (only if element exists)
const clockEl = document.getElementById('clock');
setInterval(() => {
    const now = new Date();
    if (clockEl) clockEl.innerText = now.toLocaleTimeString();
    checkReminders();
}, 1000);

const isTimetablePage = window.location.pathname.includes('timetable.html');
const addTaskForm = document.getElementById('addTaskForm');
const taskDateInput = document.getElementById('taskDate');

if (taskDateInput) {
    taskDateInput.valueAsDate = new Date();
}

if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
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
                addTaskForm.reset();
                if (taskDateInput) taskDateInput.valueAsDate = new Date();
                loadTasks();
                showNotification(`Task "${title}" added!`);
            }
        } catch (err) {
            console.error(err);
        }
    });
}

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
    if (!list) return; // Not on dashboard

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

    // Also update Timetable widget on dashboard if it exists
    renderTimetable(tasks);
}

async function markDone(id) {
    try {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Done' })
        });

        if (res.ok) {
            // Play success sound
            const sound = document.getElementById('successSound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Sound play blocked:', e));
            }

            // Trigger Confetti Burst
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#ec4899']
            });

            // Show Cheer
            if (window.TeacherUI) {
                showNotification(window.TeacherUI.getCheer());
            }

            // Remind about the next class
            remindNextClass(id);

            loadTasks();
        }
    } catch (err) {
        console.error('Error marking task as done:', err);
    }
}

async function remindNextClass(completedId) {
    try {
        const res = await fetch(`${API_URL}/tasks?userId=${user.id}`);
        const tasks = await res.json();

        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = tasks.filter(t => t.date === today)
            .sort((a, b) => a.time.localeCompare(b.time));

        const currentIndex = todaysTasks.findIndex(t => t.id === completedId);
        const nextTask = todaysTasks.slice(currentIndex + 1).find(t => t.status !== 'Done');

        if (nextTask) {
            // Instant feedback alert
            setTimeout(() => {
                alert(`✅ Task Completed!\n\nYour NEXT class is: "${nextTask.title}"\nStarting at: ${nextTask.time}\n\nDon't forget to prepare!`);
            }, 800);
        } else {
            setTimeout(() => {
                alert(`🎉 Great work! You have finished all your scheduled classes for today.`);
            }, 800);
        }

        // Update the visual banner immediately
        updateNextClassHighlight(todaysTasks);
    } catch (err) {
        console.log('Error reminding next class', err);
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure?')) return;
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
}

function renderTimetable(tasks) {
    const tbody = document.getElementById('timetableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filter for TODAY only
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks.filter(t => t.date === today);

    // Sort by time
    todaysTasks.sort((a, b) => a.time.localeCompare(b.time));

    updateNextClassHighlight(todaysTasks);

    if (todaysTasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">No tasks scheduled for today.</td></tr>`;
        return;
    }

    todaysTasks.forEach(t => {
        const row = document.createElement('tr');
        const statusClass = t.status === 'Done' ? 'status-done' : 'status-pending';

        row.innerHTML = `
            <td><strong>${t.time}</strong></td>
            <td>${t.title} ${t.description ? `<br><small style="color:#777;">${t.description}</small>` : ''}</td>
            <td><span class="status-badge ${statusClass}">${t.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function updateNextClassHighlight(todaysTasks) {
    const nextClassAlert = document.getElementById('nextClassAlert');
    const nextClassText = document.getElementById('nextClassText');
    if (!nextClassAlert || !nextClassText) return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const nextTask = todaysTasks.find(t => t.status !== 'Done' && t.time >= currentTime);

    if (nextTask) {
        nextClassAlert.style.display = 'flex';
        nextClassText.innerText = `${nextTask.title} at ${nextTask.time}`;
    } else {
        nextClassAlert.style.display = 'none';
    }
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
    // Show a simple toast-like alert if it's a cheer
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = 'var(--primary)';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = 'var(--shadow)';
    toast.style.zIndex = '1000';
    toast.style.animation = 'fadeIn 0.5s ease-out';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-in';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Request notification permission on load
if (Notification.permission !== "denied") {
    Notification.requestPermission();
}
