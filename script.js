const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL8FSmuDcGE8hlGNOpEvTVQbGXBKpOCYv14ZG2Amnqy74QDR8NNWk3eoB6Doag9oZQTK5UjaGYBU-K/pub?output=csv';
let currentUser = "Gardener";
let myChart = null;
let focusInt;

// 1. AUTHENTICATION & REGISTRATION
function toggleAuth(showRegister) {
    document.getElementById('login-form').style.display = showRegister ? 'none' : 'block';
    document.getElementById('register-form').style.display = showRegister ? 'block' : 'none';
}

async function handleLogin() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const localUsers = JSON.parse(localStorage.getItem('zen_users') || '[]');
    const localMatch = localUsers.find(u => u.username === user && u.password === pass);

    if (localMatch) {
        startApp(user);
        return;
    }

    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').map(r => r.split(','));
        if (rows.some(r => r[0].trim() === user && r[1].trim() === pass)) {
            startApp(user);
        } else {
            document.getElementById('auth-error').innerText = "Invalid credentials.";
        }
    } catch (e) {
        document.getElementById('auth-error').innerText = "Database error.";
    }
}

function handleRegister() {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    if (user.length < 3) return alert("Username too short");

    let localUsers = JSON.parse(localStorage.getItem('zen_users') || '[]');
    localUsers.push({ username: user, password: pass });
    localStorage.setItem('zen_users', JSON.stringify(localUsers));
    alert("Account created!");
    toggleAuth(false);
}

function startApp(user) {
    currentUser = user;
    document.getElementById('welcome-msg').innerText = `Hi, ${user}! 🌿`;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    updateGardenUI();
    initChart();
    loadEntries();
    if (Notification.permission !== "granted") Notification.requestPermission();
}

// 2. MOOD LOGIC (EXPANDED)
function setMood(mood) {
    const area = document.getElementById('todo-area');
    const list = document.getElementById('todo-list');
    const moodTitle = area.querySelector('h3');
    
    area.style.display = 'block';
    list.innerHTML = "";
    
    // Grow a plant for interacting with your wellness
    growPlant();

    let suggestions = [];

    if (mood === 'Stressed') {
        moodTitle.innerText = "De-stressing Protocol:";
        suggestions = [
            'Try the 4-7-8 breathing technique',
            'Step away from the screen for 5 minutes',
            'Drink a glass of water',
            'Write one thing you can control right now'
        ];
        // Visual feedback: Subtle red glow to acknowledge stress
        area.style.borderLeft = "5px solid #ff9999";
    } else if (mood === 'Happy') {
        moodTitle.innerText = "Spread the Joy:";
        suggestions = [
            'Message a friend or family member',
            'Put on your favorite upbeat song',
            'Plan a small reward for later today',
            'Take a photo of something beautiful'
        ];
        area.style.borderLeft = "5px solid #99ff99";
    } else if (mood === 'Calm') {
        moodTitle.innerText = "Mindful Maintenance:";
        suggestions = [
            'Practice 2 minutes of seated meditation',
            'Light a candle or use an essential oil',
            'List three things you are grateful for',
            'Do some light neck and shoulder stretches'
        ];
        area.style.borderLeft = "5px solid #d4e9d4";
    }

    suggestions.forEach(task => {
        const li = document.createElement('li');
        li.innerText = task;
        li.style.padding = "5px 0";
        list.appendChild(li);
    });
}

// 3. GARDEN GAMIFICATION
function growPlant() {
    let garden = JSON.parse(localStorage.getItem('garden') || '[]');
    // Cycle through different plant emojis
    const plantTypes = ['🌱', '🌿', '🍀', '🍃', '🌸', '🌼'];
    const randomPlant = plantTypes[Math.floor(Math.random() * plantTypes.length)];
    
    garden.push(randomPlant);
    localStorage.setItem('garden', JSON.stringify(garden));
    updateGardenUI();
}

function updateGardenUI() {
    const box = document.getElementById('plant-box');
    const garden = JSON.parse(localStorage.getItem('garden') || '[]');
    box.innerText = garden.join(' ');
}

// 4. CHART & REMAINING LOGIC
function initChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Work', 'Social/Rest'],
            datasets: [{ data: [1, 1], backgroundColor: ['#ff9999', '#99ff99'] }]
        }
    });
}

function updateChart() {
    const w = document.getElementById('work-hrs').value || 0;
    const s = document.getElementById('social-hrs').value || 0;
    myChart.data.datasets[0].data = [w, s];
    myChart.update();
}

function showSection(id) {
    ['mood', 'journal', 'balance'].forEach(s => {
        document.getElementById(s + '-section').style.display = (s === id) ? 'block' : 'none';
    });
}

function saveJournal() {
    const val = document.getElementById('journal-input').value;
    if(!val) return;
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    entries.unshift({ date: new Date().toLocaleDateString(), content: val });
    localStorage.setItem('journals', JSON.stringify(entries));
    document.getElementById('journal-input').value = "";
    growPlant();
    loadEntries();
}

function loadEntries() {
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    document.getElementById('past-entries').innerHTML = entries.map(e => `
        <div style="border-bottom:1px solid #eee; margin-top:10px;">
            <small>${e.date}</small><p>${e.content}</p>
        </div>`).join('');
}

function exportJournal() {
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    let content = "ZenGarden Reflection Log\n\n";
    entries.forEach(e => content += `${e.date}: ${e.content}\n`);
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'MyJournal.txt';
    a.click();
}

function toggleFocusMode() {
    const btn = document.getElementById('focus-btn');
    if (btn.innerText.includes("Active")) {
        clearInterval(focusInt);
        btn.innerText = "Deep Focus Mode";
    } else {
        btn.innerText = "Focus Active";
        focusInt = setInterval(() => {
            if (Notification.permission === "granted") new Notification("ZenGarden: Check your posture! 🌿");
        }, 1200000);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}
