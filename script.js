// 1. CONFIGURATION & GLOBAL VARIABLES
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL8FSmuDcGE8hlGNOpEvTVQbGXBKpOCYv14ZG2Amnqy74QDR8NNWk3eoB6Doag9oZQTK5UjaGYBU-K/pub?output=csv';
let currentUser = "Gardener";
let myChart = null;
let deferredPrompt;
let focusInt;

// 2. PWA INSTALLATION & SERVICE WORKER LOGIC
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('ZenGarden Service Worker Registered'))
            .catch(err => console.log('Service Worker failed', err));
    });
}

// Capturing the Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("ZenGarden is ready to be installed.");
    // Optional: Trigger a custom install button here if you add one to the UI
});

window.addEventListener('appinstalled', () => {
    console.log('ZenGarden was installed successfully!');
    deferredPrompt = null;
});

// 3. AUTHENTICATION (CSV BASED)
async function handleLogin() {
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const user = userField.value.trim();
    const pass = passField.value.trim();
    
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').map(row => row.split(','));
        
        const isValid = rows.some(row => row[0].trim() === user && row[1].trim() === pass);
        
        if (isValid) {
            currentUser = user; 
            document.getElementById('welcome-msg').innerText = `Hi, ${currentUser}! 🌿`;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            
            // Initialize App Components
            updateGardenUI();
            initChart();
            loadEntries();
            
            // Request Notification Permission for Focus Mode
            if (Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        } else {
            document.getElementById('login-error').innerText = "Invalid credentials.";
        }
    } catch (e) {
        console.error("Auth failed", e);
        document.getElementById('login-error').innerText = "Error connecting to database.";
    }
}

// 4. NAVIGATION
function showSection(id) {
    ['mood', 'journal', 'balance'].forEach(s => {
        document.getElementById(s + '-section').style.display = (s === id) ? 'block' : 'none';
    });
}

// 5. MOOD TRACKING & SUGGESTIONS
function setMood(mood) {
    growPlant();
    const todoArea = document.getElementById('todo-area');
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = "";
    todoArea.style.display = 'block';

    let suggestions = [];
    if (mood === 'Stressed') {
        suggestions = ['5 min deep breathing', 'Listen to nature sounds', 'Stretch your neck'];
    } else if (mood === 'Happy') {
        suggestions = ['Message a friend', 'Take a 10-min walk', 'Write one win'];
    } else if (mood === 'Calm') {
        suggestions = ['Read a book chapter', 'Water your plants', '2 mins of silence'];
    }

    suggestions.forEach(task => {
        const li = document.createElement('li');
        li.innerText = task;
        todoList.appendChild(li);
    });
}

// 6. JOURNALING & EXPORT
function saveJournal() {
    const text = document.getElementById('journal-input').value;
    if (!text) return;
    
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    entries.unshift({ date: new Date().toLocaleString(), content: text });
    localStorage.setItem('journals', JSON.stringify(entries));
    document.getElementById('journal-input').value = "";
    
    growPlant();
    loadEntries();
}

function loadEntries() {
    const display = document.getElementById('past-entries');
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    display.innerHTML = entries.map(e => `
        <div style="border-bottom:1px solid #eee; margin-top:10px; padding-bottom:5px;">
            <small>${e.date}</small><p>${e.content}</p>
        </div>`).join('');
}

function exportJournal() {
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    let content = `ZenGarden Reflection Logs for ${currentUser}\n\n`;
    entries.forEach(e => content += `[${e.date}]: ${e.content}\n`);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ZenGarden_Journal.txt';
    a.click();
}

// 7. DATA VISUALIZATION (CHART.JS)
function initChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Work Hours', 'Social/Rest Hours'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#ff9999', '#99ff99'],
                borderWidth: 1
            }]
        },
        options: { responsive: true }
    });
}

function updateChart() {
    const w = document.getElementById('work-hrs').value || 0;
    const s = document.getElementById('social-hrs').value || 0;
    myChart.data.datasets[0].data = [w, s];
    myChart.update();
}

// 8. FOCUS MODE & NOTIFICATIONS
function toggleFocusMode() {
    const btn = document.getElementById('focus-btn');
    if (btn.innerText.includes("Active")) {
        clearInterval(focusInt);
        btn.innerText = "Enable Deep Focus Mode";
        btn.classList.remove('focus-active');
    } else {
        btn.innerText = "Focus Mode Active";
        btn.classList.add('focus-active');
        
        // Push initial notification
        if (Notification.permission === "granted") {
            new Notification("ZenGarden", { body: "Deep Focus Mode started! 🌿", icon: "https://via.placeholder.com/192" });
        }

        focusInt = setInterval(() => {
            if (Notification.permission === "granted") {
                new Notification("Time to stretch!", { body: "Blink, drink water, and check your posture. 💧", icon: "https://via.placeholder.com/192" });
            }
        }, 1200000); // 20 minutes
    }
}

// 9. GAMIFICATION & THEME
function growPlant() {
    let garden = JSON.parse(localStorage.getItem('garden') || '[]');
    garden.push('🌱');
    localStorage.setItem('garden', JSON.stringify(garden));
    updateGardenUI();
}

function updateGardenUI() {
    const box = document.getElementById('plant-box');
    const garden = JSON.parse(localStorage.getItem('garden') || '[]');
    box.innerText = garden.join(' ');
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? "☀️ Day Mode" : "🌙 Sunset Mode";
}
