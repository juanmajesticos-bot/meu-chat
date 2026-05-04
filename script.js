// Dados do chat
let currentUser = localStorage.getItem('chatUsername') || null;
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

// Carregar mensagens salvas
function loadMessages() {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
        messages = JSON.parse(saved);
        renderMessages();
    }
}

// Salvar mensagens
function saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

// Formatar hora
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Adicionar mensagem
function addMessage(content, username, isSystem = false) {
    const message = {
        id: Date.now(),
        username: username,
        content: content,
        time: getCurrentTime(),
        isSystem: isSystem
    };
    
    messages.push(message);
    saveMessages();
    renderMessages();
    
    // Scroll para a última mensagem
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 100);
}

// Renderizar mensagens
function renderMessages() {
    if (!messagesArea) return;
    
    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="welcome-message">
                ✨ Bem-vindo ao chat! ✨<br>
                Digite seu nome e comece a conversar!
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
        
        return `
            <div class="message ${messageClass}">
                <div class="message-info">
                    ${!isOwn ? `<span class="message-name">${escapeHtml(msg.username)}</span>` : ''}
                    <span class="message-time">${msg.time}</span>
                </div>
                <div class="message-bubble">
                    ${escapeHtml(msg.content)}
                </div>
            </div>
        `;
    }).join('');
}

// Escapar HTML para evitar XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Atualizar contador de participantes
function updateParticipantCount() {
    const onlineUsers = new Set(messages.filter(m => !m.isSystem).map(m => m.username));
    const count = onlineUsers.has(currentUser) ? onlineUsers.size : onlineUsers.size + 1;
    participantCount.textContent = count;
}

// Entrar no chat
function joinChat() {
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
    
    // Adicionar mensagem de sistema
    addMessage(`${currentUser} entrou no chat`, 'Sistema', true);
    
    // Mostrar área de mensagem
    nameContainer.style.display = 'none';
    messageContainer.style.display = 'block';
    messageInput.focus();
    
    updateParticipantCount();
}

// Enviar mensagem
function sendMessage() {
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    addMessage(content, currentUser);
    messageInput.value = '';
    messageInput.focus();
    
    // Simular "digitando"
    showTyping(false);
}

// Simular indicador de digitação
let typingTimeout;
function showTyping(isTyping) {
    if (isTyping) {
        typingIndicator.textContent = `${currentUser} está digitando...`;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => showTyping(false), 1500);
    } else {
        typingIndicator.textContent = '';
    }
}

// Eventos de teclado
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    } else {
        showTyping(true);
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinChat();
    }
});

// Eventos de clique
setNameBtn.addEventListener('click', joinChat);
sendBtn.addEventListener('click', sendMessage);

// Verificar se usuário já está logado
if (currentUser) {
    usernameInput.value = currentUser;
    joinChat();
}

// Carregar mensagens antigas
loadMessages();
updateParticipantCount();

// Atualizar contador periodicamente
setInterval(updateParticipantCount, 2000);