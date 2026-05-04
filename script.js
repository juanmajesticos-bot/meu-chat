// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// VARIÁVEIS
let usuarioAtual = null;
let dadosUsuario = null;

// DOM
const telaLogin = document.getElementById('loginScreen');
const telaChat = document.getElementById('chatMain');
const loginBtn = document.getElementById('loginBtn');
const loginInput = document.getElementById('loginUsername');
const userNameSpan = document.getElementById('userName');
const userLevelSpan = document.getElementById('userLevel');
const userTitleSpan = document.getElementById('userTitle');
const xpBarFill = document.getElementById('xpBarFill');
const xpTextSpan = document.getElementById('xpText');
const userAvatar = document.getElementById('userAvatar');
const onlineCountSpan = document.getElementById('onlineCount');
const messagesDiv = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// SISTEMA DE NÍVEL
function getTitulo(nivel) {
    if (nivel >= 20) return "👑 LENDA";
    if (nivel >= 15) return "⚡ MESTRE";
    if (nivel >= 10) return "💎 ÉLITE";
    if (nivel >= 5) return "🏆 VETERANO";
    return "⭐ INICIANTE";
}

function getHora() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// GUNTO - CORRIGIDO
// ============================================
let guntoTimeout = null;

function mostrarGunto(mensagem, autor) {
    const alerta = document.getElementById('guntoAlert');
    if (!alerta) return;
    
    if (guntoTimeout) clearTimeout(guntoTimeout);
    
    alerta.innerHTML = `🔫 ${autor} DISPAROU!<br>💙 ${mensagem} 💙`;
    alerta.style.display = 'flex';
    
    guntoTimeout = setTimeout(() => {
        alerta.style.display = 'none';
    }, 4000);
}

async function enviarGunto(mensagem, autor) {
    const texto = mensagem.substring(6).trim();
    if (!texto) {
        await enviarMsgSistema("Use: /gunto [mensagem]");
        return true;
    }
    
    // Mostra pra quem enviou
    mostrarGunto(texto, autor);
    
    // Salva no Firebase pra outros verem
    await db.collection('alertas').add({
        tipo: 'gunto',
        mensagem: texto,
        autor: autor,
        timestamp: new Date()
    });
    
    await enviarMsgSistema(`🔫 ${autor} usou GUNTO: "${texto}"`);
    return true;
}

// Escutar alertas do Firebase
db.collection('alertas').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const alerta = change.doc.data();
            if (alerta.autor !== usuarioAtual) {
                mostrarGunto(alerta.mensagem, alerta.autor);
            }
            change.doc.ref.delete();
        }
    });
});

// ============================================
// OUTROS COMANDOS
// ============================================
async function enviarMsgSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💙 SISTEMA',
        texto: texto,
        timestamp: new Date(),
        hora: getHora(),
        isSystem: true
    });
}

async function limparChat(autor) {
    const msgs = await db.collection('mensagens').get();
    const batch = db.batch();
    msgs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await enviarMsgSistema(`🗑️ Chat limpo por ${autor}`);
}

async function kickUser(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    if (!alvo) {
        await enviarMsgSistema("Use: /kick @usuario");
        return true;
    }
    if (autor === alvo) {
        await enviarMsgSistema(`${autor} não pode se kickar`);
        return true;
    }
    await enviarMsgSistema(`💀 ${alvo} foi expulso por ${autor}`);
    if (alvo === usuarioAtual) {
        setTimeout(() => {
            localStorage.removeItem('chatUsername');
            location.reload();
        }, 2000);
    }
    return true;
}

// ============================================
// PROCESSAR COMANDOS
// ============================================
async function processarComando(msg, user) {
    const cmd = msg.toLowerCase().trim();
    
    if (cmd === '/cls') {
        await limparChat(user);
        return true;
    }
    if (cmd.startsWith('/kick')) {
        await kickUser(msg, user);
        return true;
    }
    if (cmd.startsWith('/gunto')) {
        return await enviarGunto(msg, user);
    }
    if (cmd === '/forca') {
        await enviarMsgSistema("🎮 Jogo da forca em breve!");
        return true;
    }
    if (cmd === '/gartic') {
        await enviarMsgSistema("🎨 Gartic em breve!");
        return true;
    }
    return false;
}

// ============================================
// MENSAGENS
// ============================================
async function enviarMensagem(texto) {
    if (!texto.trim() || !usuarioAtual) return;
    
    const isComando = await processarComando(texto, usuarioAtual);
    if (isComando) return;
    
    await db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: texto,
        timestamp: new Date(),
        hora: getHora()
    });
}

function carregarMensagens() {
    db.collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snap) => {
            if (snap.empty) {
                messagesDiv.innerHTML = '<div class="welcome-box">💙 Use /gunto [msg]</div>';
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

async function carregarUsuario(nome) {
    const ref = db.collection('usuarios').doc(nome);
    const doc = await ref.get();
    if (!doc.exists) {
        dadosUsuario = { nome: nome, xp: 0, nivel: 1 };
        await ref.set(dadosUsuario);
    } else {
        dadosUsuario = doc.data();
    }
    
    userNameSpan.textContent = nome;
    const nivel = dadosUsuario.nivel || 1;
    userLevelSpan.textContent = `Nv.${nivel}`;
    userTitleSpan.textContent = getTitulo(nivel);
}

async function entrarChat() {
    const nome = loginInput.value.trim();
    if (!nome) return alert('Digite seu nome');
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    await carregarUsuario(nome);
    await enviarMsgSistema(`${nome} entrou no chat`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

// EVENTOS
loginBtn.onclick = entrarChat;
sendBtn.onclick = () => {
    enviarMensagem(messageInput.value);
    messageInput.value = '';
};
messageInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        enviarMensagem(messageInput.value);
        messageInput.value = '';
    }
};
loginInput.onkeypress = (e) => { if (e.key === 'Enter') entrarChat(); };

let typingTime;
messageInput.oninput = () => {
    if (messageInput.value.length > 0 && usuarioAtual) {
        typingIndicator.textContent = `${usuarioAtual} digitando...`;
        clearTimeout(typingTime);
        typingTime = setTimeout(() => typingIndicator.textContent = '', 1000);
    }
};

// INICIAR
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) {
    loginInput.value = salvo;
    entrarChat();
}

carregarMensagens();
setInterval(async () => {
    const snap = await db.collection('usuarios').get();
    if (onlineCountSpan) onlineCountSpan.textContent = snap.size;
}, 5000);

console.log("✅ CHAT PRONTO! Comandos: /gunto [msg], /kick @user, /cls");