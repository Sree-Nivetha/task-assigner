// Simple greeting widget: displays "Good morning/afternoon/evening, {name}".
(function () {
    function getGreetingName() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.username) return user.username;
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
        const text = `${getGreetingText()}, ${name}!`;
        el.textContent = text;
        el.setAttribute('title', text);
    }

    window.setGreetingName = function (name) {
        localStorage.setItem('teacherName', name);
        renderGreeting();
    };

    const setNameBtn = document.getElementById('set-name-btn');
    if (setNameBtn) {
        setNameBtn.addEventListener('click', () => {
            const name = prompt('Enter your name:', getGreetingName());
            if (name) window.setGreetingName(name);
        });
    }

    setInterval(renderGreeting, 1000 * 60 * 60);
    document.addEventListener('DOMContentLoaded', renderGreeting);
})();
