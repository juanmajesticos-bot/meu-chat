// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860",
    databaseURL: "https://chat-79da1-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let guntoTimeout = null;

// DOM
const telaLogin = document.getElementById('loginScreen');
const telaChat = document.getElementById('chatMain');
const loginBtn = document.getElementById('loginBtn');
const loginInput = document.getElementById('loginUsername');
const userNameSpan = document.getElementById('sidebarName');
const userLevelSpan = document.getElementById('sidebarLevel');
const userAvatar = document.getElementById('sidebarAvatar');
const onlineCountSpan = document.getElementById('onlineCount');
const messagesDiv = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// ============================================
// FUNÇÕES
// ============================================
function getHora() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function enviarMsgSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💜 SISTEMA',
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hora: getHora(),
        isSystem: true
    });
}

// ============================================
// GUNTO
// ============================================
function mostrarGunto(mensagem, autor) {
    const alerta = document.getElementById('guntoAlert');
    if (!alerta) return;
    if (guntoTimeout) clearTimeout(guntoTimeout);
    alerta.innerHTML = `🔫 ${autor} DISPAROU!<br>💜 ${mensagem} 💜`;
    alerta.style.display = 'flex';
    guntoTimeout = setTimeout(() => alerta.style.display = 'none', 4000);
}

async function enviarGunto(mensagem, autor) {
    const texto = mensagem.substring(6).trim();
    if (!texto) {
        await enviarMsgSistema("Use: /gunto [mensagem]");
        return true;
    }
    mostrarGunto(texto, autor);
    await db.collection('alertas').add({ tipo: 'gunto', mensagem: texto, autor: autor, timestamp: new Date() });
    await enviarMsgSistema(`🔫 ${autor} usou GUNTO: "${texto}"`);
    return true;
}

db.collection('alertas').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const alerta = change.doc.data();
            if (alerta.autor !== usuarioAtual) mostrarGunto(alerta.mensagem, alerta.autor);
            change.doc.ref.delete();
        }
    });
});

// ============================================
// COMANDO KICK
// ============================================
async function kickUser(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    
    if (!alvo) {
        await enviarMsgSistema("Use: /kick @usuario");
        return true;
    }
    if (autor === alvo) {
        await enviarMsgSistema(`${autor} não pode se kickar!`);
        return true;
    }
    
    await enviarMsgSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    
    if (alvo === usuarioAtual) {
        setTimeout(() => {
            localStorage.removeItem('chatUsername');
            location.reload();
        }, 2000);
    }
    return true;
}

// ============================================
// COMANDO CLS
// ============================================
async function limparChat(autor) {
    const msgs = await db.collection('mensagens').get();
    const batch = db.batch();
    msgs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await enviarMsgSistema(`🗑️ Chat limpo por ${autor}`);
}

// ============================================
// MENSAGENS
// ============================================
async function enviarMensagem(texto) {
    if (!texto.trim() || !usuarioAtual) return;
    
    const cmd = texto.toLowerCase().trim();
    
    if (cmd === '/cls') { await limparChat(usuarioAtual); return; }
    if (cmd.startsWith('/kick')) { await kickUser(texto, usuarioAtual); return; }
    if (cmd.startsWith('/gunto')) { await enviarGunto(texto, usuarioAtual); return; }
    
    await db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hora: getHora()
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snap) => {
        if (!messagesDiv) return;
        if (snap.empty) {
            messagesDiv.innerHTML = '<div class="welcome-box">💜 CHAT ROXO 💜<br>Comandos: /gunto, /kick, /cls</div>';
            return;
        }
        let html = '';
        snap.forEach(doc => {
            const msg = doc.data();
            if (msg.isSystem) {
                html += `<div class="system-message">${msg.texto}</div>`;
            } else {
                const isOwn = usuarioAtual === msg.usuario;
                const cls = isOwn ? 'message-own' : 'message-other';
                html += `
                    <div class="message ${cls}">
                        <div class="message-info">
                            ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                            <span class="message-time">${msg.hora}</span>
                        </div>
                        <div class="message-bubble">${msg.texto}</div>
                    </div>
                `;
            }
        });
        messagesDiv.innerHTML = html;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

async function entrarChat() {
    const nome = loginInput.value.trim();
    if (!nome) return alert('Digite seu nome');
    if (nome.length > 20) return alert('Nome muito longo');
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    
    if (userNameSpan) userNameSpan.textContent = nome;
    if (userLevelSpan) userLevelSpan.textContent = `Nv.1`;
    if (userAvatar) userAvatar.textContent = "👤";
    
    await enviarMsgSistema(`${nome} entrou no chat 💜`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

// ============================================
// EVENTOS
// ============================================
if (loginBtn) loginBtn.onclick = entrarChat;
if (sendBtn) {
    sendBtn.onclick = () => { enviarMensagem(messageInput.value); if (messageInput) messageInput.value = ''; };
}
if (messageInput) {
    messageInput.onkeypress = (e) => { if (e.key === 'Enter') { enviarMensagem(messageInput.value); messageInput.value = ''; } };
}
if (loginInput) {
    loginInput.onkeypress = (e) => { if (e.key === 'Enter') entrarChat(); };
}

let typingTime;
if (messageInput) {
    messageInput.oninput = () => {
        if (messageInput.value.length > 0 && usuarioAtual && typingIndicator) {
            typingIndicator.textContent = `${usuarioAtual} digitando...`;
            clearTimeout(typingTime);
            typingTime = setTimeout(() => { if (typingIndicator) typingIndicator.textContent = ''; }, 1000);
        }
    };
}

// ============================================
// ONLINE COUNT
// ============================================
async function atualizarOnlineCount() {
    try {
        const snap = await db.collection('usuarios').get();
        if (onlineCountSpan) onlineCountSpan.textContent = snap.size;
    } catch (e) {
        console.log("Erro ao contar usuários:", e);
    }
}

// ============================================
// INICIAR
// ============================================
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) { loginInput.value = salvo; entrarChat(); }
carregarMensagens();
setInterval(atualizarOnlineCount, 5000);

console.log("✅ CHAT ROXO INICIADO!");