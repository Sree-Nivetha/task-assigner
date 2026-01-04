// greetings.js
// Usage: include this script and call initGreeting({ selector: '#greeting', name: 'Vignesh' })
(function () {
    const greetings = {
        morning: ['Good morning', 'Morning, bright teacher', 'Top of the morning!'],
        afternoon: ['Good afternoon', 'Hope your afternoon is going well', 'Good day!'],
        evening: ['Good evening', 'Hope you had a great day', 'Good evening, relax!']
    };

    const cheerPhrases = [
        'Great job!', 'Well done!', 'You nailed it!', 'Keep it up!', 'Fantastic work!', 'Amazing!'
    ];

    function getTimeOfDay(date = new Date()) {
        const hour = date.getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        return 'evening';
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function formatGreeting(name) {
        const tod = getTimeOfDay();
        const greet = pickRandom(greetings[tod]);
        return `${greet}${name ? ', ' + name : ''}!`;
    }

    function initGreeting({ selector = '#greeting', name = '' } = {}) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.textContent = formatGreeting(name);
        // Update greeting on minute boundary to handle transitions (e.g., 11:59 -> 12:00)
        setInterval(() => {
            el.textContent = formatGreeting(name);
        }, 60 * 1000);
    }

    function getCheer() {
        return pickRandom(cheerPhrases);
    }

    // Export to global
    window.TeacherUI = window.TeacherUI || {};
    window.TeacherUI.initGreeting = initGreeting;
    window.TeacherUI.getCheer = getCheer;
})(); 
