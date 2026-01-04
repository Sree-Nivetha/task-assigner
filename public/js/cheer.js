// Cheer utility: shows positive reinforcement
(function () {
    const cheerPhrases = [
        'Great job!', 'Well done!', 'You nailed it!', 'Keep it up!', 'Fantastic work!', 'Amazing!', 'Brilliant!', 'Victory!'
    ];

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function showCheer(msg) {
        const cheer = msg || pickRandom(cheerPhrases);
        const toast = document.createElement('div');
        toast.className = 'cheer-toast';
        toast.textContent = cheer;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 2500);
    }

    window.TeacherCheer = { show: showCheer };
})();
