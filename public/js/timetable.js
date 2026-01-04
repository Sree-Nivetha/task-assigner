// timetable.js
(function () {
    const timetableEl = document.getElementById('timetable');
    const modalEl = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('evt-delete');

    let events = JSON.parse(localStorage.getItem('timetable_events') || '[]');
    let currentEventId = null;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Configuration
    const config = {
        startDay: 1, // Monday
        daysCount: 5,
        slotMinutes: 30,
        startHour: 8,
        endHour: 18
    };

    function init() {
        renderGrid();
        setupListeners();
    }

    function renderGrid() {
        const startDay = parseInt(document.getElementById('start-day').value);
        const daysCount = parseInt(document.getElementById('days-count').value);
        const slotMinutes = parseInt(document.getElementById('slot-minutes').value);

        config.startDay = startDay;
        config.daysCount = daysCount;
        config.slotMinutes = slotMinutes;

        const totalSlots = ((config.endHour - config.startHour) * 60) / slotMinutes;

        timetableEl.style.setProperty('--days', daysCount);
        timetableEl.style.setProperty('--slots', totalSlots);

        timetableEl.innerHTML = '';

        // Top Left Corner
        const corner = document.createElement('div');
        corner.className = 'timetable-header';
        corner.textContent = 'Time';
        timetableEl.appendChild(corner);

        // Day Headers
        for (let i = 0; i < daysCount; i++) {
            const dayIdx = (startDay + i) % 7;
            const header = document.createElement('div');
            header.className = 'timetable-header';
            header.textContent = days[dayIdx];
            timetableEl.appendChild(header);
        }

        // Rows
        for (let slot = 0; slot < totalSlots; slot++) {
            const minutesFromStart = slot * slotMinutes;
            const currentHour = config.startHour + Math.floor(minutesFromStart / 60);
            const currentMin = minutesFromStart % 60;
            const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

            // Time Label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = timeStr;
            timetableEl.appendChild(timeLabel);

            // Day Slots
            for (let day = 0; day < daysCount; day++) {
                const dayIdx = (startDay + day) % 7;
                const slotEl = document.createElement('div');
                slotEl.className = 'slot';
                slotEl.dataset.day = dayIdx;
                slotEl.dataset.time = timeStr;
                slotEl.onclick = () => openModal(null, dayIdx, timeStr);
                timetableEl.appendChild(slotEl);
            }
        }

        renderEvents();
    }

    function renderEvents() {
        // Remove existing events from DOM
        document.querySelectorAll('.event').forEach(e => e.remove());

        const slotMinutes = config.slotMinutes;
        const startHour = config.startHour;

        events.forEach(evt => {
            const dayOffset = getDayOffset(evt.day);
            if (dayOffset === -1 || dayOffset >= config.daysCount) return;

            const [h, m] = evt.start.split(':').map(Number);
            if (h < startHour || h >= config.endHour) return;

            const minutesFromStart = (h - startHour) * 60 + m;
            const slotIdx = Math.floor(minutesFromStart / slotMinutes);
            const rowOffset = slotIdx + 1; // +1 for header row
            const colOffset = dayOffset + 2; // +1 for corner, +1 for 1-based grid

            const durationSlots = evt.duration / slotMinutes;

            const eventEl = document.createElement('div');
            eventEl.className = `event priority-${evt.priority}`;
            eventEl.style.gridRow = `${rowOffset + 1} / span ${durationSlots}`; // +1 again because grid indices are 1-based and we have header
            eventEl.style.gridColumn = `${colOffset}`;

            eventEl.innerHTML = `
                <span class="event-title">${evt.title}</span>
                <span class="event-time">${evt.start} (${evt.duration}m)</span>
            `;

            eventEl.onclick = (e) => {
                e.stopPropagation();
                openModal(evt);
            };

            timetableEl.appendChild(eventEl);
        });
    }

    function getDayOffset(dayIdx) {
        for (let i = 0; i < config.daysCount; i++) {
            if ((config.startDay + i) % 7 === parseInt(dayIdx)) return i;
        }
        return -1;
    }

    function openModal(event = null, day = 0, time = '08:00') {
        modalEl.style.display = 'block';
        modalEl.setAttribute('aria-hidden', 'false');

        // Populate day dropdown
        const daySelect = document.getElementById('evt-day');
        daySelect.innerHTML = '';
        for (let i = 0; i < config.daysCount; i++) {
            const di = (config.startDay + i) % 7;
            const opt = document.createElement('option');
            opt.value = di;
            opt.textContent = days[di];
            daySelect.appendChild(opt);
        }

        if (event) {
            currentEventId = event.id;
            modalTitle.textContent = 'Edit timetable entry';
            deleteBtn.hidden = false;
            eventForm.title.value = event.title;
            eventForm.description.value = event.description;
            eventForm.day.value = event.day;
            eventForm.start.value = event.start;
            eventForm.duration.value = event.duration;
            eventForm.priority.value = event.priority;
            eventForm.tags.value = event.tags;
        } else {
            currentEventId = null;
            modalTitle.textContent = 'Create timetable entry';
            deleteBtn.hidden = true;
            eventForm.reset();
            eventForm.day.value = day;
            eventForm.start.value = time;
        }
    }

    function closeModal() {
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
    }

    function setupListeners() {
        document.getElementById('start-day').addEventListener('change', renderGrid);
        document.getElementById('days-count').addEventListener('change', renderGrid);
        document.getElementById('slot-minutes').addEventListener('change', renderGrid);

        document.getElementById('evt-cancel').onclick = closeModal;
        document.querySelector('.modal-backdrop').onclick = closeModal;

        document.getElementById('clear-storage').onclick = () => {
            if (confirm('Are you sure you want to clear all events?')) {
                events = [];
                saveEvents();
                renderGrid();
                if (window.TeacherCheer) window.TeacherCheer.show('All cleared!');
            }
        };

        deleteBtn.onclick = () => {
            events = events.filter(e => e.id !== currentEventId);
            saveEvents();
            renderGrid();
            closeModal();
            if (window.TeacherCheer) window.TeacherCheer.show('Entry deleted');
        };

        eventForm.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(eventForm);
            const evtData = Object.fromEntries(formData.entries());

            if (currentEventId) {
                const idx = events.findIndex(e => e.id === currentEventId);
                events[idx] = { ...events[idx], ...evtData };
            } else {
                evtData.id = Date.now().toString();
                events.push(evtData);
            }

            saveEvents();
            renderGrid();
            closeModal();
            if (window.TeacherCheer) window.TeacherCheer.show(currentEventId ? 'Updated!' : 'Saved to timetable!');
        };
    }

    function saveEvents() {
        localStorage.setItem('timetable_events', JSON.stringify(events));
    }

    init();
})();
