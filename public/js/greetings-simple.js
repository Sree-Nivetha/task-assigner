// Simple greeting widget: displays "Good morning/afternoon/evening, {name}".
// To use: include this script and place <div id="greeting" class="greeting"></div> in your header.

(function () {
    function getGreetingName() {
        // Try to read teacher name from a global config or localStorage fallback
        if (window.APP && window.APP.user && window.APP.user.name) return window.APP.user.name;
        return localStorage.getItem('teacherName') || 'Teacher';
    }

    function getGreetingText(date = new Date()) {
        const h = date.getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    function renderGreeting() {
        const el = document.getElementById('greeting');
        if (!el) return;
        const name = getGreetingName();
        const text = `${getGreetingText()}, ${name}!`; // Added comma and exclamation for better feel
        el.textContent = text;
        el.setAttribute('title', text);
    }

    // allow manual override of name
    window.setGreetingName = function (name) {
        localStorage.setItem('teacherName', name);
        renderGreeting();
    };

    // update greeting at the top of every hour to keep it accurate
    setInterval(renderGreeting, 1000 * 60 * 60);
    // initial render
    document.addEventListener('DOMContentLoaded', renderGreeting);
})();
