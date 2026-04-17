// ================================================
// FINAL VERIFIED script.js – ZenGarden Self-Care
// ================================================

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL8FSmuDcGE8hlGNOpEvTVQbGXBKpOCYv14ZG2Amnqy74QDR8NNWk3eoB6Doag9oZQTK5UjaGYBU-K/pub?output=csv';

let currentUser = "Gardener";
let myChart = null;
let focusInt = null;
let breathingInterval = null;
let countdownInterval = null;

// ======================
// MOODS CONFIG
// ======================
const MOODS = {
    stressed:    { key: "stressed",    label: "Stressed",    emoji: "😟", color: "#ff9999", title: "De-stressing Protocol" },
    anxious:     { key: "anxious",     label: "Anxious",     emoji: "😰", color: "#ffcc99", title: "Grounding Protocol" },
    happy:       { key: "happy",       label: "Happy",       emoji: "😊", color: "#99ff99", title: "Spread the Joy" },
    calm:        { key: "calm",        label: "Calm",        emoji: "😌", color: "#d4e9d4", title: "Mindful Maintenance" },
    sad:         { key: "sad",         label: "Sad",         emoji: "😢", color: "#a8c4ff", title: "Gentle Kindness" },
    tired:       { key: "tired",       label: "Tired",       emoji: "🥱", color: "#c2b0ff", title: "Energy Restoration" },
    overwhelmed: { key: "overwhelmed", label: "Overwhelmed", emoji: "😣", color: "#ff99cc", title: "Brain Dump & Simplify" },
    energized:   { key: "energized",   label: "Energized",   emoji: "⚡", color: "#ffee99", title: "Channel the Energy" }
};

// ======================
// AUTHENTICATION
// ======================
function toggleAuth(showRegister) {
    document.getElementById('login-form').style.display = showRegister ? 'none' : 'block';
    document.getElementById('register-form').style.display = showRegister ? 'block' : 'none';
}

async function handleLogin() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!user || !pass) return;

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
        document.getElementById('auth-error').innerText = "Could not reach database.";
    }
}

function handleRegister() {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    if (user.length < 3) return alert("Username too short");
    if (pass.length < 4) return alert("Password too short");

    let localUsers = JSON.parse(localStorage.getItem('zen_users') || '[]');
    if (localUsers.some(u => u.username === user)) return alert("Username already taken");

    localUsers.push({ username: user, password: pass });
    localStorage.setItem('zen_users', JSON.stringify(localUsers));
    alert("Account created! 🌱");
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
    loadMoodHistory();
    updateStreakUI();
    
    showSection('mood');
    
    if (Notification.permission !== "granted") Notification.requestPermission();
}

// ======================
// SECTION NAVIGATION
// ======================
function showSection(id) {
    document.getElementById('mood-section').style.display = (id === 'mood') ? 'block' : 'none';
    document.getElementById('journal-section').style.display = (id === 'journal') ? 'block' : 'none';
    document.getElementById('balance-section').style.display = (id === 'balance') ? 'block' : 'none';
}

// ======================
// MOOD LOGIC + BREATHING
// ======================
function setMood(moodKey) {
    const mood = MOODS[moodKey];
    if (!mood) return;

    const area = document.getElementById('todo-area');
    const list = document.getElementById('todo-list');
    const moodTitle = document.getElementById('mood-title') || document.createElement('h3'); 
    
    // Ensure mood-title exists in HTML
    if (!document.getElementById('mood-title')) {
        moodTitle.id = 'mood-title';
        area.prepend(moodTitle);
    }

    area.style.display = 'block';
    list.innerHTML = "";
    moodTitle.innerText = `${mood.emoji} ${mood.title}`;
    area.style.borderLeft = `6px solid ${mood.color}`;

    saveMoodEntry(mood.label);
    const suggestions = getSuggestionsForMood(moodKey);

    suggestions.forEach(item => {
        const li = document.createElement('li');
        li.style.padding = "12px 0";
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.gap = "12px";

        if (item.type === "breathing") {
            const btn = document.createElement('button');
            btn.className = "small-btn";
            btn.innerText = `▶ Start ${item.text}`;
            btn.style.background = mood.color;
            btn.style.padding = "8px 15px";
            btn.style.borderRadius = "20px";
            btn.style.border = "none";
            btn.onclick = () => startBreathingExercise(item.duration || 180);
            li.appendChild(btn);
        } else if (item.type === "gratitude") {
            const btn = document.createElement('button');
            btn.className = "small-btn";
            btn.innerText = item.text;
            btn.style.background = mood.color;
            btn.style.padding = "8px 15px";
            btn.style.borderRadius = "20px";
            btn.style.border = "none";
            btn.onclick = quickGratitudeLog;
            li.appendChild(btn);
        } else {
            li.innerHTML = `• ${item.text}`;
        }
        list.appendChild(li);
    });

    growPlant();
    loadMoodHistory();
    updateStreakUI();
}

function getSuggestionsForMood(moodKey) {
    const base = {
        stressed: [
            { type: "breathing", text: "4-7-8 Breathing", duration: 180 },
            { type: "list", text: "Drink water slowly" },
            { type: "list", text: "Write one thing you can control" }
        ],
        anxious: [
            { type: "breathing", text: "Grounding Breath", duration: 150 },
            { type: "list", text: "Name 5 things you can see" }
        ],
        calm: [
            { type: "breathing", text: "Box Breathing", duration: 180 },
            { type: "gratitude", text: "Quick Gratitude" }
        ],
        tired: [{ type: "breathing", text: "Energizing Breath", duration: 90 }],
        overwhelmed: [{ type: "breathing", text: "Long Exhale", duration: 120 }],
        happy: [{ type: "list", text: "Share your joy with someone" }],
        sad: [{ type: "list", text: "Be gentle with yourself" }],
        energized: [{ type: "list", text: "Move your body" }]
    };
    return base[moodKey] || [];
}

// ======================
// BREATHING OVERLAY LOGIC
// ======================
function startBreathingExercise(totalSeconds = 180) {
    let timeLeft = totalSeconds;
    const phases = [
        { name: "Inhale", seconds: 4, color: "#99ff99" },
        { name: "Hold",   seconds: 7, color: "#ffee99" },
        { name: "Exhale", seconds: 8, color: "#ff9999" }
    ];

    let overlay = document.getElementById('breathing-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'breathing-overlay';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);
            display:flex;align-items:center;justify-content:center;z-index:9999;color:white;font-family:sans-serif;`;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="text-align:center; max-width:360px; padding:20px;">
            <h2>Breathing Session</h2>
            <p id="phase-text" style="font-size:1.5em;margin:10px 0;">Ready?</p>
            <div id="breath-circle" style="width:150px;height:150px;margin:25px auto;border-radius:50%;
                 background:#99ff99;display:flex;align-items:center;justify-content:center;
                 font-size:2.5em;transition: all 4s ease-in-out;">🌬️</div>
            <div id="countdown" style="font-size:3em;font-weight:bold;margin:15px 0;">${totalSeconds}</div>
            <p id="total-time" style="font-size:1.1em;opacity:0.85;">Total: ${Math.floor(totalSeconds/60)}:00</p>
            <button id="start-session-btn" style="background:#4ade80;color:#222;padding:12px 30px;
                     font-size:1.1em;border:none;border-radius:50px;cursor:pointer;margin:15px 0;">
                Start Session
            </button>
            <br>
            <button onclick="stopBreathing()" style="background:none;color:#ff6666;border:none;cursor:pointer;text-decoration:underline;">Cancel</button>
        </div>
    `;

    document.getElementById('start-session-btn').onclick = () => beginCountdown(timeLeft, phases);
}

function beginCountdown(timeLeft, phases) {
    document.getElementById('start-session-btn').style.display = 'none';
    let phase = 0;
    let phaseTime = phases[phase].seconds;

    const updateDisplay = () => {
        const current = phases[phase];
        document.getElementById('phase-text').textContent = current.name;
        document.getElementById('breath-circle').style.background = current.color;
        document.getElementById('breath-circle').style.transform = current.name === "Inhale" ? "scale(1.2)" : "scale(1)";
        document.getElementById('countdown').textContent = phaseTime;
    };

    updateDisplay();

    breathingInterval = setInterval(() => {
        phaseTime--;
        document.getElementById('countdown').textContent = phaseTime;
        if (phaseTime <= 0) {
            phase = (phase + 1) % 3;
            phaseTime = phases[phase].seconds;
            updateDisplay();
        }
    }, 1000);

    countdownInterval = setInterval(() => {
        timeLeft--;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        document.getElementById('total-time').textContent = `Total: ${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (timeLeft <= 0) {
            stopBreathing();
            alert("🌿 Session Complete!");
        }
    }, 1000);
}

function stopBreathing() {
    clearInterval(breathingInterval);
    clearInterval(countdownInterval);
    const overlay = document.getElementById('breathing-overlay');
    if (overlay) overlay.remove();
}

// ======================
// MOOD HISTORY & STREAK
// ======================
function saveMoodEntry(moodLabel) {
    let history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const today = new Date().toISOString().split('T')[0];
    history.unshift({ date: today, mood: moodLabel });
    localStorage.setItem('mood_history', JSON.stringify(history.slice(0, 90)));
}

function loadMoodHistory() {
    const container = document.getElementById('mood-history');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<small style="color:#888">Log your mood to see trends 🌱</small>`;
        return;
    }
    let html = `<strong>Recent trend:</strong> `;
    html += history.slice(0, 7).map(e => {
        const m = Object.values(MOODS).find(x => x.label === e.mood);
        return `<span>${m ? m.emoji : '🌿'}</span>`;
    }).join(' ');
    container.innerHTML = html;
}

function updateStreakUI() {
    const streakEl = document.getElementById('streak-counter');
    if (!streakEl) return;
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    streakEl.style.display = history.length > 0 ? 'block' : 'none';
}

// ======================
// GARDEN LOGIC
// ======================
function growPlant() {
    let garden = JSON.parse(localStorage.getItem('garden') || '[]');
    const plants = ['🌱','🌿','🍀','🍃','🌸','🌼','🌺','🪴'];
    garden.push(plants[Math.floor(Math.random() * plants.length)]);
    if (garden.length > 50) garden.shift();
    localStorage.setItem('garden', JSON.stringify(garden));
    updateGardenUI();
}

function updateGardenUI() {
    const box = document.getElementById('plant-box');
    if (box) {
        const garden = JSON.parse(localStorage.getItem('garden') || '[]');
        box.innerText = garden.join(' ');
    }
}

// ======================
// JOURNAL & BALANCE
// ======================
function saveJournal() {
    const val = document.getElementById('journal-input').value.trim();
    if (!val) return alert("Write something first! 🌿");
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    entries.unshift({ date: new Date().toLocaleDateString(), content: val });
    localStorage.setItem('journals', JSON.stringify(entries));
    document.getElementById('journal-input').value = "";
    growPlant();
    loadEntries();
}

function loadEntries() {
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    const container = document.getElementById('past-entries');
    if (container) {
        container.innerHTML = entries.map(e => `
            <div style="border-bottom:1px solid #eee; margin-top:10px; padding-bottom:5px;">
                <small>${e.date}</small><p>${e.content}</p>
            </div>`).join('');
    }
}

function exportJournal() {
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    let txt = "ZenGarden Journal\n\n";
    entries.forEach(e => txt += `${e.date}: ${e.content}\n\n`);
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ZenGarden_Journal.txt`;
    a.click();
}

function initChart() {
    const ctx = document.getElementById('balanceChart');
    if (!ctx) return;
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Work', 'Rest'],
            datasets: [{ data: [1, 1], backgroundColor: ['#ff9999', '#99ff99'] }]
        },
        options: { cutout: "70%", responsive: true }
    });
}

function updateChart() {
    const w = parseFloat(document.getElementById('work-hrs').value) || 0;
    const s = parseFloat(document.getElementById('social-hrs').value) || 0;
    if (myChart) {
        myChart.data.datasets[0].data = [w, s];
        myChart.update();
    }
}

// ======================
// EXTRAS
// ======================
function quickGratitudeLog() {
    const entry = prompt("What are you grateful for?");
    if (entry) { growPlant(); alert("Saved! 🌼"); }
}

function toggleFocusMode() {
    const btn = document.getElementById('focus-btn');
    if (btn.innerText.includes("Active")) {
        clearInterval(focusInt);
        btn.innerText = "Deep Focus Mode";
    } else {
        btn.innerText = "Focus Active 🌿";
        focusInt = setInterval(() => {
            if (Notification.permission === "granted") new Notification("ZenGarden: Take a stretch! 🌱");
        }, 1200000);
    }
}

// ======================
// THEME MANAGEMENT
// ======================
const THEMES = [
    { id: 'light', name: 'Light Zen', color: '#f8fafc' },
    { id: 'dark', name: 'Midnight', color: '#1e293b' },
    { id: 'sakura', name: 'Sakura Pink', color: '#ffb7c5' },
    { id: 'forest', name: 'Deep Forest', color: '#2d5a27' },
    { id: 'ocean', name: 'Ocean Tide', color: '#0077be' },
    { id: 'sunset', name: 'Vibrant Sunset', color: '#ff4e50' },
    { id: 'lavender', name: 'Lavender Mist', color: '#967bb6' },
    { id: 'citrus', name: 'Citrus Punch', color: '#ffb347' },
    { id: 'nebula', name: 'Cosmic Nebula', color: '#4831d4' },
    { id: 'mint', name: 'Fresh Mint', color: '#3eb489' },
    { id: 'ruby', name: 'Ruby Glow', color: '#e0115f' },
    { id: 'gold', name: 'Golden Hour', color: '#daa520' }
];

function setTheme(themeId) {
    // Remove previous theme class or set attribute
    document.body.setAttribute('data-theme', themeId);
    
    // Optional: Update UI or save to storage
    localStorage.setItem('zen_theme', themeId);
    console.log(`Theme changed to: ${themeId}`);
}

// Call this inside startApp() to load the user's saved theme
function loadSavedTheme() {
    const saved = localStorage.getItem('zen_theme') || 'light';
    setTheme(saved);
}
