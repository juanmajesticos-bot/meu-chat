// ============================================
// CONFIGURAÇÃO DO FIREBASE (SUA CONTA)
// ============================================
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

console.log("Firebase inicializado com sucesso!"); // Para testar

// ============================================
// SISTEMA DE XP E NÍVEIS
// ============================================
const XP_POR_MSG = 5;
const XP_POR_NIVEL = 100;

function getTituloPorNivel(nivel) {
    if (nivel >= 20) return "👑 LENDA VIVA 👑";
    if (nivel >= 15) return "⚔️ GUERREIRO ÉPICO ⚔️";
    if (nivel >= 10) return "🌟 MESTRE 🌟";
    if (nivel >= 5) return "⚜️ CAVALEIRO ⚜️";
    if (nivel >= 3) return "🔰 APRENDIZ 🔰";
    return "⭐ INICIANTE ⭐";
}

function calcularNivel(xp) {
    return Math.floor(xp / XP_POR_NIVEL) + 1;
}

function getXpAtual(xp) {
    return xp % XP_POR_NIVEL;
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let dadosUsuario = null;

// Elementos DOM
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

// ============================================
// ATUALIZAR INTERFACE
// ============================================
function atualizarInterface() {
    if (!dadosUsuario) return;
    
    const nivel = dadosUsuario.nivel || 1;
    const xp = dadosUsuario.xp || 0;
    const xpAtual = getXpAtual(xp);
    const percentual = (xpAtual / XP_POR_NIVEL) * 100;
    
    userNameSpan.textContent = usuarioAtual;
    userLevelSpan.textContent = `Nv. ${nivel}`;
    userTitleSpan.textContent = getTituloPorNivel(nivel);
    xpBarFill.style.width = `${percentual}%`;
    xpTextSpan.textContent = `${xpAtual}/${XP_POR_NIVEL} XP`;
    
    if (nivel >= 20) userAvatar.textContent = "👑";
    else if (nivel >= 10) userAvatar.textContent = "🌟";
    else if (nivel >= 5) userAvatar.textContent = "⚔️";
    else userAvatar.textContent = "👤";
}

// ============================================
// NOTIFICAÇÃO DE LEVEL UP
// ============================================
function mostrarLevelUp(novoNivel, nivelAntigo) {
    if (novoNivel > nivelAntigo) {
        const titulo = getTituloPorNivel(novoNivel);
        const toast = document.createElement('div');
        toast.className = 'level-up-toast';
        toast.innerHTML = `🎉 LEVEL UP! 🎉<br>Nível ${novoNivel} - ${titulo}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        enviarMensagemSistema(`🏆 ${usuarioAtual} subiu para o Nível ${novoNivel} e agora é ${titulo}! 🏆`);
    }
}

// ============================================
// ADICIONAR XP
// ============================================
async function adicionarXP(username, quantidade) {
    try {
        const userRef = db.collection('usuarios').doc(username);
        const userDoc = await userRef.get();
        
        let nivelAntigo = 1;
        let xpAtual = quantidade;
        
        if (userDoc.exists) {
            nivelAntigo = userDoc.data().nivel || 1;
            xpAtual = (userDoc.data().xp || 0) + quantidade;
        }
        
        const novoNivel = calcularNivel(xpAtual);
        
        await userRef.set({
            nome: username,
            xp: xpAtual,
            nivel: novoNivel,
            ultimoLogin: new Date()
        });
        
        mostrarLevelUp(novoNivel, nivelAntigo);
        
        if (username === usuarioAtual) {
            await carregarDadosUsuario();
        }
    } catch (error) {
        console.error("Erro ao adicionar XP:", error);
    }
}

// ============================================
// CARREGAR DADOS DO USUÁRIO
// ============================================
async function carregarDadosUsuario() {
    if (!usuarioAtual) return;
    
    try {
        const userRef = db.collection('usuarios').doc(usuarioAtual);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            dadosUsuario = userDoc.data();
        } else {
            dadosUsuario = { nome: usuarioAtual, xp: 0, nivel: 1 };
            await userRef.set(dadosUsuario);
        }
        
        atualizarInterface();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

// ============================================
// ENVIAR MENSAGEM
// ============================================
async function enviarMensagemFirebase(conteudo) {
    if (!conteudo.trim() || !usuarioAtual) return;
    
    try {
        await adicionarXP(usuarioAtual, XP_POR_MSG);
        
        const userRef = db.collection('usuarios').doc(usuarioAtual);
        const userDoc = await userRef.get();
        const nivel = userDoc.exists ? (userDoc.data().nivel || 1) : 1;
        const titulo = getTituloPorNivel(nivel);
        
        await db.collection('mensagens').add({
            usuario: usuarioAtual,
            texto: conteudo,
            nivel: nivel,
            titulo: titulo,
            timestamp: new Date(),
            hora: getHoraAtual()
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
    }
}

async function enviarMensagemSistema(texto) {
    try {
        await db.collection('mensagens').add({
            usuario: '🎮 SISTEMA',
            texto: texto,
            timestamp: new Date(),
            hora: getHoraAtual(),
            isSystem: true
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem sistema:", error);
    }
}

// ============================================
// CARREGAR MENSAGENS
// ============================================
function carregarMensagens() {
    db.collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                messagesDiv.innerHTML = `
                    <div class="welcome-box">
                        🎮 BEM-VINDO AO CHAT XP! 🎮<br>
                        💬 Cada mensagem dá +5 XP! 💬<br>
                        🏆 Nível 20 = Título LENDA! 🏆
                    </div>
                `;
                return;
            }
            
            let html = '';
            snapshot.forEach((doc) => {
                const msg = doc.data();
                if (msg.isSystem) {
                    html += `<div class="system-message">${msg.texto}</div>`;
                } else {
                    const isOwn = usuarioAtual === msg.usuario;
                    const messageClass = isOwn ? 'message-own' : 'message-other';
                    html += `
                        <div class="message ${messageClass}">
                            <div class="message-info">
                                ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                                ${msg.nivel ? `<span class="message-level">🏆 Nv.${msg.nivel}</span>` : ''}
                                ${msg.titulo ? `<span class="message-title">${msg.titulo}</span>` : ''}
                                <span class="message-time">${msg.hora || 'agora'}</span>
                            </div>
                            <div class="message-bubble">
                                ${msg.texto}
                            </div>
                        </div>
                    `;
                }
            });
            messagesDiv.innerHTML = html;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, (error) => {
            console.error("Erro ao carregar mensagens:", error);
        });
}

// ============================================
// ATUALIZAR ONLINE
// ============================================
async function atualizarOnlineCount() {
    try {
        const snapshot = await db.collection('usuarios').get();
        onlineCountSpan.textContent = snapshot.size;
    } catch (error) {
        console.error("Erro ao contar online:", error);
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function getHoraAtual() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// ENTRAR NO CHAT
// ============================================
async function entrarNoChat() {
    const nome = loginInput.value.trim();
    
    if (!nome) {
        alert('Digite seu nome!');
        return;
    }
    
    if (nome.length > 20) {
        alert('Nome muito longo! Máximo 20 caracteres.');
        return;
    }
    
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    
    await carregarDadosUsuario();
    await enviarMensagemSistema(`${nome} entrou no chat! 🎮`);
    
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

function enviarMensagem() {
    const texto = messageInput.value.trim();
    if (!texto) return;
    enviarMensagemFirebase(texto);
    messageInput.value = '';
    messageInput.focus();
}

// ============================================
// EVENTOS
// ============================================
let timeoutTyping;
messageInput.addEventListener('input', () => {
    if (messageInput.value.length > 0 && usuarioAtual) {
        typingIndicator.textContent = `${usuarioAtual} está digitando...`;
        clearTimeout(timeoutTyping);
        timeoutTyping = setTimeout(() => {
            typingIndicator.textContent = '';
        }, 1000);
    }
});

loginBtn.addEventListener('click', entrarNoChat);
sendBtn.addEventListener('click', enviarMensagem);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensagem();
});
loginInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') entrarNoChat();
});

// Verificar usuário salvo
const usuarioSalvo = localStorage.getItem('chatUsername');
if (usuarioSalvo) {
    loginInput.value = usuarioSalvo;
    entrarNoChat();
}

// Iniciar
carregarMensagens();
setInterval(atualizarOnlineCount, 5000);