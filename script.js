const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL8FSmuDcGE8hlGNOpEvTVQbGXBKpOCYv14ZG2Amnqy74QDR8NNWk3eoB6Doag9oZQTK5UjaGYBU-K/pub?output=csv';

// 1. Authentication Logic
async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').map(row => row.split(','));
        
        // Assuming CSV columns: Username, Password
        const isValid = rows.some(row => row[0].trim() === user && row[1].trim() === pass);
        
        if (isValid) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            loadEntries();
        } else {
            document.getElementById('login-error').innerText = "Invalid credentials.";
        }
    } catch (e) {
        console.error("Auth failed", e);
    }
}

// 2. Navigation
function showSection(id) {
    ['mood', 'journal', 'balance'].forEach(s => {
        document.getElementById(s + '-section').style.display = (s === id) ? 'block' : 'none';
    });
}

// 3. Mood Tracking
function setMood(mood) {
    const todoArea = document.getElementById('todo-area');
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = "";
    
    if (mood === 'Stressed') {
        todoArea.style.display = 'block';
        ['5 min breathing', 'Drink herbal tea', 'Short walk'].forEach(task => {
            const li = document.createElement('li');
            li.innerText = task;
            todoList.appendChild(li);
        });
    } else {
        todoArea.style.display = 'none';
        alert(`Glad you are feeling ${mood}!`);
    }
}

// 4. Journaling (Saving to LocalStorage)
function saveJournal() {
    const text = document.getElementById('journal-input').value;
    if (!text) return;
    
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    entries.push({ date: new Date().toLocaleDateString(), content: text });
    localStorage.setItem('journals', JSON.stringify(entries));
    document.getElementById('journal-input').value = "";
    loadEntries();
}

function loadEntries() {
    const display = document.getElementById('past-entries');
    const entries = JSON.parse(localStorage.getItem('journals') || '[]');
    display.innerHTML = entries.map(e => `<div style="border-bottom:1px solid #eee; margin-top:10px;">
        <small>${e.date}</small><p>${e.content}</p></div>`).join('');
}

// 5. Focus Mode & Reminders
let focusInterval;
function toggleFocusMode() {
    const btn = document.getElementById('focus-btn');
    if (btn.classList.contains('focus-active')) {
        btn.classList.remove('focus-active');
        btn.innerText = "Enable Deep Focus Mode";
        clearInterval(focusInterval);
    } else {
        btn.classList.add('focus-active');
        btn.innerText = "Deep Focus Active...";
        focusInterval = setInterval(() => {
            alert("Reminder: Take a sip of water and check your posture! 🌿");
        }, 300000); // Every 5 minutes
    }
}
