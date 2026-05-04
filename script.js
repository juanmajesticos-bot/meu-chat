// ============================================
// CONFIGURAÇÃO DO FIREBASE
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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// SISTEMA DE XP E NÍVEIS
// ============================================
const XP_POR_MSG = 5;
const XP_POR_NIVEL = 100;

function getTituloPorNivel(nivel) {
    if (nivel >= 20) return "👑 LENDA 👑";
    if (nivel >= 15) return "⚡ MESTRE ⚡";
    if (nivel >= 10) return "💎 ÉLITE 💎";
    if (nivel >= 5) return "🏆 VETERANO 🏆";
    if (nivel >= 3) return "📈 APRENDIZ 📈";
    return "⭐ INICIANTE ⭐";
}

function calcularNivel(xp) { return Math.floor(xp / XP_POR_NIVEL) + 1; }
function getXpAtual(xp) { return xp % XP_POR_NIVEL; }

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

function getHoraAtual() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// COMANDO GUNTO - MOSTRA EM TODAS AS TELAS
// ============================================
async function executarGunto(mensagem, autor) {
    const textoGunto = mensagem.substring(6).trim();
    if (!textoGunto) {
        enviarMensagemSistema("Uso correto: /gunto [mensagem]");
        return true;
    }
    
    // Salva no Firestore para aparecer em todas as telas
    await db.collection('alertas').add({
        tipo: 'gunto',
        mensagem: textoGunto,
        autor: autor,
        timestamp: new Date()
    });
    
    enviarMensagemSistema(`🔫 ${autor} disparou GUNTO: "${textoGunto}"`);
    return true;
}

// Escutar alertas do Firestore (para aparecer em todas as telas)
db.collection('alertas').onSnapshot((snapshot) => {
    snapshot.forEach((doc) => {
        const alerta = doc.data();
        if (alerta.tipo === 'gunto') {
            mostrarGuntoAlert(alerta.mensagem, alerta.autor);
            // Remove após mostrar
            doc.ref.delete();
        }
    });
});

function mostrarGuntoAlert(mensagem, autor) {
    const alertDiv = document.getElementById('guntoAlert');
    alertDiv.innerHTML = `🔫 ${autor} DISPAROU!<br>💙 ${mensagem} 💙`;
    alertDiv.style.display = 'flex';
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// COMANDO CLS - LIMPAR TODAS MENSAGENS
// ============================================
async function executarCls(autor) {
    try {
        const snapshot = await db.collection('mensagens').get();
        const batch = db.batch();
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        await enviarMensagemSistema(`🗑️ Todas as mensagens foram limpas por ${autor}!`);
        
        // Notificação visual
        const notif = document.createElement('div');
        notif.className = 'clear-notification';
        notif.innerHTML = '🗑️ CHAT LIMPO POR ${autor}! 🗑️';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
        
    } catch (error) {
        console.error("Erro ao limpar:", error);
    }
}

// ============================================
// COMANDO KICK - EXPULSAR USUÁRIO
// ============================================
async function executarKick(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    
    if (!alvo) {
        enviarMensagemSistema("Uso correto: /kick @usuario");
        return true;
    }
    
    if (autor === alvo) {
        enviarMensagemSistema(`${autor} tentou se kickar mas falhou! 🤡`);
        return true;
    }
    
    // Verifica nível do autor
    const autorRef = await db.collection('usuarios').doc(autor).get();
    const autorNivel = autorRef.exists ? (autorRef.data().nivel || 1) : 1;
    
    if (autorNivel < 5) {
        enviarMensagemSistema(`${autor} tentou kickar mas precisa ser nível 5+!`);
        return true;
    }
    
    await enviarMensagemSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    
    // Notificação para o kickado (se estiver online)
    if (alvo === usuarioAtual) {
        const kickNotif = document.createElement('div');
        kickNotif.className = 'kick-notification';
        kickNotif.innerHTML = `👢 VOCÊ FOI EXPULSO POR ${autor}! 👢`;
        document.body.appendChild(kickNotif);
        setTimeout(() => {
            kickNotif.remove();
            localStorage.removeItem('chatUsername');
            location.reload();
        }, 2000);
    }
    
    return true;
}

// ============================================
// JOGO DA FORCA
// ============================================
let jogoAtivo = false;
let palavraAtual = "";
let letrasAdivinhadas = [];
let tentativasRestantes = 6;

const palavrasForca = [
    "HACKER", "MATRIX", "SISTEMA", "FIREBASE", "TERMINAL",
    "CODIGO", "SENHA", "CRIPTOGRAFIA", "ALGORITIMO", "PROTOCOLO",
    "SERVIDOR", "CLIENTE", "BANCO", "DADOS", "CLOUD"
];

async function executarForca() {
    if (jogoAtivo) {
        await enviarMensagemSistema("Já tem um jogo da forca ativo! Finalize ele primeiro.");
        return true;
    }
    
    jogoAtivo = true;
    palavraAtual = palavrasForca[Math.floor(Math.random() * palavrasForca.length)];
    letrasAdivinhadas = [];
    tentativasRestantes = 6;
    
    mostrarModalForca();
    return true;
}

function mostrarModalForca() {
    const modal = document.createElement('div');
    modal.className = 'hangman-modal';
    modal.id = 'hangmanModal';
    
    function atualizarModal() {
        const palavraExibida = palavraAtual.split('').map(letra => 
            letrasAdivinhadas.includes(letra) ? letra : '_'
        ).join(' ');
        
        modal.innerHTML = `
            <div class="hangman-content">
                <h2>🪢 JOGO DA FORCA</h2>
                <div class="hangman-word">${palavraExibida}</div>
                <div class="hangman-attempts">💀 Tentativas: ${tentativasRestantes} / 6</div>
                <input type="text" maxlength="1" placeholder="?" class="hangman-input" id="hangmanLetter" autocomplete="off">
                <div>
                    <button id="hangmanGuessBtn">ADIVINHAR</button>
                    <button id="hangmanCloseBtn">FECHAR</button>
                </div>
                <div style="margin-top: 15px; font-size: 12px; color: #666;">Letras usadas: ${letrasAdivinhadas.join(', ') || 'nenhuma'}</div>
            </div>
        `;
        
        const input = modal.querySelector('#hangmanLetter');
        const guessBtn = modal.querySelector('#hangmanGuessBtn');
        const closeBtn = modal.querySelector('#hangmanCloseBtn');
        
        guessBtn.onclick = async () => {
            const letra = input.value.toUpperCase();
            if (!letra || letra.length !== 1) return;
            
            if (letrasAdivinhadas.includes(letra)) {
                await enviarMensagemSistema(`Letra "${letra}" já foi usada!`);
                input.value = '';
                return;
            }
            
            letrasAdivinhadas.push(letra);
            
            if (palavraAtual.includes(letra)) {
                await enviarMensagemSistema(`✅ Letra "${letra}" está na palavra!`);
                
                const palavraCompleta = palavraAtual.split('').every(l => letrasAdivinhadas.includes(l));
                if (palavraCompleta) {
                    await enviarMensagemSistema(`🎉 ${usuarioAtual} acertou a palavra "${palavraAtual}" e ganhou +50 XP! 🎉`);
                    await adicionarXP(usuarioAtual, 50);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            } else {
                tentativasRestantes--;
                await enviarMensagemSistema(`❌ Letra "${letra}" não está na palavra!`);
                
                if (tentativasRestantes <= 0) {
                    await enviarMensagemSistema(`💀 FIM DE JOGO! A palavra era "${palavraAtual}"! 💀`);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            }
            input.value = '';
            input.focus();
        };
        
        closeBtn.onclick = () => {
            jogoAtivo = false;
            modal.remove();
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') guessBtn.click();
        });
    }
    
    atualizarModal();
    document.body.appendChild(modal);
    setTimeout(() => {
        const input = document.getElementById('hangmanLetter');
        if (input) input.focus();
    }, 100);
}

// ============================================
// PROCESSAR COMANDOS
// ============================================
async function processarComando(mensagem, usuario) {
    const cmd = mensagem.toLowerCase().trim();
    
    if (cmd === '/cls') {
        await executarCls(usuario);
        return true;
    }
    
    if (cmd.startsWith('/kick')) {
        await executarKick(mensagem, usuario);
        return true;
    }
    
    if (cmd.startsWith('/gunto')) {
        await executarGunto(mensagem, usuario);
        return true;
    }
    
    if (cmd === '/forca') {
        await executarForca();
        return true;
    }
    
    return false;
}

// ============================================
// SISTEMA DE XP E MENSAGENS
// ============================================
async function adicionarXP(username, quantidade) {
    try {
        const userRef = db.collection('usuarios').doc(username);
        const userDoc = await userRef.get();
        let nivelAntigo = 1, xpAtual = quantidade;
        if (userDoc.exists) {
            nivelAntigo = userDoc.data().nivel || 1;
            xpAtual = (userDoc.data().xp || 0) + quantidade;
        }
        const novoNivel = calcularNivel(xpAtual);
        await userRef.set({ nome: username, xp: xpAtual, nivel: novoNivel }, { merge: true });
        if (username === usuarioAtual) await carregarDadosUsuario();
    } catch (error) { console.error("Erro XP:", error); }
}

async function carregarDadosUsuario() {
    if (!usuarioAtual) return;
    const userRef = db.collection('usuarios').doc(usuarioAtual);
    const userDoc = await userRef.get();
    dadosUsuario = userDoc.exists ? userDoc.data() : { nome: usuarioAtual, xp: 0, nivel: 1 };
    if (!userDoc.exists) await userRef.set(dadosUsuario);
    atualizarInterface();
}

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
    else if (nivel >= 10) userAvatar.textContent = "💎";
    else if (nivel >= 5) userAvatar.textContent = "🏆";
    else userAvatar.textContent = "👤";
}

async function enviarMensagemFirebase(conteudo) {
    if (!conteudo.trim() || !usuarioAtual) return;
    
    const isComando = await processarComando(conteudo, usuarioAtual);
    if (isComando) return;
    
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
}

async function enviarMensagemSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💙 SISTEMA',
        texto: texto,
        timestamp: new Date(),
        hora: getHoraAtual(),
        isSystem: true
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
        if (snapshot.empty) {
            messagesDiv.innerHTML = `<div class="welcome-box">💙 BLUE CHAT INICIADO 💙<br>💬 /gunto [msg] | 👢 /kick @user | 🗑️ /cls | 🪢 /forca</div>`;
            return;
        }
        let html = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            if (msg.isSystem) html += `<div class="system-message">${msg.texto}</div>`;
            else {
                const isOwn = usuarioAtual === msg.usuario;
                const messageClass = isOwn ? 'message-own' : 'message-other';
                html += `
                    <div class="message ${messageClass}">
                        <div class="message-info">
                            ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                            ${msg.nivel ? `<span class="message-level">Nv.${msg.nivel}</span>` : ''}
                            ${msg.titulo ? `<span class="message-title">${msg.titulo}</span>` : ''}
                            <span class="message-time">${msg.hora || 'agora'}</span>
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

async function atualizarOnlineCount() {
    const snapshot = await db.collection('usuarios').get();
    onlineCountSpan.textContent = snapshot.size;
}

async function entrarNoChat() {
    const nome = loginInput.value.trim();
    if (!nome) return alert('Digite seu nome!');
    if (nome.length > 20) return alert('Nome muito longo!');
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    await carregarDadosUsuario();
    await enviarMensagemSistema(`${nome} entrou no chat! 💙`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

function enviarMensagem() {
    const texto = messageInput.value.trim();
    if (!texto) return;
    enviarMensagemFirebase(texto);
    messageInput.value = '';
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
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagem(); });
loginInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') entrarNoChat(); });

const usuarioSalvo = localStorage.getItem('chatUsername');
if (usuarioSalvo) { loginInput.value = usuarioSalvo; entrarNoChat(); }

carregarMensagens();
setInterval(atualizarOnlineCount, 3000);