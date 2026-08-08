let apiToken = '';
let currentUserId = null;
let currentFilter = 'all';
let pollInterval = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const chatList = document.getElementById('chat-list');
const waitingBadge = document.getElementById('waiting-badge');
const filterBtns = document.querySelectorAll('.filter-btn');

const emptyState = document.getElementById('empty-state');
const activeChat = document.getElementById('active-chat');
const chatTitle = document.getElementById('current-user-id');
const modeBadge = document.getElementById('current-mode-badge');
const messagesContainer = document.getElementById('messages-container');

const btnTakeover = document.getElementById('btn-takeover');
const btnReturnAi = document.getElementById('btn-return-ai');
const sendForm = document.getElementById('send-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const composerOverlay = document.getElementById('composer-overlay');

// Login Handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = passwordInput.value;
    apiToken = btoa(`admin:${pwd}`);
    
    try {
        const res = await fetch('/api/dashboard/sessions', {
            headers: { 'Authorization': `Basic ${apiToken}` }
        });
        
        if (res.ok) {
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            startPolling();
        } else {
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        loginError.innerText = 'Network error';
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    apiToken = '';
    stopPolling();
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    passwordInput.value = '';
    loginError.classList.add('hidden');
});

// Filtering
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderChats(window.lastSessions || {});
    });
});

// Polling
function startPolling() {
    fetchSessions();
    pollInterval = setInterval(fetchSessions, 2000);
}

function stopPolling() {
    clearInterval(pollInterval);
}

async function fetchSessions() {
    try {
        const res = await fetch('/api/dashboard/sessions', {
            headers: { 'Authorization': `Basic ${apiToken}` }
        });
        if (res.status === 401) {
            logoutBtn.click();
            return;
        }
        const sessions = await res.json();
        window.lastSessions = sessions;
        updateWaitingBadge(sessions);
        renderChats(sessions);
        if (currentUserId && sessions[currentUserId]) {
            renderActiveChat(currentUserId, sessions[currentUserId]);
        }
    } catch (e) {
        console.error('Failed to fetch sessions', e);
    }
}

function updateWaitingBadge(sessions) {
    const waitingCount = Object.values(sessions).filter(s => s.chatMode === 'WAITING').length;
    waitingBadge.innerText = waitingCount;
    if (waitingCount > 0) waitingBadge.classList.remove('hidden');
    else waitingBadge.classList.add('hidden');
}

function renderChats(sessions) {
    chatList.innerHTML = '';
    const userIds = Object.keys(sessions).sort((a, b) => sessions[b].lastActive - sessions[a].lastActive);
    
    userIds.forEach(uid => {
        const session = sessions[uid];
        if (currentFilter === 'WAITING' && session.chatMode !== 'WAITING') return;
        
        const lastMsg = session.history.length > 0 ? session.history[session.history.length - 1].text : 'No messages yet';
        
        let modeClass = 'mode-ai';
        if (session.chatMode === 'WAITING') modeClass = 'mode-waiting';
        if (session.chatMode === 'HUMAN') modeClass = 'mode-human';

        const div = document.createElement('div');
        div.className = `chat-item ${currentUserId === uid ? 'active' : ''}`;
        div.innerHTML = `
            <div class="chat-item-header">
                <span class="chat-id">${uid.split('@')[0]}</span>
                <span class="mode-indicator ${modeClass}">${session.chatMode}</span>
            </div>
            <div class="chat-preview">${lastMsg}</div>
        `;
        div.addEventListener('click', () => {
            currentUserId = uid;
            renderChats(window.lastSessions);
            renderActiveChat(uid, session);
        });
        chatList.appendChild(div);
    });
}

function renderActiveChat(uid, session) {
    emptyState.classList.add('hidden');
    activeChat.classList.remove('hidden');
    
    chatTitle.innerText = uid.split('@')[0];
    
    modeBadge.innerText = session.chatMode + ' MODE';
    modeBadge.className = 'mode-badge mode-' + session.chatMode.toLowerCase();

    if (session.chatMode === 'HUMAN') {
        btnTakeover.classList.add('hidden');
        btnReturnAi.classList.remove('hidden');
        composerOverlay.classList.add('hidden');
        messageInput.disabled = false;
        sendBtn.disabled = false;
    } else {
        btnTakeover.classList.remove('hidden');
        btnReturnAi.classList.add('hidden');
        composerOverlay.classList.remove('hidden');
        messageInput.disabled = true;
        sendBtn.disabled = true;
    }

    messagesContainer.innerHTML = '';
    session.history.forEach(msg => {
        const div = document.createElement('div');
        let senderName = '';
        if (msg.from === 'user') {
            div.className = 'message msg-user';
            senderName = 'Customer';
        } else if (msg.from === 'bot') {
            div.className = 'message msg-bot';
            senderName = 'ImmiWing AI';
        } else {
            div.className = 'message msg-owner';
            senderName = 'You';
        }

        const date = new Date(msg.time);
        const timeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');

        div.innerHTML = `
            <div class="msg-sender">${senderName}</div>
            <div class="msg-text">${msg.text.replace(/\\n/g, '<br>')}</div>
            <div class="msg-time">${timeStr}</div>
        `;
        messagesContainer.appendChild(div);
    });

    // Auto scroll to bottom only if user hasn't scrolled up
    const isScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 50;
    if (isScrolledToBottom || !window.lastScrollTop) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    window.lastScrollTop = messagesContainer.scrollTop;
}

// Mode Switching
async function changeMode(mode) {
    if (!currentUserId) return;
    try {
        await fetch('/api/dashboard/mode', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUserId, mode })
        });
        fetchSessions(); // update immediately
    } catch (e) {
        alert('Failed to change mode');
    }
}

btnTakeover.addEventListener('click', () => changeMode('HUMAN'));
btnReturnAi.addEventListener('click', () => changeMode('AI'));

// Sending messages
sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId || !messageInput.value.trim()) return;
    
    const text = messageInput.value.trim();
    messageInput.value = '';
    
    try {
        await fetch('/api/dashboard/send', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUserId, text })
        });
        fetchSessions(); // update immediately
    } catch (e) {
        alert('Failed to send message');
    }
});
