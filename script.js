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
    if (nivel >= 20) return "👑 HACKER SUPREMO 👑";
    if (nivel >= 15) return "⚡ MESTRE HACKER ⚡";
    if (nivel >= 10) return "💀 HACKER ÉLITE 💀";
    if (nivel >= 5) return "🔰 HACKER NINJA 🔰";
    if (nivel >= 3) return "👤 INVASOR 👤";
    return "🐣 SCRIPT KIDDIE 🐣";
}

function calcularNivel(xp) { return Math.floor(xp / XP_POR_NIVEL) + 1; }
function getXpAtual(xp) { return xp % XP_POR_NIVEL; }

let usuarioAtual = null;
let dadosUsuario = null;
let usuariosOnline = [];

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
// FUNÇÕES AUXILIARES
// ============================================
function getHoraAtual() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// COMANDO GUNTO - MENSAGEM NA TELA
// ============================================
function mostrarGuntoAlert(mensagem, autor) {
    const alertDiv = document.getElementById('guntoAlert');
    alertDiv.innerHTML = `🔫 ${autor} DISPAROU!<br>💀 ${mensagem} 💀`;
    alertDiv.style.display = 'flex';
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// COMANDO KICK - EXPULSAR USUÁRIO
// ============================================
async function kickUsuario(alvo, autor) {
    if (autor === alvo) {
        enviarMensagemSistema(`${autor} tentou se kickar mas falhou! 🤡`);
        return;
    }
    
    // Verifica se o autor tem nível >= 5 para kickar
    const autorRef = await db.collection('usuarios').doc(autor).get();
    const autorNivel = autorRef.exists ? (autorRef.data().nivel || 1) : 1;
    
    if (autorNivel < 5 && autor !== "SISTEMA") {
        enviarMensagemSistema(`${autor} tentou kickar mas precisa ser nível 5+!`);
        return;
    }
    
    enviarMensagemSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    
    // Mostrar notificação para o kickado
    const kickNotif = document.createElement('div');
    kickNotif.className = 'kick-notification';
    kickNotif.innerHTML = `👢 VOCÊ FOI EXPULSO POR ${autor}! 👢`;
    document.body.appendChild(kickNotif);
    setTimeout(() => kickNotif.remove(), 3000);
    
    // Limpar dados do kickado localmente se for o usuário atual
    if (alvo === usuarioAtual) {
        localStorage.removeItem('chatUsername');
        setTimeout(() => location.reload(), 2000);
    }
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
    "CODIGO", "SENHA", "CRIPTOGRAFIA", "ALGORITIMO", "PROTOCOLO"
];

function iniciarForca() {
    if (jogoAtivo) {
        enviarMensagemSistema("Já tem um jogo da forca ativo!");
        return;
    }
    
    jogoAtivo = true;
    palavraAtual = palavrasForca[Math.floor(Math.random() * palavrasForca.length)];
    letrasAdivinhadas = [];
    tentativasRestantes = 6;
    
    mostrarModalForca();
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
                <input type="text" maxlength="1" placeholder="Digite uma letra" class="hangman-input" id="hangmanLetter">
                <button id="hangmanGuessBtn">ADIVINHAR</button>
                <button id="hangmanCloseBtn">FECHAR</button>
            </div>
        `;
        
        const input = modal.querySelector('#hangmanLetter');
        const guessBtn = modal.querySelector('#hangmanGuessBtn');
        const closeBtn = modal.querySelector('#hangmanCloseBtn');
        
        guessBtn.onclick = () => {
            const letra = input.value.toUpperCase();
            if (!letra || letra.length !== 1) return;
            
            if (letrasAdivinhadas.includes(letra)) {
                enviarMensagemSistema(`Letra "${letra}" já foi usada!`);
                input.value = '';
                return;
            }
            
            letrasAdivinhadas.push(letra);
            
            if (palavraAtual.includes(letra)) {
                enviarMensagemSistema(`✅ Letra "${letra}" está na palavra!`);
                
                const palavraCompleta = palavraAtual.split('').every(l => letrasAdivinhadas.includes(l));
                if (palavraCompleta) {
                    enviarMensagemSistema(`🎉 ${usuarioAtual} acertou a palavra "${palavraAtual}" e ganhou +50 XP! 🎉`);
                    adicionarXP(usuarioAtual, 50);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            } else {
                tentativasRestantes--;
                enviarMensagemSistema(`❌ Letra "${letra}" não está na palavra!`);
                
                if (tentativasRestantes <= 0) {
                    enviarMensagemSistema(`💀 FIM DE JOGO! A palavra era "${palavraAtual}"! 💀`);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            }
            input.value = '';
        };
        
        closeBtn.onclick = () => {
            jogoAtivo = false;
            modal.remove();
        };
    }
    
    atualizarModal();
    document.body.appendChild(modal);
}

// ============================================
// PROCESSAR COMANDOS
// ============================================
async function processarComando(mensagem, usuario) {
    const cmd = mensagem.trim().toLowerCase();
    
    if (cmd === '/forca') {
        iniciarForca();
        return true;
    }
    
    if (cmd.startsWith('/kick')) {
        const partes = cmd.split(' ');
        const alvo = partes[1]?.replace('@', '');
        if (alvo) {
            await kickUsuario(alvo, usuario);
        } else {
            enviarMensagemSistema("Uso correto: /kick @usuario");
        }
        return true;
    }
    
    if (cmd.startsWith('/gunto')) {
        const textoGunto = mensagem.substring(6).trim();
        if (textoGunto) {
            mostrarGuntoAlert(textoGunto, usuario);
            enviarMensagemSistema(`🔫 ${usuario} usou GUNTO: "${textoGunto}"`);
        } else {
            enviarMensagemSistema("Uso correto: /gunto [mensagem]");
        }
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
    else if (nivel >= 10) userAvatar.textContent = "💀";
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
        usuario: '💀 SISTEMA',
        texto: texto,
        timestamp: new Date(),
        hora: getHoraAtual(),
        isSystem: true
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
        if (snapshot.empty) {
            messagesDiv.innerHTML = `<div class="welcome-box">💀 CHAT HACKER INICIADO 💀<br>Comandos: /gunto, /kick @user, /forca</div>`;
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
    await enviarMensagemSistema(`${nome} invadiu o chat! 🔴`);
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
// MATRIZ HACKER (CÓDIGO PASSANDO NO FUNDO)
// ============================================
function iniciarMatrix() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?/~`";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = `bold ${fontSize}px 'Courier New'`;
        
        for (let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }
    
    setInterval(draw, 50);
}

window.addEventListener('resize', () => {
    const canvas = document.getElementById('matrixCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ============================================
// EVENTOS E INICIALIZAÇÃO
// ============================================
loginBtn.addEventListener('click', entrarNoChat);
sendBtn.addEventListener('click', enviarMensagem);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagem(); });
loginInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') entrarNoChat(); });

const usuarioSalvo = localStorage.getItem('chatUsername');
if (usuarioSalvo) { loginInput.value = usuarioSalvo; entrarNoChat(); }

carregarMensagens();
setInterval(atualizarOnlineCount, 3000);
iniciarMatrix();