// 🔥 SUAS CONFIGURAÇÕES DO FIREBASE 🔥
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860",
    measurementId: "G-C0N1M4Q99F"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// SISTEMA DE NÍVEIS E TÍTULOS
// ============================================
const XP_POR_MENSAGEM = 5;
const XP_NECESSARIO = 100;

// Títulos por nível
function getTitleByLevel(level) {
    if (level >= 20) return "👑 LENDA VIVA 👑";
    if (level >= 15) return "⚔️ GUERREIRO ÉPICO ⚔️";
    if (level >= 10) return "🌟 MESTRE 🌟";
    if (level >= 5) return "⚜️ CAVALEIRO ⚜️";
    if (level >= 3) return "🔰 APRENDIZ 🔰";
    if (level >= 1) return "⭐ INICIANTE ⭐";
    return "🌱 RECRUTA 🌱";
}

// Calcular nível baseado no XP
function calculateLevel(xp) {
    return Math.floor(xp / XP_NECESSARIO) + 1;
}

// Calcular XP do nível atual
function getCurrentLevelXP(xp) {
    return xp % XP_NECESSARIO;
}

// ============================================
// DADOS DO USUÁRIO
// ============================================
let currentUser = localStorage.getItem('chatUsername') || null;
let currentUserData = null;
let messages = [];

// Elementos do DOM
const messagesArea = document.getElementById('messagesArea');
const nameContainer = document.getElementById('nameContainer');
const messageContainer = document.getElementById('messageContainer');
const usernameInput = document.getElementById('usernameInput');
const setNameBtn = document.getElementById('setNameBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const participantCount = document.getElementById('participantCount');
const userNameDisplay = document.getElementById('userNameDisplay');
const userLevel = document.getElementById('userLevel');
const userTitle = document.getElementById('userTitle');
const userXpBar = document.getElementById('userXpBar');
const userXpText = document.getElementById('userXpText');
const userAvatar = document.getElementById('userAvatar');

// ============================================
// FUNÇÕES DO SISTEMA DE XP
// ============================================

// Atualizar UI do usuário com seus dados de XP
function updateUserUI() {
    if (!currentUserData) return;
    
    const level = currentUserData.level || 1;
    const xp = currentUserData.xp || 0;
    const currentLevelXP = getCurrentLevelXP(xp);
    const percentXP = (currentLevelXP / XP_NECESSARIO) * 100;
    
    userNameDisplay.textContent = currentUser;
    userLevel.textContent = `Nv. ${level}`;
    userTitle.textContent = getTitleByLevel(level);
    userXpBar.style.width = `${percentXP}%`;
    userXpText.textContent = `${currentLevelXP}/${XP_NECESSARIO} XP`;
    
    // Avatar muda conforme nível
    if (level >= 20) userAvatar.textContent = "👑";
    else if (level >= 10) userAvatar.textContent = "🌟";
    else if (level >= 5) userAvatar.textContent = "⚔️";
    else userAvatar.textContent = "👤";
}

// Mostrar notificação de level up
function showLevelUpNotification(newLevel, oldLevel) {
    if (newLevel > oldLevel) {
        const title = getTitleByLevel(newLevel);
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `🎉 LEVEL UP! 🎉<br>Nível ${newLevel} - ${title}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
        // Mensagem de sistema no chat
        addSystemMessage(`🏆 ${currentUser} subiu para o Nível ${newLevel} e agora é ${title}! 🏆`);
    }
}

// Adicionar XP ao usuário
async function addXP(username, amount) {
    const userRef = db.collection('users').doc(username);
    const userDoc = await userRef.get();
    
    let oldLevel = 1;
    let newXP = amount;
    
    if (userDoc.exists) {
        oldLevel = userDoc.data().level || 1;
        newXP = (userDoc.data().xp || 0) + amount;
    }
    
    const newLevel = calculateLevel(newXP);
    
    await userRef.set({
        username: username,
        xp: newXP,
        level: newLevel,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    showLevelUpNotification(newLevel, oldLevel);
    
    // Atualizar dados do usuário atual
    if (username === currentUser) {
        await loadUserData();
    }
}

// Carregar dados do usuário atual
async function loadUserData() {
    if (!currentUser) return;
    
    const userRef = db.collection('users').doc(currentUser);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        currentUserData = userDoc.data();
    } else {
        currentUserData = { username: currentUser, xp: 0, level: 1 };
        await userRef.set(currentUserData);
    }
    
    updateUserUI();
}

// ============================================
// FUNÇÕES DO CHAT
// ============================================

// Carregar mensagens do Firebase
function loadMessagesFromFirebase() {
    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messages = [];
            snapshot.forEach((doc) => {
                messages.push(doc.data());
            });
            renderMessages();
            updateParticipantCount();
            
            setTimeout(() => {
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }, 100);
        });
}

// Enviar mensagem (com XP!)
async function sendMessageToFirebase(content) {
    if (!content || !currentUser) return;
    
    // Adiciona XP por mensagem
    await addXP(currentUser, XP_POR_MENSAGEM);
    
    // Carrega dados atualizados do usuário
    const userRef = db.collection('users').doc(currentUser);
    const userDoc = await userRef.get();
    const userLevel = userDoc.exists ? (userDoc.data().level || 1) : 1;
    const userTitleText = getTitleByLevel(userLevel);
    
    db.collection('messages').add({
        username: currentUser,
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        time: getCurrentTime(),
        level: userLevel,
        title: userTitleText
    });
}

// Adicionar mensagem de sistema
function addSystemMessage(content) {
    db.collection('messages').add({
        username: '🎮 SISTEMA',
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        time: getCurrentTime(),
        isSystem: true
    });
}

// Formatar hora
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Renderizar mensagens
function renderMessages() {
    if (!messagesArea) return;
    
    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="welcome-message">
                🎮 BEM-VINDO AO CHAT XP! 🎮<br>
                💬 Cada mensagem dá +5 XP! 💬<br>
                🏆 Nível 20 = Título LENDA! 🏆
            </div>
        `;
        return;
    }
    
    messagesArea.innerHTML = messages.map(msg => {
        if (msg.isSystem) {
            return `<div class="system-message">${msg.content}</div>`;
        }
        
        const isOwn = currentUser === msg.username;
        const messageClass = isOwn ? 'message-own' : 'message-other';
        const userLevel = msg.level || 1;
        const userTitle = msg.title || getTitleByLevel(userLevel);
        
        return `
            <div class="message ${messageClass}">
                <div class="message-info">
                    ${!isOwn ? `<span class="message-name">${escapeHtml(msg.username)}</span>` : ''}
                    <span class="message-level">🏆 Nv.${userLevel}</span>
                    <span class="message-title">${userTitle}</span>
                    <span class="message-time">${msg.time || 'agora'}</span>
                </div>
                <div class="message-bubble">
                    ${escapeHtml(msg.content)}
                </div>
            </div>
        `;
    }).join('');
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Atualizar contador de participantes
async function updateParticipantCount() {
    const snapshot = await db.collection('users').get();
    participantCount.textContent = snapshot.size;
}

// Entrar no chat
async function joinChat() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Por favor, digite um nome!');
        return;
    }
    
    if (username.length > 20) {
        alert('Nome muito longo! Máximo 20 caracteres.');
        return;
    }
    
    currentUser = username;
    localStorage.setItem('chatUsername', currentUser);
    
    await loadUserData();
    addSystemMessage(`${username} entrou no chat! 🎮`);
    
    nameContainer.style.display = 'none';
    messageContainer.style.display = 'block';
    messageInput.focus();
}

// Enviar mensagem
function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;
    
    sendMessageToFirebase(content);
    messageInput.value = '';
    messageInput.focus();
}

// Indicador de digitação
let typingTimeout;
if (messageInput) {
    messageInput.addEventListener('input', () => {
        if (messageInput.value.length > 0 && currentUser) {
            typingIndicator.textContent = `${currentUser} está digitando...`;
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingIndicator.textContent = '';
            }, 1000);
        } else {
            typingIndicator.textContent = '';
        }
    });
}

// Eventos
if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (setNameBtn) setNameBtn.addEventListener('click', joinChat);

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinChat();
    });
}

// Verificar usuário já logado
if (currentUser) {
    usernameInput.value = currentUser;
    joinChat();
}

// Iniciar
loadMessagesFromFirebase();