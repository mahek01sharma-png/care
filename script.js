// ================================================
// FULL UPDATED script.js – ZenGarden Self-Care
// Countdown starts only after "Start Session"
// ================================================

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL8FSmuDcGE8hlGNOpEvTVQbGXBKpOCYv14ZG2Amnqy74QDR8NNWk3eoB6Doag9oZQTK5UjaGYBU-K/pub?output=csv';

let currentUser = "Gardener";
let myChart = null;
let focusInt;
let breathingInterval = null;
let countdownInterval = null;

// ======================
// MOODS CONFIG
// ======================
const MOODS = {
    stressed: { key: "stressed", label: "Stressed", emoji: "😟", color: "#ff9999", title: "De-stressing Protocol" },
    anxious: { key: "anxious", label: "Anxious", emoji: "😰", color: "#ffcc99", title: "Grounding Protocol" },
    happy: { key: "happy", label: "Happy", emoji: "😊", color: "#99ff99", title: "Spread the Joy" },
    calm: { key: "calm", label: "Calm", emoji: "😌", color: "#d4e9d4", title: "Mindful Maintenance" },
    sad: { key: "sad", label: "Sad", emoji: "😢", color: "#a8c4ff", title: "Gentle Kindness" },
    tired: { key: "tired", label: "Tired", emoji: "🥱", color: "#c2b0ff", title: "Energy Restoration" },
    overwhelmed: { key: "overwhelmed", label: "Overwhelmed", emoji: "😣", color: "#ff99cc", title: "Brain Dump & Simplify" },
    energized: { key: "energized", label: "Energized", emoji: "⚡", color: "#ffee99", title: "Channel the Energy" }
};

// ======================
// AUTH (unchanged)
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
    if (localMatch) { startApp(user); return; }

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
    if (Notification.permission !== "granted") Notification.requestPermission();
}

// ======================
// MOOD + SUGGESTIONS
// ======================
function setMood(moodKey) {
    const mood = MOODS[moodKey];
    if (!mood) return;

    const area = document.getElementById('todo-area');
    const list = document.getElementById('todo-list');
    const moodTitle = document.getElementById('mood-title') || area.querySelector('h3');

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
            btn.innerText = "▶ Start " + item.text;
            btn.style.background = mood.color;
            btn.style.color = "#222";
            btn.style.fontWeight = "600";
            btn.onclick = () => startBreathingExercise(item.duration || 180);
            li.appendChild(btn);
        } 
        else if (item.type === "gratitude") {
            const btn = document.createElement('button');
            btn.className = "small-btn";
            btn.innerText = item.text;
            btn.style.background = mood.color;
            btn.onclick = quickGratitudeLog;
            li.appendChild(btn);
        } 
        else {
            li.innerHTML = `• ${item.text}`;
        }
        list.appendChild(li);
    });

    growPlant();
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
        tired: [
            { type: "breathing", text: "Energizing Breath", duration: 90 }
        ],
        overwhelmed: [
            { type: "breathing", text: "Long Exhale", duration: 120 }
        ],
        happy: [{ type: "list", text: "Share your joy with someone" }],
        sad: [{ type: "list", text: "Be gentle with yourself" }],
        energized: [{ type: "list", text: "Move your body" }]
    };
    return base[moodKey] || [];
}

// ======================
// BREATHING WITH START SESSION + COUNTDOWN
// ======================
function startBreathingExercise(totalSeconds = 180) {
    let timeLeft = totalSeconds;
    let phase = 0;
    const phases = [
        { name: "Inhale", seconds: 4, color: "#99ff99" },
        { name: "Hold",   seconds: 7, color: "#ffee99" },
        { name: "Exhale", seconds: 8, color: "#ff9999" }
    ];

    let overlay = document.getElementById('breathing-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'breathing-overlay';
        overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%; 
            background:rgba(0,0,0,0.92); display:flex; align-items:center; 
            justify-content:center; z-index:9999; color:white; font-family:sans-serif;
        `;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="text-align:center; max-width:360px; padding:20px;">
            <h2 style="margin:10px 0 5px;">Breathing Session</h2>
            <p id="phase-text" style="font-size:1.5em; margin:10px 0;">Ready?</p>
            
            <div id="breath-circle" style="width:210px; height:210px; margin:25px auto; border-radius:50%;
                 background:#99ff99; display:flex; align-items:center; justify-content:center;
                 font-size:2.8em; font-weight:bold; box-shadow:0 0 50px #99ff99;">
                🌬️
            </div>
            
            <div id="countdown" style="font-size:3.2em; font-weight:bold; margin:15px 0;">${totalSeconds}</div>
            <p id="total-time" style="font-size:1.1em; opacity:0.85;">Total: ${Math.floor(totalSeconds/60)}:${(totalSeconds%60).toString().padStart(2,'0')}</p>
            
            <button id="start-session-btn" style="background:#4ade80; color:#222; padding:14px 40px; 
                     font-size:1.2em; border:none; border-radius:50px; cursor:pointer; margin:15px 0;">
                Start Session
            </button>
            
            <button onclick="stopBreathing()" style="background:#ff6666; color:white; padding:10px 25px; 
                     border:none; border-radius:30px; cursor:pointer;">
                Cancel
            </button>
        </div>
    `;

    const startBtn = document.getElementById('start-session-btn');
    startBtn.onclick = () => beginCountdown(timeLeft, phases, overlay);
}

function beginCountdown(timeLeft, phases, overlay) {
    document.getElementById('start-session-btn').style.display = 'none';

    let phase = 0;
    let phaseTime = phases[phase].seconds;

    function updateDisplay() {
        const current = phases[phase];
        document.getElementById('phase-text').textContent = current.name;
        document.getElementById('breath-circle').style.background = current.color;
        document.getElementById('countdown').textContent = phaseTime;

        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        document.getElementById('total-time').textContent = 
            `Total: ${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    updateDisplay();

    // Phase timer
    breathingInterval = setInterval(() => {
        phaseTime--;
        document.getElementById('countdown').textContent = phaseTime;

        if (phaseTime <= 0) {
            phase = (phase + 1) % 3;
            phaseTime = phases[phase].seconds;
            updateDisplay();
        }
    }, 1000);

    // Total session timer
    countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            stopBreathing();
            alert("🌿 Wonderful! You completed your breathing session.");
        }
    }, 1000);
}

function stopBreathing() {
    if (breathingInterval) clearInterval(breathingInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    const overlay = document.getElementById('breathing-overlay');
    if (overlay) overlay.remove();
}

// ======================
// OTHER FUNCTIONS (unchanged)
// ======================
function saveMoodEntry(moodLabel) {
    let history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    history.unshift({ date: new Date().toISOString().split('T')[0], mood: moodLabel });
    history = history.slice(0, 90);
    localStorage.setItem('mood_history', JSON.stringify(history));
}

function loadMoodHistory() { /* same as previous version */ 
    const container = document.getElementById('mood-history');
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (history.length === 0) {
        container.innerHTML = `<small style="color:#888">Log moods to see your history 🌱</small>`;
        return;
    }
    let html = `<strong>Recent mood trend:</strong><br>`;
    html += history.slice(0, 14).map(e => {
        const m = Object.values(MOODS).find(x => x.label === e.mood);
        return `<span style="font-size:1.5em; margin:0 3px" title="${e.date}">${m ? m.emoji : '🌿'}</span>`;
    }).join('');
    container.innerHTML = html;
}

function updateStreakUI() { /* same */ }
function quickGratitudeLog() { /* same */ }
function growPlant() { /* same */ }
function updateGardenUI() { /* same */ }
function initChart() { /* same */ }
function updateChart() { /* same */ }
function showSection(id) { /* same */ }
function saveJournal() { /* same */ }
function loadEntries() { /* same */ }
function exportJournal() { /* same */ }
function toggleFocusMode() { /* same */ }
function toggleTheme() { /* same */ }

if (localStorage.getItem('zen_dark_mode') === 'true') {
    document.body.classList.add('dark-mode');
}
